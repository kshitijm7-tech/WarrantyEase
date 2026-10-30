"""Tests for notification endpoints and expiry-alert sync (all mocked)."""

import pytest
from unittest.mock import patch, MagicMock
from httpx import AsyncClient, ASGITransport
from botocore.exceptions import EndpointConnectionError

from app.main import app
from app.utils.date_utils import calculate_remaining_days, add_months, get_today_iso
from app.utils.warranty_utils import get_warranty_status, compute_dashboard_metrics


def make_endpoint_connection_error():
    return EndpointConnectionError(endpoint_url="http://localhost:8000")


def sample_notification(**overrides):
    base = {
        "id": "notif-abc123",
        "warrantyId": "war-1",
        "productName": "Test Product",
        "brand": "Test Brand",
        "type": "expiring_soon",
        "title": "Warranty expires in 21 days: Test Product",
        "message": "Your Test Brand Test Product warranty expires soon.",
        "daysRemaining": 21,
        "expiryDate": "2026-11-18",
        "createdAt": "2026-10-28T00:00:00+00:00",
        "isRead": False,
    }
    base.update(overrides)
    return base


class TestDateUtils:
    """Backend date utils must mirror the frontend exactly."""

    def test_remaining_days_future(self):
        from datetime import timedelta
        from app.utils.date_utils import get_reference_date
        future = (get_reference_date() + timedelta(days=10)).isoformat()
        assert calculate_remaining_days(future) == 10

    def test_remaining_days_past_is_negative(self):
        from datetime import timedelta
        from app.utils.date_utils import get_reference_date
        past = (get_reference_date() - timedelta(days=5)).isoformat()
        assert calculate_remaining_days(past) == -5

    def test_remaining_days_empty_string(self):
        assert calculate_remaining_days("") == 0

    def test_status_active_expiring_expired(self):
        from datetime import timedelta
        from app.utils.date_utils import get_reference_date
        today = get_reference_date()
        active = (today + timedelta(days=100)).isoformat()
        soon = (today + timedelta(days=15)).isoformat()
        expired = (today - timedelta(days=1)).isoformat()
        assert get_warranty_status(active) == "active"
        assert get_warranty_status(soon) == "expiring_soon"
        assert get_warranty_status(expired) == "expired"

    def test_dashboard_metrics(self):
        from datetime import timedelta
        from app.utils.date_utils import get_reference_date
        today = get_reference_date()
        warranties = [
            {"warrantyExpiryDate": (today + timedelta(days=100)).isoformat()},
            {"warrantyExpiryDate": (today + timedelta(days=10)).isoformat()},
            {"warrantyExpiryDate": (today - timedelta(days=1)).isoformat()},
        ]
        m = compute_dashboard_metrics(warranties)
        assert m == {
            "totalProducts": 3,
            "activeWarranties": 1,
            "expiringSoonWarranties": 1,
            "expiredWarranties": 1,
        }

    def test_add_months_clamps_day(self):
        assert add_months("2026-01-31", 1) == "2026-02-28"
        assert add_months("2026-01-15", 12) == "2027-01-15"


class TestNotificationEndpoints:
    @pytest.fixture
    def mock_notif_repo(self):
        with patch("app.routers.notifications.notification_repo") as mock:
            yield mock

    @pytest.mark.asyncio
    async def test_list_notifications_from_dynamodb(self, mock_notif_repo):
        mock_notif_repo.list_notifications.return_value = [sample_notification()]
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/v1/notifications")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == "notif-abc123"
        assert data[0]["daysRemaining"] == 21

    @pytest.mark.asyncio
    async def test_list_notifications_db_unavailable(self, mock_notif_repo):
        mock_notif_repo.list_notifications.side_effect = make_endpoint_connection_error()
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/v1/notifications")
        assert response.status_code == 503

    @pytest.mark.asyncio
    async def test_mark_read_success(self, mock_notif_repo):
        mock_notif_repo.mark_read.return_value = True
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.patch("/api/v1/notifications/notif-abc123/read")
        assert response.status_code == 204
        mock_notif_repo.mark_read.assert_called_once_with("notif-abc123")

    @pytest.mark.asyncio
    async def test_mark_read_not_found(self, mock_notif_repo):
        mock_notif_repo.mark_read.return_value = False
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.patch("/api/v1/notifications/missing/read")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_mark_all_read(self, mock_notif_repo):
        mock_notif_repo.mark_all_read.return_value = 3
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post("/api/v1/notifications/read-all")
        assert response.status_code == 204
        mock_notif_repo.mark_all_read.assert_called_once()

    @pytest.mark.asyncio
    async def test_clear_notification_success(self, mock_notif_repo):
        mock_notif_repo.delete_notification.return_value = True
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.delete("/api/v1/notifications/notif-abc123")
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_clear_notification_not_found(self, mock_notif_repo):
        mock_notif_repo.delete_notification.return_value = False
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.delete("/api/v1/notifications/missing")
        assert response.status_code == 404


