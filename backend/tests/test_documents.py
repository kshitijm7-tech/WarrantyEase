"""Tests for document repository - key conventions, parsing, and endpoints.

These tests verify the DynamoDB key conventions, document ID parsing logic,
and the document API endpoints using mocked AWS clients / repositories.
"""

from types import SimpleNamespace

import pytest
from unittest.mock import patch, MagicMock
from httpx import AsyncClient, ASGITransport
from botocore.exceptions import EndpointConnectionError

from app.main import app
from app.services.document_service import document_repo, DEMO_USER_ID


def make_endpoint_connection_error():
    """Create a proper EndpointConnectionError for mocking."""
    return EndpointConnectionError(endpoint_url="http://localhost:8000")


def sample_doc_dict(**overrides):
    """Sample repository document dict."""
    base = {
        "id": "doc-abc123",
        "warrantyId": None,
        "objectKey": "uploads/test_invoice.pdf",
        "productName": "Test Product",
        "fileName": "invoice.pdf",
        "fileType": "pdf",
        "fileSize": "1024",
        "uploadedAt": "2026-10-28T00:00:00+00:00",
        "previewUrl": None,
        "isSample": False,
        "rawTextExcerpt": "raw text",
        "status": "uploaded",
        "progress": 0,
        "error_message": None,
        "extracted_data": None,
    }
    base.update(overrides)
    return base


def fake_successful_extraction():
    """Fake successful Textract extraction result (SimpleNamespace stands in for the dataclass)."""
    return SimpleNamespace(
        merchant_name="Amazon",
        invoice_number="INV-123",
        purchase_date="2026-01-15",
        product_name="MacBook Pro",
        brand="Apple",
        model_number="MBP14",
        serial_number="SN123",
        quantity=1,
        purchase_price=149900.0,
        currency="INR",
        tax_amount=None,
        warranty_duration="1 year",
        warranty_start_date="2026-01-15",
        warranty_end_date=None,
        warranty_provider="Apple",
        warranty_terms="One-year limited warranty",
        raw_text="RAW INVOICE TEXT",
        extraction_confidence=0.85,
        uncertain_fields=[],
        is_uncertain=False,
        processing_status="completed",
        error_message=None,
        processing_time_ms=1200,
        pages_processed=1,
    )


class FakeDocRepo:
    """In-memory fake of DocumentRepository for multi-request persistence tests (mocked DynamoDB)."""

    def __init__(self):
        self.store = {}
        self._counter = 0

    def create_document(self, data):
        self._counter += 1
        doc_id = f"doc-fake{self._counter}"
        doc = sample_doc_dict(
            id=doc_id,
            fileName=data["fileName"],
            fileType=data["fileType"],
            fileSize=data["fileSize"],
            objectKey=data.get("objectKey"),
            productName=data.get("productName"),
            rawTextExcerpt=data.get("rawTextExcerpt"),
        )
        self.store[doc_id] = doc
        return doc

    def list_documents(self, user_id=DEMO_USER_ID):
        return list(self.store.values())

    def get_document(self, document_id, user_id=DEMO_USER_ID):
        return self.store.get(document_id)

    def update_document(self, document_id, updates, user_id=DEMO_USER_ID):
        doc = self.store.get(document_id)
        if doc is None:
            return None
        doc.update(updates)
        return doc

    def delete_document(self, document_id, user_id=DEMO_USER_ID):
        return self.store.pop(document_id, None) is not None


class TestDocumentKeyConventions:
    """Test that key conventions match the established warranty patterns."""

    def test_build_pk_uses_user_id(self):
        """Partition key follows USER#<user_id> convention."""
        pk = document_repo._build_pk("user-demo-1")
        assert pk == "USER#user-demo-1"

    def test_build_sk_uses_document_id(self):
        """Sort key follows DOCUMENT#<document_id> convention."""
        sk = document_repo._build_sk("doc-abc123")
        assert sk == "DOCUMENT#doc-abc123"

    def test_parse_document_id_extracts_from_documented_sk(self):
        """Extract document ID from DOCUMENT# sort key prefix."""
        doc_id = document_repo._parse_document_id("DOCUMENT#doc-abc123")
        assert doc_id == "doc-abc123"

    def test_parse_document_id_returns_none_for_non_document_sk(self):
        """Non-document sort key returns None."""
        doc_id = document_repo._parse_document_id("WARRANTY#war-abc123")
        assert doc_id is None


class TestDemoUserId:
    """Test demo user ID constant."""

    def test_demo_user_id_is_user_demo_1(self):
        """DEMO_USER_ID should be user-demo-1 for compatibility."""
        assert DEMO_USER_ID == "user-demo-1"


