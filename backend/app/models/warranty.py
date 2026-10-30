"""Warranty Pydantic models matching frontend Warranty interface."""

from datetime import datetime
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict, field_validator


class ClaimContact(BaseModel):
    """Contact information for warranty claims."""
    phone: Optional[str] = None
    email: Optional[str] = None
    url: Optional[str] = None
    supportHours: Optional[str] = None


class WarrantyBase(BaseModel):
    """Base warranty fields shared by create/update/response."""
    productName: str = Field(..., min_length=1, max_length=200)
    brand: str = Field(..., min_length=1, max_length=100)
    category: str = Field(..., min_length=1, max_length=50)
    seller: str = Field(..., min_length=1, max_length=200)
    invoiceNumber: str = Field(..., min_length=1, max_length=100)
    purchaseDate: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    purchasePrice: float = Field(..., ge=0)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    warrantyStartDate: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    warrantyDurationMonths: int = Field(..., ge=1, le=120)
    warrantyExpiryDate: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    serialNumber: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = Field(None, max_length=1000)
    coverageSummary: Optional[str] = Field(None, max_length=2000)
    exclusions: Optional[List[str]] = Field(default_factory=list)
    claimRequirements: Optional[List[str]] = Field(default_factory=list)
    claimContact: Optional[ClaimContact] = None
    sourceWarrantyText: Optional[str] = Field(None, max_length=5000)
    documentIds: List[str] = Field(default_factory=list)

    @field_validator("purchaseDate", "warrantyStartDate", "warrantyExpiryDate", mode="before")
    @classmethod
    def validate_date_format(cls, v: str) -> str:
        """Ensure date is in YYYY-MM-DD format."""
        if isinstance(v, str):
            try:
                datetime.strptime(v, "%Y-%m-%d")
                return v
            except ValueError:
                raise ValueError("Date must be in YYYY-MM-DD format")
        return v


class WarrantyCreate(WarrantyBase):
    """Request model for creating a warranty."""
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "productName": "MacBook Pro 16\" M3 Max",
                "brand": "Apple",
                "category": "Computing",
                "seller": "Apple Store",
                "invoiceNumber": "INV-APL-901823",
                "purchaseDate": "2024-11-15",
                "purchasePrice": 3499.00,
                "currency": "USD",
                "warrantyStartDate": "2024-11-15",
                "warrantyDurationMonths": 36,
                "warrantyExpiryDate": "2027-11-15",
                "serialNumber": "C02GM909MD6T",
                "notes": "Configured with AppleCare+ 3-year extension",
                "coverageSummary": "Comprehensive hardware failure protection...",
                "exclusions": ["Cosmetic damage", "Theft"],
                "claimRequirements": ["Serial number", "Proof of purchase"],
                "claimContact": {
                    "phone": "1-800-275-2273",
                    "email": "support@apple.com",
                    "url": "https://support.apple.com/repair",
                    "supportHours": "24/7 Phone & Online Support"
                },
                "sourceWarrantyText": "AppleCare+ covers hardware repair...",
"documentIds": ["doc-1"]
            }
        }
    )
    


class WarrantyUpdate(BaseModel):
    """Request model for updating a warranty (all fields optional)."""
    productName: Optional[str] = Field(None, min_length=1, max_length=200)
    brand: Optional[str] = Field(None, min_length=1, max_length=100)
    category: Optional[str] = Field(None, min_length=1, max_length=50)
    seller: Optional[str] = Field(None, min_length=1, max_length=200)
    invoiceNumber: Optional[str] = Field(None, min_length=1, max_length=100)
    purchaseDate: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    purchasePrice: Optional[float] = Field(None, ge=0)
    currency: Optional[str] = Field(None, min_length=3, max_length=3)
    warrantyStartDate: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    warrantyDurationMonths: Optional[int] = Field(None, ge=1, le=120)
    warrantyExpiryDate: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    serialNumber: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = Field(None, max_length=1000)
    coverageSummary: Optional[str] = Field(None, max_length=2000)
    exclusions: Optional[List[str]] = None
    claimRequirements: Optional[List[str]] = None
    claimContact: Optional[ClaimContact] = None
    sourceWarrantyText: Optional[str] = Field(None, max_length=5000)
    documentIds: Optional[List[str]] = None

    @field_validator("purchaseDate", "warrantyStartDate", "warrantyExpiryDate", mode="before")
    @classmethod
    def validate_date_format(cls, v: Optional[str]) -> Optional[str]:
        """Ensure date is in YYYY-MM-DD format."""
        if v is not None and isinstance(v, str):
            try:
                datetime.strptime(v, "%Y-%m-%d")
                return v
            except ValueError:
                raise ValueError("Date must be in YYYY-MM-DD format")
        return v


