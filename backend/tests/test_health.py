"""Tests for health endpoints."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.config import settings
from app.database.dynamodb import DynamoDBClient


class TestHealthEndpoints:
    """Tests for /health and /api/v1/health endpoints."""

    @pytest.mark.asyncio
    async def test_health_check(self):
        """Test basic health check returns expected response."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"
            assert data["service"] == settings.app_name
            assert data["version"] == settings.app_version

    @pytest.mark.asyncio
    async def test_api_v1_health_check(self):
        """Test versioned API health check returns expected response."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/v1/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"
            assert data["service"] == settings.app_name
            assert data["version"] == settings.app_version


class TestDatabaseHealthCheck:
    """Tests for /health/db endpoint with mocked DynamoDB."""

    @pytest.mark.asyncio
    async def test_database_health_check_connected(self):
        """Test database health check when DynamoDB is reachable."""
        with patch.object(DynamoDBClient, "check_connection", return_value=True) as mock_check:
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.get("/health/db")
                assert response.status_code == 200
                data = response.json()
                assert data["status"] == "healthy"
                assert data["connected"] is True
                assert data["table"] == settings.dynamodb_table_name
                assert data["endpoint"] == settings.dynamodb_endpoint_url
                mock_check.assert_called_once()

    @pytest.mark.asyncio
    async def test_database_health_check_disconnected(self):
        """Test database health check when DynamoDB is unreachable."""
        with patch.object(DynamoDBClient, "check_connection", return_value=False) as mock_check:
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.get("/health/db")
                assert response.status_code == 200
                data = response.json()
                assert data["status"] == "unhealthy"
                assert data["connected"] is False
                mock_check.assert_called_once()


class TestApplicationStartup:
    """Tests for application startup behavior."""

    @pytest.mark.asyncio
    async def test_app_starts_without_database(self):
        """Test that application can start and serve /health even when DynamoDB is unavailable."""
        # Mock DynamoDB as unavailable
        with patch.object(DynamoDBClient, "check_connection", return_value=False):
            with patch.object(DynamoDBClient, "create_dev_table", return_value=False):
                transport = ASGITransport(app=app)
                async with AsyncClient(transport=transport, base_url="http://test") as client:
                    # Health check should still work
                    response = await client.get("/health")
                    assert response.status_code == 200
                    data = response.json()
                    assert data["status"] == "healthy"

    @pytest.mark.asyncio
    async def test_root_endpoint(self):
        """Test root endpoint returns service info."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/")
            assert response.status_code == 200
            data = response.json()
            assert data["service"] == settings.app_name
            assert "docs" in data
            assert "health" in data
            assert "db_health" in data


class TestDynamoDBClient:
    """Tests for DynamoDBClient class."""

    def test_get_table_name(self):
        """Test getting the configured table name."""
        client = DynamoDBClient()
        assert client.get_table_name() == settings.dynamodb_table_name

    @pytest.mark.asyncio
    async def test_check_connection_handles_errors(self):
        """Test that check_connection handles connection errors gracefully."""
        client = DynamoDBClient()
        # This will fail because no DynamoDB is running, but should not raise
        result = client.check_connection()
        assert isinstance(result, bool)