class TestDocumentEndpoints:
    """Tests for /api/v1/documents endpoints with mocked DynamoDB, S3, and Textract (all mocked - no live AWS)."""

    @pytest.fixture
    def mock_repo(self):
        with patch("app.routers.documents.document_repo") as mock:
            yield mock

    @pytest.fixture
    def mock_s3(self):
        with patch("app.routers.documents.s3") as mock:
            yield mock

    @pytest.fixture
    def mock_textract(self):
        with patch("app.routers.documents.textract") as mock:
            yield mock

    def test_create_document_coerces_none_optional_fields(self):
        """Regression: None warrantyId must not produce an invalid {"S": None} attribute."""
        fake_client = MagicMock()
        with patch.object(type(document_repo), "_get_boto3_client", return_value=fake_client):
            document_repo.create_document({
                "fileName": "a.pdf",
                "fileType": "pdf",
                "fileSize": "1",
                "userId": "user-demo-1",
                "warrantyId": None,
                "objectKey": "uploads/a.pdf",
                "productName": None,
                "rawTextExcerpt": None,
            })
        fake_client.put_item.assert_called_once()
        item = fake_client.put_item.call_args.kwargs["Item"]
        assert item["warrantyId"] == {"S": ""}
        assert item["productName"] == {"S": ""}
        assert item["objectKey"] == {"S": "uploads/a.pdf"}
        assert "rawTextExcerpt" not in item

    @pytest.mark.asyncio
    async def test_list_documents_returns_persisted_records(self, mock_repo):
        mock_repo.list_documents.return_value = [sample_doc_dict()]
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/v1/documents")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == "doc-abc123"
        assert data[0]["objectKey"] == "uploads/test_invoice.pdf"
        mock_repo.list_documents.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_document_persists_to_dynamodb(self, mock_repo):
        mock_repo.create_document.return_value = sample_doc_dict()
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/documents",
                json={
                    "fileName": "invoice.pdf",
                    "fileType": "pdf",
                    "fileSize": "1024",
                    "objectKey": "uploads/test_invoice.pdf",
                    "productName": "Test Product",
                },
            )
        assert response.status_code == 200
        assert response.json()["id"] == "doc-abc123"
        mock_repo.create_document.assert_called_once()
        call_data = mock_repo.create_document.call_args[0][0]
        assert call_data["userId"] == "user-demo-1"
        assert call_data["objectKey"] == "uploads/test_invoice.pdf"

    @pytest.mark.asyncio
    async def test_create_document_dynamodb_unavailable_returns_503(self, mock_repo):
        mock_repo.create_document.side_effect = make_endpoint_connection_error()
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/documents",
                json={"fileName": "a.pdf", "fileType": "pdf", "fileSize": "1"},
            )
        assert response.status_code == 503

    @pytest.mark.asyncio
    async def test_get_status_missing_document_returns_404(self, mock_repo):
        mock_repo.get_document.return_value = None
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/v1/documents/doc-missing/status")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_document_removes_record_and_own_s3_object(self, mock_repo, mock_s3):
        mock_repo.get_document.return_value = sample_doc_dict()
        mock_repo.delete_document.return_value = True
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.delete("/api/v1/documents/doc-abc123")
        assert response.status_code == 200
        mock_repo.delete_document.assert_called_once_with("doc-abc123")
        # Only this document's own stored object key is deleted - never a broad cleanup
        mock_s3.delete_object.assert_called_once_with("uploads/test_invoice.pdf")

    @pytest.mark.asyncio
    async def test_delete_missing_document_returns_404(self, mock_repo, mock_s3):
        mock_repo.get_document.return_value = None
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.delete("/api/v1/documents/doc-missing")
        assert response.status_code == 404
        mock_s3.delete_object.assert_not_called()

    @pytest.mark.asyncio
    async def test_delete_document_s3_failure_still_deletes_metadata(self, mock_repo, mock_s3):
        mock_repo.get_document.return_value = sample_doc_dict()
        mock_repo.delete_document.return_value = True
        mock_s3.delete_object.side_effect = Exception("S3 down")
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.delete("/api/v1/documents/doc-abc123")
        # Metadata deletion succeeded; the orphaned object is logged honestly
        assert response.status_code == 200
        mock_repo.delete_document.assert_called_once()

    @pytest.mark.asyncio
    async def test_presign_upload_returns_url(self, mock_s3):
        mock_s3.generate_presigned_upload_url.return_value = {
            "upload_url": "https://s3.example/presigned",
            "bucket": "test-bucket",
            "key": "uploads/x.pdf",
            "expires_in": 3600,
        }
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/documents/presign-upload",
                json={"object_key": "uploads/x.pdf", "content_type": "application/pdf"},
            )
        assert response.status_code == 200
        assert response.json()["upload_url"] == "https://s3.example/presigned"

    @pytest.mark.asyncio
    async def test_presign_upload_s3_unavailable_returns_502(self, mock_s3):
        mock_s3.generate_presigned_upload_url.side_effect = make_endpoint_connection_error()
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/documents/presign-upload",
                json={"object_key": "uploads/x.pdf"},
            )
        assert response.status_code == 502

    @pytest.mark.asyncio
    async def test_presign_download_supports_slashes_in_object_key(self, mock_s3):
        mock_s3.generate_presigned_download_url.return_value = "https://s3.example/download"
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                "/api/v1/documents/presign-download/uploads/2026_x_invoice.pdf"
            )
        assert response.status_code == 200
        assert response.json()["download_url"] == "https://s3.example/download"
        mock_s3.generate_presigned_download_url.assert_called_once_with(
            "uploads/2026_x_invoice.pdf", expiration=3600
        )

    @pytest.mark.asyncio
    async def test_upload_invoice_unsupported_type_returns_400(self, mock_repo, mock_s3, mock_textract):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/documents/upload-invoice",
                files={"file": ("notes.txt", b"hello", "text/plain")},
            )
        assert response.status_code == 400
        mock_repo.create_document.assert_not_called()
        mock_s3.upload_file.assert_not_called()

    @pytest.mark.asyncio
    async def test_upload_invoice_success_uploads_s3_and_extracts(self, mock_repo, mock_s3, mock_textract):
        mock_repo.create_document.return_value = sample_doc_dict()
        mock_textract.extract_text_from_document.return_value = fake_successful_extraction()
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/documents/upload-invoice",
                files={"file": ("invoice.pdf", b"%PDF-1.4 test", "application/pdf")},
            )
        assert response.status_code == 200
        body = response.json()
        # Frontend ExtractedInvoiceResult contract
        assert body["document_id"] == "doc-abc123"
        assert body["processing_status"] == "completed"
        assert body["productName"] == "MacBook Pro"
        assert body["seller"] == "Amazon"
        assert body["invoiceNumber"] == "INV-123"
        assert body["purchasePrice"] == 149900.0
        assert body["warrantyDurationMonths"] == 12  # '1 year' -> 12 months
        assert body["warrantyExpiryDate"] == "2027-01-15"
        assert body["category"] == "Other"
        assert body["rawConfidence"] == 85
        # File was actually uploaded to S3 before OCR
        mock_s3.upload_file.assert_called_once()
        assert mock_s3.upload_file.call_args[0][1].startswith("uploads/")
        # Extraction results persisted
        mock_repo.update_document.assert_called_once()
        updates = mock_repo.update_document.call_args[0][1]
        assert updates["status"] == "needs_review"
        assert updates["extracted_data"]["product_name"] == "MacBook Pro"

    @pytest.mark.asyncio
    async def test_upload_invoice_textract_failure_still_persists_document(self, mock_repo, mock_s3, mock_textract):
        """Regression test: OCR failure must not cause a 500 or lose the document."""
        mock_repo.create_document.return_value = sample_doc_dict()
        mock_textract.extract_text_from_document.side_effect = Exception("Textract not configured")
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/documents/upload-invoice",
                files={"file": ("invoice.pdf", b"%PDF-1.4 test", "application/pdf")},
            )
        assert response.status_code == 200
        body = response.json()
        assert body["processing_status"] == "failed"
        assert body["error_message"]
        assert body["document_id"] == "doc-abc123"
        # Metadata persisted with honest failure status
        updates = mock_repo.update_document.call_args[0][1]
        assert updates["status"] == "failed"
        assert updates["error_message"]

    @pytest.mark.asyncio
    async def test_upload_invoice_s3_failure_rolls_back_metadata(self, mock_repo, mock_s3, mock_textract):
        mock_repo.create_document.return_value = sample_doc_dict()
        mock_s3.upload_file.side_effect = Exception("S3 down")
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/documents/upload-invoice",
                files={"file": ("invoice.pdf", b"%PDF-1.4 test", "application/pdf")},
            )
        assert response.status_code == 502
        # Metadata rolled back so no phantom document remains
        mock_repo.delete_document.assert_called_once_with("doc-abc123")
        mock_textract.extract_text_from_document.assert_not_called()

    @pytest.mark.asyncio
    async def test_upload_invoice_dynamodb_failure_returns_503(self, mock_repo, mock_s3, mock_textract):
        mock_repo.create_document.side_effect = make_endpoint_connection_error()
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/documents/upload-invoice",
                files={"file": ("invoice.pdf", b"%PDF-1.4 test", "application/pdf")},
            )
        assert response.status_code == 503
        # S3 upload must not happen if metadata could not be persisted
        mock_s3.upload_file.assert_not_called()

    @pytest.mark.asyncio
    async def test_upload_invoice_documents_persist_across_separate_requests(self, mock_s3, mock_textract):
        """Two separate API requests against a stateful (mocked) repository: documents created in
        the first request are still listed in the second (no in-memory router list involved)."""
        fake_repo = FakeDocRepo()
        mock_textract.extract_text_from_document.side_effect = Exception("OCR unavailable")
        with patch("app.routers.documents.document_repo", fake_repo):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                r1 = await client.post(
                    "/api/v1/documents/upload-invoice",
                    files={"file": ("first.pdf", b"%PDF-1.4 one", "application/pdf")},
                )
                r2 = await client.post(
                    "/api/v1/documents/upload-invoice",
                    files={"file": ("second.pdf", b"%PDF-1.4 two", "application/pdf")},
                )
                listing = await client.get("/api/v1/documents")
        assert r1.status_code == 200
        assert r2.status_code == 200
        assert r1.json()["document_id"] != r2.json()["document_id"]
        assert listing.status_code == 200
        names = {d["fileName"] for d in listing.json()}
        assert names == {"first.pdf", "second.pdf"}