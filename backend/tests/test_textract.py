"""Mocked unit tests for the Textract AnalyzeExpense OCR service.

All AWS calls are mocked - no live Textract is invoked here. A separate
manual live test is documented in the final report (the account currently
returns SubscriptionRequiredException, so live OCR cannot be verified).
"""

from unittest.mock import MagicMock, patch

import pytest
from botocore.exceptions import ClientError

from app.services.textract_service import TextractService, ExtractedInvoiceData


def make_client_error(code, message="err"):
    return ClientError({"Error": {"Code": code, "Message": message}}, "AnalyzeExpense")


def make_expense_response(lines=("Apex Electronics", "Total: Rs. 100.00"),
                          summary_fields=None, line_items=None):
    """Build a fake AnalyzeExpense response."""
    blocks = [
        {"BlockType": "LINE", "Text": t, "Confidence": 95.0, "Page": 1}
        for t in lines
    ]
    expense_doc = {
        "SummaryFields": summary_fields or [],
        "LineItemGroups": line_items or [],
    }
    return {"Blocks": blocks, "ExpenseDocuments": [expense_doc]}


@pytest.fixture
def svc():
    s = TextractService()
    s._textract_client = MagicMock()  # inject mock client, skip credential setup
    return s


class TestSyncAnalyzeExpense:
    """Synchronous path (images + single-page docs)."""

    def test_successful_image_invoice(self, svc):
        """Successful synchronous image invoice analysis maps fields."""
        svc._textract_client.analyze_expense.return_value = make_expense_response(
            summary_fields=[
                {"Type": "VENDOR_NAME", "ValueDetection": {"Text": "Apex Electronics"}},
                {"Type": "INVOICE_NUMBER", "ValueDetection": {"Text": "INV-2026-0042"}},
                {"Type": "INVOICE_DATE", "ValueDetection": {"Text": "2026-10-01"}},
                {"Type": "TOTAL", "ValueDetection": {"Text": "Rs. 29,498.82"}},
            ],
            line_items=[{
                "LineItems": [{
                    "LineItemExpenseFields": [
                        {"Type": "PRODUCT_NAME", "ValueDetection": {"Text": "Wireless Headphones"}},
                    ]
                }]
            }],
        )
        result = svc.extract_text_from_document(b"%PDF-bytes", "invoice.png")
        assert result.processing_status == "completed"
        assert result.merchant_name == "Apex Electronics"
        assert result.invoice_number == "INV-2026-0042"
        assert result.purchase_date == "2026-10-01"
        assert result.purchase_price == 29498.82
        assert result.currency == "INR"  # detected from Rs. in raw text
        assert result.product_name == "Wireless Headphones"
        assert result.raw_text  # raw OCR text returned for diagnosis
        # Bytes path used for image, not S3
        svc._textract_client.analyze_expense.assert_called_once()
        svc._textract_client.start_expense_analysis.assert_not_called()

    def test_empty_extraction_is_completed_but_uncertain(self, svc):
        """Empty/incomplete extraction completes but is flagged uncertain."""
        svc._textract_client.analyze_expense.return_value = make_expense_response(lines=())
        result = svc.extract_text_from_document(b"bytes", "receipt.jpg")
        assert result.processing_status == "completed"
        assert result.is_uncertain is True
        assert result.raw_text == ""
        assert result.purchase_price is None  # no fabricated price
        assert "purchase_price" in result.uncertain_fields


class TestErrorHandling:
    """Permission/auth/throttling/unsupported errors map to honest messages."""

    def test_subscription_required_error(self, svc):
        svc._textract_client.analyze_expense.side_effect = make_client_error(
            "SubscriptionRequiredException", "needs a subscription")
        result = svc.extract_text_from_document(b"bytes", "a.png")
        assert result.processing_status == "failed"
        assert "not enabled" in result.error_message

    def test_access_denied_error(self, svc):
        svc._textract_client.analyze_expense.side_effect = make_client_error(
            "AccessDeniedException", "not authorized")
        result = svc.extract_text_from_document(b"bytes", "a.png")
        assert result.processing_status == "failed"
        assert "IAM permissions" in result.error_message

    def test_auth_error(self, svc):
        svc._textract_client.analyze_expense.side_effect = make_client_error(
            "UnrecognizedClientException", "invalid security token")
        result = svc.extract_text_from_document(b"bytes", "a.png")
        assert result.processing_status == "failed"
        assert "credentials" in result.error_message.lower()

    def test_throttling_error(self, svc):
        svc._textract_client.analyze_expense.side_effect = make_client_error(
            "ProvisionedThroughputExceededException", "rate exceeded")
        result = svc.extract_text_from_document(b"bytes", "a.png")
        assert result.processing_status == "failed"
        assert "rate-limiting" in result.error_message

    def test_unsupported_format_rejected_before_api_call(self, svc):
        result = svc.extract_text_from_document(b"bytes", "document.docx")
        assert result.processing_status == "failed"
        assert "Unsupported file type" in result.error_message
        svc._textract_client.analyze_expense.assert_not_called()

    def test_oversize_file_rejected(self, svc):
        big = b"x" * (11 * 1024 * 1024)
        result = svc.extract_text_from_document(big, "big.pdf")
        assert result.processing_status == "failed"
        assert "10 MB" in result.error_message
        svc._textract_client.analyze_expense.assert_not_called()