class TestSyncExpiryAlerts:
    """POST /api/v1/warranties/sync-expiry-alerts creates persistent alerts."""

    @pytest.fixture
    def mocks(self):
        with patch("app.routers.warranties.warranty_repo") as w, \
             patch("app.routers.warranties.notification_repo") as n:
            yield w, n

    def _warranty(self, wid, expiry):
        from app.models.warranty import WarrantyResponse
        return WarrantyResponse(
            id=wid, userId="user-demo-1", productName="Widget", brand="BrandX",
            category="Electronics", seller="Store", invoiceNumber="INV-1",
            purchaseDate="2025-01-01", purchasePrice=10.0, currency="INR",
            warrantyStartDate="2025-01-01", warrantyDurationMonths=12,
            warrantyExpiryDate=expiry, documentIds=[],
            createdAt="2025-01-01T00:00:00+00:00", updatedAt="2025-01-01T00:00:00+00:00",
        )

    @pytest.mark.asyncio
    async def test_sync_creates_notification_for_expiring_warranty(self, mocks):
        from datetime import timedelta
        from app.utils.date_utils import get_reference_date
        w, n = mocks
        expiry = (get_reference_date() + timedelta(days=20)).isoformat()
        w.list_warranties.return_value = [self._warranty("war-1", expiry)]
        n.create_notification.return_value = (sample_notification(), True)
        n.list_notifications.return_value = [sample_notification()]

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post("/api/v1/warranties/sync-expiry-alerts")

        assert response.status_code == 200
        data = response.json()
        assert data["scannedCount"] == 1
        assert data["expiringSoonCount"] == 1
        assert data["newAlertsCreated"] == 1
        assert len(data["notifications"]) == 1
        # Notification persisted with deterministic ID (no duplicates on rescan)
        n.create_notification.assert_called_once()
        assert n.create_notification.call_args.kwargs.get("notification_id", "").startswith("notif-exp-war-1-")

    @pytest.mark.asyncio
    async def test_sync_no_duplicates_on_rescan(self, mocks):
        from datetime import timedelta
        from app.utils.date_utils import get_reference_date
        w, n = mocks
        expiry = (get_reference_date() + timedelta(days=5)).isoformat()
        w.list_warranties.return_value = [self._warranty("war-1", expiry)]
        # First scan creates; second scan finds the existing record (created=False)
        n.create_notification.side_effect = [
            (sample_notification(), True),
            (sample_notification(), False),
        ]
        n.list_notifications.return_value = [sample_notification()]

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            r1 = await client.post("/api/v1/warranties/sync-expiry-alerts")
            r2 = await client.post("/api/v1/warranties/sync-expiry-alerts")

        assert r1.status_code == 200 and r2.status_code == 200
        assert r1.json()["newAlertsCreated"] == 1
        assert r2.json()["newAlertsCreated"] == 0  # idempotent

    @pytest.mark.asyncio
    async def test_sync_ignores_warranties_outside_window(self, mocks):
        from datetime import timedelta
        from app.utils.date_utils import get_reference_date
        w, n = mocks
        today = get_reference_date()
        far = (today + timedelta(days=200)).isoformat()
        expired = (today - timedelta(days=10)).isoformat()
        w.list_warranties.return_value = [
            self._warranty("war-far", far),
            self._warranty("war-exp", expired),
        ]
        n.list_notifications.return_value = []

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post("/api/v1/warranties/sync-expiry-alerts")

        assert response.status_code == 200
        data = response.json()
        assert data["scannedCount"] == 2
        assert data["expiringSoonCount"] == 0
        assert data["newAlertsCreated"] == 0
        n.create_notification.assert_not_called()

    @pytest.mark.asyncio
    async def test_sync_db_unavailable_returns_503(self, mocks):
        w, n = mocks
        w.list_warranties.side_effect = make_endpoint_connection_error()
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post("/api/v1/warranties/sync-expiry-alerts")
        assert response.status_code == 503
