"""Health check endpoints."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.database.dynamodb import db
from app.config import settings


router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


class DatabaseHealthResponse(BaseModel):
    status: str
    table: str
    endpoint: str
    connected: bool


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Basic application health check."""
    return HealthResponse(
        status="healthy",
        service=settings.app_name,
        version=settings.app_version,
    )


@router.get("/api/v1/health", response_model=HealthResponse)
async def api_health_check():
    """Versioned API health check."""
    return HealthResponse(
        status="healthy",
        service=settings.app_name,
        version=settings.app_version,
    )


@router.get("/health/db", response_model=DatabaseHealthResponse)
async def database_health_check():
    """Database connectivity health check."""
    connected = db.check_connection()
    return DatabaseHealthResponse(
        status="healthy" if connected else "unhealthy",
        table=settings.dynamodb_table_name,
        endpoint=settings.dynamodb_endpoint_url,
        connected=connected,
    )