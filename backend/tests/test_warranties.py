"""Tests for warranties endpoints."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock, PropertyMock
from httpx import AsyncClient, ASGITransport
from botocore.exceptions import EndpointConnectionError

from app.main import app
from app.models.warranty import WarrantyCreate, WarrantyUpdate, WarrantyResponse
from app.services.warranty_service import WarrantyRepository
from app.config import settings


def make_endpoint_connection_error():
    """Create a proper EndpointConnectionError for mocking."""
    return EndpointConnectionError(endpoint_url="http://localhost:8000")


class TestWarrantiesEndpoints:
    """Tests for /api/v1/warranties endpoints with mocked DynamoDB."""

    @pytest.fixture
    def mock_repo(self):
        """Create a mock warranty repository."""
        with patch("app.routers.warranties.warranty_repo") as mock:
            yield mock

    @pytest.fixture
    def sample_warranty_create(self):
        """Sample warranty creation data."""
        return WarrantyCreate(
            productName="Test Product",
            brand="Test Brand",
            category="Electronics",
            seller="Test Store",
            invoiceNumber="INV-TEST-001",
            purchaseDate="2024-01-15",
            purchasePrice=299.99,
            currency="USD",
            warrantyStartDate="2024-01-15",
            warrantyDurationMonths=24,
            warrantyExpiryDate="2026-01-15",
            serialNumber="SN123456",
            notes="Test warranty",
            coverageSummary="Test coverage",
            exclusions=["Exclusion 1"],
            claimRequirements=["Requirement 1"],
            claimContact=None,
            sourceWarrantyText="Test source text",
            documentIds=["doc-1"],
        )

    @pytest.fixture
    def sample_warranty_response(self):
        """Sample warranty response."""
        return WarrantyResponse(
            id="war-abc123",
            userId="user-demo-1",
            productName="Test Product",
            brand="Test Brand",
            category="Electronics",
            seller="Test Store",
            invoiceNumber="INV-TEST-001",
            purchaseDate="2024-01-15",
            purchasePrice=299.99,
            currency="USD",
            warrantyStartDate="2024-01-15",
            warrantyDurationMonths=24,
            warrantyExpiryDate="2026-01-15",
            serialNumber="SN123456",
            notes="Test warranty",
            coverageSummary="Test coverage",
            exclusions=["Exclusion 1"],
            claimRequirements=["Requirement 1"],
            claimContact=None,
            sourceWarrantyText="Test source text",
            documentIds=["doc-1"],
            createdAt="2024-01-15T10:30:00Z",
            updatedAt="2024-01-15T10:30:00Z",
        )

    @pytest.mark.asyncio
    async def test_list_warranties_empty(self, mock_repo):
        """Test listing warranties returns empty array when no warranties exist."""
        mock_repo.list_warranties.return_value = []

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/v1/warranties")

        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        mock_repo.list_warranties.assert_called_once()

    @pytest.mark.asyncio
    async def test_list_warranties_with_data(self, mock_repo, sample_warranty_response):
        """Test listing warranties returns user's records."""
        mock_repo.list_warranties.return_value = [sample_warranty_response]

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/v1/warranties")

        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["id"] == "war-abc123"
        assert data["items"][0]["productName"] == "Test Product"

    @pytest.mark.asyncio
    async def test_list_warranties_db_unavailable(self, mock_repo):
        """Test listing warranties handles DB unavailable."""
        mock_repo.list_warranties.side_effect = make_endpoint_connection_error()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/v1/warranties")

        assert response.status_code == 503
        assert "unavailable" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_get_warranty_found(self, mock_repo, sample_warranty_response):
        """Test getting an existing warranty returns HTTP 200."""
        mock_repo.get_warranty.return_value = sample_warranty_response

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/v1/warranties/war-abc123")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "war-abc123"
        assert data["productName"] == "Test Product"

    @pytest.mark.asyncio
    async def test_get_warranty_not_found(self, mock_repo):
        """Test getting a missing warranty returns HTTP 404."""
        mock_repo.get_warranty.return_value = None

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/v1/warranties/war-nonexistent")

        assert response.status_code == 404
        assert response.json()["detail"] == "Warranty not found"

    @pytest.mark.asyncio
    async def test_get_warranty_db_unavailable(self, mock_repo):
        """Test getting warranty handles DB unavailable."""
        mock_repo.get_warranty.side_effect = make_endpoint_connection_error()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/v1/warranties/war-abc123")

        assert response.status_code == 503

    @pytest.mark.asyncio
    async def test_create_warranty_valid(self, mock_repo, sample_warranty_create, sample_warranty_response):
        """Test creating a valid warranty returns HTTP 201."""
        mock_repo.create_warranty.return_value = sample_warranty_response

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/warranties",
                json=sample_warranty_create.model_dump(),
            )

        assert response.status_code == 201
        data = response.json()
        assert data["id"] == "war-abc123"
        assert data["productName"] == "Test Product"

    @pytest.mark.asyncio
    async def test_create_warranty_invalid(self):
        """Test invalid create request returns HTTP 422."""
        invalid_data = {
            "productName": "",  # Empty - should fail validation
            "brand": "Test",
            "category": "Electronics",
            "seller": "Test",
            "invoiceNumber": "INV-001",
            "purchaseDate": "invalid-date",  # Invalid format
            "purchasePrice": -10,  # Negative - should fail
            "currency": "USD",
            "warrantyStartDate": "2024-01-15",
            "warrantyDurationMonths": 0,  # Invalid - must be >= 1
            "warrantyExpiryDate": "2026-01-15",
        }

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post("/api/v1/warranties", json=invalid_data)

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_warranty_db_unavailable(self, mock_repo, sample_warranty_create):
        """Test creating warranty handles DB unavailable."""
        mock_repo.create_warranty.side_effect = make_endpoint_connection_error()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/warranties",
                json=sample_warranty_create.model_dump(),
            )

        assert response.status_code == 503

    @pytest.mark.asyncio
    async def test_create_warranty_conflict(self, mock_repo, sample_warranty_create):
        """Test creating warranty with duplicate ID returns HTTP 409."""
        mock_repo.create_warranty.side_effect = ValueError("Warranty with this ID already exists")

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/warranties",
                json=sample_warranty_create.model_dump(),
            )

        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_update_warranty_success(self, mock_repo, sample_warranty_response):
        """Test updating an existing warranty works."""
        updated = sample_warranty_response.model_copy(update={"productName": "Updated Product", "updatedAt": "2024-01-16T10:30:00Z"})
        mock_repo.update_warranty.return_value = updated

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.put(
                "/api/v1/warranties/war-abc123",
                json={"productName": "Updated Product"},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["productName"] == "Updated Product"

    @pytest.mark.asyncio
    async def test_update_warranty_not_found(self, mock_repo):
        """Test updating a missing warranty returns HTTP 404."""
        mock_repo.update_warranty.return_value = None

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.put(
                "/api/v1/warranties/war-nonexistent",
                json={"productName": "Updated Product"},
            )

        assert response.status_code == 404
        assert response.json()["detail"] == "Warranty not found"

    @pytest.mark.asyncio
    async def test_update_warranty_db_unavailable(self, mock_repo):
        """Test updating warranty handles DB unavailable."""
        mock_repo.update_warranty.side_effect = make_endpoint_connection_error()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.put(
                "/api/v1/warranties/war-abc123",
                json={"productName": "Updated Product"},
            )

        assert response.status_code == 503

    @pytest.mark.asyncio
    async def test_delete_warranty_success(self, mock_repo):
        """Test deleting an existing warranty returns HTTP 204."""
        mock_repo.delete_warranty.return_value = True

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.delete("/api/v1/warranties/war-abc123")

        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_delete_warranty_not_found(self, mock_repo):
        """Test deleting a missing warranty returns HTTP 404."""
        mock_repo.delete_warranty.return_value = False

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.delete("/api/v1/warranties/war-nonexistent")

        assert response.status_code == 404
        assert response.json()["detail"] == "Warranty not found"

    @pytest.mark.asyncio
    async def test_delete_warranty_db_unavailable(self, mock_repo):
        """Test deleting warranty handles DB unavailable."""
        mock_repo.delete_warranty.side_effect = make_endpoint_connection_error()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.delete("/api/v1/warranties/war-abc123")

        assert response.status_code == 503


class TestWarrantiesUserIsolation:
    """Tests for user isolation (single user in dev, but repo supports multi-user)."""

    @pytest.mark.asyncio
    async def test_user_cannot_retrieve_another_users_warranty(self):
        """Test that a user cannot retrieve another user's warranty via repo."""
        repo = WarrantyRepository()
        with patch.object(repo, "_get_boto3_client") as mock_client:
            mock_client.return_value.query.return_value = {"Items": []}
            # Query with different user IDs should be isolated
            repo.list_warranties("user-1")
            repo.list_warranties("user-2")
            # Both calls should use different PK values
            calls = mock_client.return_value.query.call_args_list
            assert calls[0][1]["ExpressionAttributeValues"][":pk"]["S"] == "USER#user-1"
            assert calls[1][1]["ExpressionAttributeValues"][":pk"]["S"] == "USER#user-2"

    @pytest.mark.asyncio
    async def test_user_cannot_update_another_users_warranty(self):
        """Test that a user cannot update another user's warranty via repo."""
        repo = WarrantyRepository()
        with patch.object(repo, "_get_boto3_client") as mock_client:
            mock_client.return_value.get_item.return_value = {
                "Item": {
                    "PK": {"S": "USER#user-1"},
                    "SK": {"S": "WARRANTY#war-1"},
                    "productName": {"S": "Test"},
                    "brand": {"S": "Test"},
                    "category": {"S": "Electronics"},
                    "seller": {"S": "Test"},
                    "invoiceNumber": {"S": "INV-001"},
                    "purchaseDate": {"S": "2024-01-15"},
                    "purchasePrice": {"N": "100"},
                    "currency": {"S": "USD"},
                    "warrantyStartDate": {"S": "2024-01-15"},
                    "warrantyDurationMonths": {"N": "12"},
                    "warrantyExpiryDate": {"S": "2025-01-15"},
                    "documentIds": {"L": []},
                    "createdAt": {"S": "2024-01-15T10:30:00Z"},
                    "updatedAt": {"S": "2024-01-15T10:30:00Z"},
                }
            }
            mock_client.return_value.update_item.return_value = {
                "Attributes": {
                    "PK": {"S": "USER#user-1"},
                    "SK": {"S": "WARRANTY#war-1"},
                    "productName": {"S": "Test"},
                    "brand": {"S": "Test"},
                    "category": {"S": "Electronics"},
                    "seller": {"S": "Test"},
                    "invoiceNumber": {"S": "INV-001"},
                    "purchaseDate": {"S": "2024-01-15"},
                    "purchasePrice": {"N": "100"},
                    "currency": {"S": "USD"},
                    "warrantyStartDate": {"S": "2024-01-15"},
                    "warrantyDurationMonths": {"N": "12"},
                    "warrantyExpiryDate": {"S": "2025-01-15"},
                    "documentIds": {"L": []},
                    "createdAt": {"S": "2024-01-15T10:30:00Z"},
                    "updatedAt": {"S": "2024-01-16T10:30:00Z"},
                }
            }
            # Update with different user IDs should use different PK
            repo.update_warranty("war-1", WarrantyUpdate(productName="Test"), "user-1")
            repo.update_warranty("war-1", WarrantyUpdate(productName="Test"), "user-2")
            # Check PK values in calls
            calls = mock_client.return_value.update_item.call_args_list
            assert calls[0][1]["Key"]["PK"]["S"] == "USER#user-1"
            assert calls[1][1]["Key"]["PK"]["S"] == "USER#user-2"

    @pytest.mark.asyncio
    async def test_user_cannot_delete_another_users_warranty(self):
        """Test that a user cannot delete another user's warranty via repo."""
        repo = WarrantyRepository()
        with patch.object(repo, "_get_boto3_client") as mock_client:
            mock_client.return_value.delete_item.return_value = {"Attributes": {}}
            # Delete with different user IDs should use different PK
            repo.delete_warranty("war-1", "user-1")
            repo.delete_warranty("war-1", "user-2")
            # Check PK values in calls
            calls = mock_client.return_value.delete_item.call_args_list
            assert calls[0][1]["Key"]["PK"]["S"] == "USER#user-1"
            assert calls[1][1]["Key"]["PK"]["S"] == "USER#user-2"


class TestWarrantyModels:
    """Tests for Pydantic warranty models."""

    def test_warranty_create_valid(self):
        """Test valid warranty creation model."""
        data = {
            "productName": "Test Product",
            "brand": "Test Brand",
            "category": "Electronics",
            "seller": "Test Store",
            "invoiceNumber": "INV-001",
            "purchaseDate": "2024-01-15",
            "purchasePrice": 299.99,
            "currency": "USD",
            "warrantyStartDate": "2024-01-15",
            "warrantyDurationMonths": 24,
            "warrantyExpiryDate": "2026-01-15",
        }
        warranty = WarrantyCreate(**data)
        assert warranty.productName == "Test Product"
        assert warranty.purchasePrice == 299.99

    def test_warranty_create_invalid_date(self):
        """Test warranty creation with invalid date format."""
        data = {
            "productName": "Test",
            "brand": "Test",
            "category": "Electronics",
            "seller": "Test",
            "invoiceNumber": "INV-001",
            "purchaseDate": "01/15/2024",  # Wrong format
            "purchasePrice": 100,
            "currency": "USD",
            "warrantyStartDate": "2024-01-15",
            "warrantyDurationMonths": 12,
            "warrantyExpiryDate": "2025-01-15",
        }
        with pytest.raises(ValueError, match="Date must be in YYYY-MM-DD format"):
            WarrantyCreate(**data)

    def test_warranty_create_negative_price(self):
        """Test warranty creation with negative price."""
        data = {
            "productName": "Test",
            "brand": "Test",
            "category": "Electronics",
            "seller": "Test",
            "invoiceNumber": "INV-001",
            "purchaseDate": "2024-01-15",
            "purchasePrice": -50,  # Negative
            "currency": "USD",
            "warrantyStartDate": "2024-01-15",
            "warrantyDurationMonths": 12,
            "warrantyExpiryDate": "2025-01-15",
        }
        with pytest.raises(ValueError):
            WarrantyCreate(**data)

    def test_warranty_update_partial(self):
        """Test partial warranty update model."""
        update = WarrantyUpdate(productName="New Name")
        assert update.productName == "New Name"
        assert update.brand is None
        assert update.purchasePrice is None

    def test_warranty_update_invalid_duration(self):
        """Test warranty update with invalid duration."""
        with pytest.raises(ValueError):
            WarrantyUpdate(warrantyDurationMonths=0)


class TestHealthEndpointsStillWork:
    """Ensure Stage 0 health endpoints still work."""

    @pytest.mark.asyncio
    async def test_health_check(self):
        """Test basic health check."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"

    @pytest.mark.asyncio
    async def test_api_v1_health_check(self):
        """Test versioned API health check."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/v1/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"

    @pytest.mark.asyncio
    async def test_database_health_check(self):
        """Test database health check."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/health/db")
        assert response.status_code == 200
        assert "connected" in response.json()

    @pytest.mark.asyncio
    async def test_root_endpoint(self):
        """Test root endpoint."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/")
        assert response.status_code == 200
        assert response.json()["service"] == "WarrantyEase API"