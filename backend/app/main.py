"""WarrantyEase API - FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database.dynamodb import db
from app.routers import health, warranties, documents, notifications, preferences, assistant, admin


# Configure logging
logging.basicConfig(
    level=logging.INFO if settings.debug else logging.WARNING,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info("Starting %s v%s in %s mode", settings.app_name, settings.app_version, settings.app_env)
    logger.info("DynamoDB endpoint: %s", settings.dynamodb_endpoint_url)
    logger.info("DynamoDB table: %s", settings.dynamodb_table_name)
    logger.info("Frontend origins: %s", settings.frontend_origins)

    # Attempt to create dev table (non-blocking)
    if settings.app_env == "development":
        logger.info("Attempting to create/verify development table...")
        success = db.create_dev_table()
        if success:
            logger.info("Development table ready")
        else:
            logger.warning("Development table not created (DynamoDB may be unavailable)")
            logger.warning("Application will start but database operations will fail until DynamoDB is running")

    yield

    # Shutdown
    logger.info("Shutting down %s", settings.app_name)


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Backend API for WarrantyEase - Personal Warranty & Document Management",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router)
app.include_router(warranties.router)
app.include_router(documents.router)
app.include_router(notifications.router)
app.include_router(preferences.router)
app.include_router(assistant.router)
app.include_router(admin.router)


@app.get("/")
async def root():
    """Root endpoint with service info."""
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/health",
        "db_health": "/health/db",
    }