class TestAsyncPdf:
    """Multi-page PDF/TIFF fall back to StartExpenseAnalysis via S3."""

    def test_async_pdf_success(self, svc):
        svc._textract_client.analyze_expense.side_effect = make_client_error(
            "InvalidParameterException", "Cannot have more than 1 page in sync")
        svc._textract_client.start_expense_analysis.return_value = {"JobId": "job-1"}
        svc._textract_client.get_expense_analysis.return_value = {
            "JobStatus": "SUCCEEDED",
            "Blocks": [{"BlockType": "LINE", "Text": "Async Vendor", "Confidence": 90.0, "Page": 1}],
            "ExpenseDocuments": [{
                "SummaryFields": [{"Type": "VENDOR_NAME", "ValueDetection": {"Text": "Async Vendor"}}],
                "LineItemGroups": [],
            }],
        }
        result = svc.extract_text_from_document(
            b"pdf-bytes", "multi.pdf", s3_bucket="bucket", s3_key="uploads/x.pdf")
        assert result.processing_status == "completed"
        assert result.merchant_name == "Async Vendor"
        svc._textract_client.start_expense_analysis.assert_called_once_with(
            DocumentLocation={"S3Object": {"Bucket": "bucket", "Name": "uploads/x.pdf"}})
        svc._textract_client.get_expense_analysis.assert_called_with(JobId="job-1")

    def test_async_job_failed(self, svc):
        svc._textract_client.analyze_expense.side_effect = make_client_error(
            "InvalidParameterException", "single page only")
        svc._textract_client.start_expense_analysis.return_value = {"JobId": "job-2"}
        svc._textract_client.get_expense_analysis.return_value = {
            "JobStatus": "FAILED", "StatusMessage": "Bad document"}
        result = svc.extract_text_from_document(
            b"pdf", "multi.pdf", s3_bucket="b", s3_key="k")
        assert result.processing_status == "failed"
        assert "job failed" in result.error_message.lower()

    def test_async_job_timeout(self, svc, monkeypatch):
        svc._textract_client.analyze_expense.side_effect = make_client_error(
            "InvalidParameterException", "single page only")
        svc._textract_client.start_expense_analysis.return_value = {"JobId": "job-3"}
        svc._textract_client.get_expense_analysis.return_value = {"JobStatus": "IN_PROGRESS"}
        monkeypatch.setattr(svc, "MAX_POLL_SECONDS", 0)  # force immediate timeout
        result = svc.extract_text_from_document(
            b"pdf", "multi.pdf", s3_bucket="b", s3_key="k")
        assert result.processing_status == "failed"
        assert "did not finish" in result.error_message

    def test_multipage_without_s3_reference_fails_honestly(self, svc):
        """No S3 ref + sync rejects -> cannot run async; fail with clear message."""
        svc._textract_client.analyze_expense.side_effect = make_client_error(
            "InvalidParameterException", "Cannot have more than 1 page")
        result = svc.extract_text_from_document(b"pdf", "multi.pdf")  # no s3 ref
        assert result.processing_status == "failed"
        assert result.error_message  # honest failure, not a crash
        svc._textract_client.start_expense_analysis.assert_not_called()


class TestStatusAndTiming:
    def test_processing_time_is_nonzero(self, svc):
        svc._textract_client.analyze_expense.return_value = make_expense_response()
        result = svc.extract_text_from_document(b"bytes", "a.png")
        assert result.processing_status == "completed"
        assert result.processing_time_ms >= 0  # real timing, not now-now bug

    def test_warranty_fields_not_fabricated(self, svc):
        """OCR without warranty text leaves warranty fields empty (not invented)."""
        svc._textract_client.analyze_expense.return_value = make_expense_response(
            lines=("Some Store", "Item: Widget", "Total: $9.99"))
        result = svc.extract_text_from_document(b"bytes", "a.png")
        assert result.processing_status == "completed"
        assert result.warranty_duration is None
        assert result.warranty_end_date is None
        assert "warranty_duration" in result.uncertain_fields

    def test_warranty_duration_from_text(self, svc):
        svc._textract_client.analyze_expense.return_value = make_expense_response(
            lines=("Store", "Warranty: 2 year manufacturer warranty", "Total: $5.00"))
        result = svc.extract_text_from_document(b"bytes", "a.png")
        assert result.warranty_duration == "2 years"