class WarrantyResponse(WarrantyBase):
    """Response model for warranty (includes server-managed fields)."""
    id: str
    userId: str
    createdAt: str
    updatedAt: str

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "war-abc123",
                "userId": "user-demo-1",
                "productName": "MacBook Pro 16\" M3 Max",
                "brand": "Apple",
                "category": "Computing",
                "seller": "Apple Store",
                "invoiceNumber": "INV-APL-901823",
                "purchaseDate": "2024-11-15",
                "purchasePrice": 3499.00,
                "currency": "USD",
                "warrantyStartDate": "2024-11-15",
                "warrantyDurationMonths": 36,
                "warrantyExpiryDate": "2027-11-15",
                "serialNumber": "C02GM909MD6T",
                "notes": "Configured with AppleCare+ 3-year extension",
                "coverageSummary": "Comprehensive hardware failure protection...",
                "exclusions": ["Cosmetic damage", "Theft"],
                "claimRequirements": ["Serial number", "Proof of purchase"],
                "claimContact": {
                    "phone": "1-800-275-2273",
                    "email": "support@apple.com",
                    "url": "https://support.apple.com/repair",
                    "supportHours": "24/7 Phone & Online Support"
                },
                "sourceWarrantyText": "AppleCare+ covers hardware repair...",
                "documentIds": ["doc-1"],
                "createdAt": "2024-11-15T10:30:00Z",
                "updatedAt": "2024-11-15T10:30:00Z"
            }
        }
    )


class WarrantyListResponse(BaseModel):
    """Response model for listing warranties."""
    items: List[WarrantyResponse]


class ErrorResponse(BaseModel):
    """Standard error response."""
    detail: str
    model_config = ConfigDict(
        json_schema_extra={"example": {"detail": "Warranty not found"}}
    )


class WarrantyDocument(BaseModel):
    """Document model for S3 uploads."""
    id: str
    warrantyId: Optional[str] = None
    productName: Optional[str] = None
    fileName: str
    fileType: str
    fileSize: str
    uploadedAt: str
    previewUrl: Optional[str] = None
    isSample: bool = False
    rawTextExcerpt: Optional[str] = None
    status: Optional[str] = None  # uploaded, processing, needs_review, completed, failed
    progress: int = 0
    error_message: Optional[str] = None
    extracted_data: Optional[dict] = None


# ============================================================
# Document Processing Models (for Invoice OCR workflow)
# ============================================================

from enum import Enum


class DocumentStatus(str, Enum):
    """Document processing status."""
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    NEEDS_REVIEW = "needs_review"
    COMPLETED = "completed"
    FAILED = "failed"


class DocumentStatusResponse(BaseModel):
    """Document processing status response."""
    document_id: str
    status: DocumentStatus
    progress: int = 0  # 0-100
    message: Optional[str] = None
    error_message: Optional[str] = None
    extracted_data: Optional[dict] = None
    created_at: str
    updated_at: str


class ExtractedInvoiceData(BaseModel):
    """Extracted invoice data from OCR processing."""
    # Invoice fields
    merchant_name: Optional[str] = None
    invoice_number: Optional[str] = None
    purchase_date: Optional[str] = None
    product_name: Optional[str] = None
    brand: Optional[str] = None
    model_number: Optional[str] = None
    serial_number: Optional[str] = None
    quantity: Optional[int] = None
    purchase_price: Optional[float] = None
    currency: Optional[str] = None
    tax_amount: Optional[float] = None
    
    # Warranty fields
    warranty_duration: Optional[str] = None
    warranty_start_date: Optional[str] = None
    warranty_end_date: Optional[str] = None
    warranty_provider: Optional[str] = None
    warranty_terms: Optional[str] = None
    
    # Metadata
    raw_text: str = ""
    extraction_confidence: float = 0.0
    uncertain_fields: List[str] = Field(default_factory=list)
    is_uncertain: bool = False
    extraction_confidence: float = 0.0
    uncertain_fields: List[str] = Field(default_factory=list)
    
    # Processing metadata
    processing_status: str = "completed"
    error_message: Optional[str] = None
    processing_time_ms: int = 0
    pages_processed: int = 0
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "merchant_name": "Amazon India",
                "invoice_number": "INV-123456",
                "purchase_date": "2024-01-15",
                "product_name": "MacBook Pro 14",
                "brand": "Apple",
                "purchase_price": 149900.00,
                "currency": "INR",
                "warranty_duration": "1 year",
                "warranty_start_date": "2024-01-15",
                "warranty_end_date": "2025-01-15",
                "extraction_confidence": 0.85,
                "processing_status": "completed"
            }
        }
    )


class DocumentProcessRequest(BaseModel):
    """Request to start document processing."""
    document_id: str
    object_key: str
    content_type: str = "application/pdf"


class DocumentProcessResponse(BaseModel):
    """Response for document processing initiation."""
    document_id: str
    status: DocumentStatus
    message: str


class DocumentExtractionResponse(BaseModel):
    """Response with extracted data ready for review."""
    document_id: str
    status: DocumentStatus
    extracted_data: Optional[dict] = None
    message: str


class DocumentConfirmRequest(BaseModel):
    """Request to confirm and save extracted data as warranty."""
    document_id: str
    warranty_data: dict  # Validated warranty data from extracted fields
    confirm: bool = True


class DocumentConfirmResponse(BaseModel):
    """Response after confirming and creating warranty."""
    warranty_id: str
    document_id: str
    message: str