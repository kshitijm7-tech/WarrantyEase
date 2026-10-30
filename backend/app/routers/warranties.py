"""Warranties router with CRUD endpoints."""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
from botocore.exceptions import EndpointConnectionError
from pydantic import BaseModel

from app.models.warranty import (
    WarrantyCreate,
    WarrantyUpdate,
    WarrantyResponse,
    WarrantyListResponse,
    ErrorResponse,
)
from app.services.warranty_service import warranty_repo
from app.services.notification_service import notification_repo
import logging
import uuid

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/warranties", tags=["warranties"])

# Demo user ID for development
DEMO_USER_ID = "user-demo-1"

class SyncExpiryAlertsResponse(BaseModel):
    scannedCount: int
    expiringSoonCount: int
    newAlertsCreated: int
    notifications: list

class SimulateExpiringRequest(BaseModel):
    productName: Optional[str] = None
    brand: Optional[str] = None
    daysUntilExpiry: Optional[int] = None


def handle_db_error(e: Exception) -> HTTPException:
    """Convert database errors to appropriate HTTP exceptions."""
    if isinstance(e, EndpointConnectionError) or "EndpointConnectionError" in str(type(e)):
        logger.error("DynamoDB connection failed: %s", e)
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service temporarily unavailable",
        )
    if isinstance(e, ValueError) and "already exists" in str(e):
        return HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )
    logger.exception("Database error: %s", e)
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="An internal error occurred",
    )


@router.get(
    "",
    response_model=WarrantyListResponse,
    summary="List all warranties for the current user",
    description="Returns all warranty records belonging to the current development user.",
    responses={
        200: {"description": "List of warranties"},
        503: {"model": ErrorResponse, "description": "Database unavailable"},
    },
)
async def list_warranties():
    """Get all warranties for the current user."""
    try:
        warranties = warranty_repo.list_warranties(DEMO_USER_ID)
        return WarrantyListResponse(items=warranties)
    except Exception as e:
        raise handle_db_error(e)


@router.get(
    "/{warranty_id}",
    response_model=WarrantyResponse,
    summary="Get a single warranty by ID",
    description="Returns a warranty record if it exists and belongs to the current user.",
    responses={
        200: {"description": "Warranty found"},
        404: {"model": ErrorResponse, "description": "Warranty not found"},
        503: {"model": ErrorResponse, "description": "Database unavailable"},
    },
)
async def get_warranty(warranty_id: str):
    """Get a single warranty by ID."""
    try:
        warranty = warranty_repo.get_warranty(warranty_id, DEMO_USER_ID)
        if not warranty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Warranty not found",
            )
        return warranty
    except HTTPException:
        raise
    except Exception as e:
        raise handle_db_error(e)


@router.post(
    "",
    response_model=WarrantyResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new warranty",
    description="Creates a new warranty record for the current user.",
    responses={
        201: {"description": "Warranty created"},
        409: {"model": ErrorResponse, "description": "Warranty ID conflict"},
        422: {"description": "Validation error"},
        503: {"model": ErrorResponse, "description": "Database unavailable"},
    },
)
async def create_warranty(warranty_data: WarrantyCreate):
    """Create a new warranty."""
    try:
        created = warranty_repo.create_warranty(warranty_data, DEMO_USER_ID)
        return created
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )
    except Exception as e:
        raise handle_db_error(e)


@router.put(
    "/{warranty_id}",
    response_model=WarrantyResponse,
    summary="Update an existing warranty",
    description="Updates a warranty record. Only provided fields are updated.",
    responses={
        200: {"description": "Warranty updated"},
        404: {"model": ErrorResponse, "description": "Warranty not found"},
        422: {"description": "Validation error"},
        503: {"model": ErrorResponse, "description": "Database unavailable"},
    },
)
async def update_warranty(warranty_id: str, warranty_data: WarrantyUpdate):
    """Update an existing warranty."""
    try:
        updated = warranty_repo.update_warranty(warranty_id, warranty_data, DEMO_USER_ID)
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Warranty not found",
            )
        return updated
    except HTTPException:
        raise
    except Exception as e:
        raise handle_db_error(e)


@router.delete(
    "/{warranty_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a warranty",
    description="Deletes a warranty record for the current user.",
    responses={
        204: {"description": "Warranty deleted"},
        404: {"model": ErrorResponse, "description": "Warranty not found"},
        503: {"model": ErrorResponse, "description": "Database unavailable"},
    },
)
async def delete_warranty(warranty_id: str):
    """Delete a warranty."""
    try:
        deleted = warranty_repo.delete_warranty(warranty_id, DEMO_USER_ID)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Warranty not found",
            )
    except HTTPException:
        raise
    except Exception as e:
        raise handle_db_error(e)


