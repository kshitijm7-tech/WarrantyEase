"""Notifications router backed by DynamoDB (in-app expiry reminders)."""

from fastapi import APIRouter, HTTPException, status
from typing import List, Optional
from botocore.exceptions import EndpointConnectionError
from pydantic import BaseModel

from app.models.warranty import ErrorResponse
from app.services.notification_service import notification_repo
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])


class NotificationItem(BaseModel):
    id: str
    warrantyId: str
    productName: str
    brand: Optional[str] = None
    type: str
    title: str
    message: str
    daysRemaining: Optional[int] = None
    expiryDate: Optional[str] = None
    createdAt: str
    isRead: bool


def _handle_db_error(e: Exception) -> HTTPException:
    if isinstance(e, EndpointConnectionError) or "EndpointConnectionError" in str(type(e)):
        logger.error("DynamoDB connection failed: %s", e)
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service temporarily unavailable",
        )
    logger.exception("Notification database error: %s", e)
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="An internal error occurred",
    )


@router.get(
    "",
    response_model=List[NotificationItem],
    summary="List notifications",
    responses={
        200: {"description": "List of notifications"},
        503: {"model": ErrorResponse, "description": "Database unavailable"},
    },
)
async def list_notifications():
    """Get all notifications for the demo user from DynamoDB."""
    try:
        return notification_repo.list_notifications()
    except Exception as e:
        raise _handle_db_error(e)


@router.patch(
    "/{notification_id}/read",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Mark notification as read",
    responses={
        204: {"description": "Notification marked as read"},
        404: {"model": ErrorResponse, "description": "Notification not found"},
        503: {"model": ErrorResponse, "description": "Database unavailable"},
    },
)
async def mark_notification_read(notification_id: str):
    """Mark a single notification as read."""
    try:
        updated = notification_repo.mark_read(notification_id)
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found",
            )
    except HTTPException:
        raise
    except Exception as e:
        raise _handle_db_error(e)


@router.post(
    "/read-all",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Mark all notifications as read",
    responses={
        204: {"description": "All notifications marked as read"},
        503: {"model": ErrorResponse, "description": "Database unavailable"},
    },
)
async def mark_all_notifications_read():
    """Mark every notification as read."""
    try:
        notification_repo.mark_all_read()
    except Exception as e:
        raise _handle_db_error(e)


@router.delete(
    "/{notification_id}",
    summary="Clear notification",
    responses={
        200: {"description": "Notification cleared"},
        404: {"model": ErrorResponse, "description": "Notification not found"},
        503: {"model": ErrorResponse, "description": "Database unavailable"},
    },
)
async def clear_notification(notification_id: str):
    """Delete a single notification."""
    try:
        deleted = notification_repo.delete_notification(notification_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found",
            )
        return True
    except HTTPException:
        raise
    except Exception as e:
        raise _handle_db_error(e)