@router.post(
    "/sync-expiry-alerts",
    response_model=SyncExpiryAlertsResponse,
    summary="Scan all warranties and trigger 30-day expiry alerts",
    description="Evaluates all registered warranties and creates notifications for those expiring within 30 days.",
    responses={
        200: {"description": "Sync completed"},
        503: {"model": ErrorResponse, "description": "Database unavailable"},
    },
)
async def sync_expiry_alerts():
    """Scan warranties and create/persist expiry notifications in DynamoDB."""
    try:
        from datetime import datetime, timezone
        from app.utils.date_utils import calculate_remaining_days

        warranties = warranty_repo.list_warranties(DEMO_USER_ID)
        scanned = len(warranties)
        expiring_soon = 0
        new_alerts = 0
        created_notifications = []

        for w in warranties:
            days = calculate_remaining_days(w.warrantyExpiryDate)
            # In-window: expiring today (0) through 30 days out
            if 0 <= days <= 30:
                expiring_soon += 1

                # Deterministic ID per warranty + expiry date: re-scanning the
                # same warranty never creates duplicates (idempotent puts).
                notif_id = f"notif-exp-{w.id}-{w.warrantyExpiryDate}"

                if days == 0:
                    title = f"Warranty expires today: {w.productName}"
                elif days == 1:
                    title = f"Warranty expires in 1 day: {w.productName}"
                else:
                    title = f"Warranty expires in {days} days: {w.productName}"

                message = (
                    f"Your {w.brand} {w.productName} warranty expires on "
                    f"{w.warrantyExpiryDate}. Submit any repair or service requests "
                    f"before coverage lapses."
                )

                _notif, created = notification_repo.create_notification(
                    {
                        "warrantyId": w.id,
                        "productName": w.productName,
                        "brand": w.brand,
                        "type": "expiring_soon",
                        "title": title,
                        "message": message,
                        "daysRemaining": days,
                        "expiryDate": w.warrantyExpiryDate,
                        "createdAt": datetime.now(timezone.utc).isoformat(),
                        "isRead": False,
                    },
                    notification_id=notif_id,
                )
                if created:
                    new_alerts += 1
                    created_notifications.append(_notif)

        # Return the current full notification list (frontend uses res.notifications)
        all_notifications = notification_repo.list_notifications(DEMO_USER_ID)

        return SyncExpiryAlertsResponse(
            scannedCount=scanned,
            expiringSoonCount=expiring_soon,
            newAlertsCreated=new_alerts,
            notifications=all_notifications,
        )
    except Exception as e:
        raise handle_db_error(e)


@router.post(
    "/simulate-expiring",
    response_model=WarrantyResponse,
    summary="Create a simulated expiring warranty for testing",
    description="Creates a test warranty that expires within the specified days to trigger the 30-day alert.",
    responses={
        201: {"description": "Simulated warranty created"},
        503: {"model": ErrorResponse, "description": "Database unavailable"},
    },
)
async def simulate_expiring_warranty(request: SimulateExpiringRequest):
    """Create a simulated expiring warranty."""
    try:
        from datetime import datetime, timezone, timedelta
        import uuid
        
        product_name = request.productName or 'Sony PlayStation 5 DualSense Edge Controller'
        brand = request.brand or 'Sony Interactive'
        days_until_expiry = request.daysUntilExpiry or 21
        
        today = datetime.now(timezone.utc).date()
        expiry_date = today + timedelta(days=days_until_expiry)
        purchase_date = today - timedelta(days=344)
        
        from app.models.warranty import WarrantyCreate
        
        warranty_data = WarrantyCreate(
            productName=product_name,
            brand=brand,
            category='Electronics',
            seller='Best Buy Retail',
            invoiceNumber=f'INV-BB-{uuid.uuid4().hex[:6].upper()}',
            purchaseDate=purchase_date.isoformat(),
            purchasePrice=199.99,
            currency='USD',
            warrantyStartDate=purchase_date.isoformat(),
            warrantyDurationMonths=12,
            warrantyExpiryDate=expiry_date.isoformat(),
            serialNumber=f'PS5-CTRL-{uuid.uuid4().hex[:5].upper()}',
            coverageSummary='Sony 1-Year Limited Warranty covering stick drift, haptic triggers, and internal battery.',
            exclusions=['Accidental liquid spill', 'Severe drop damage', 'Unauthorized disassembly'],
            claimRequirements=['Original purchase receipt', 'Serial number confirmation'],
            claimContact={
                'phone': '1-800-345-7669',
                'url': 'https://support.playstation.com',
                'supportHours': 'Mon-Fri 9am-6pm PST',
            },
            documentIds=[],
        )
        
        created = warranty_repo.create_warranty(warranty_data, DEMO_USER_ID)
        return created
    except Exception as e:
        raise handle_db_error(e)