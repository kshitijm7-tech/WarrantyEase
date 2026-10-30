"""S3 router for document upload presigned URLs and invoice OCR processing."""

from fastapi import APIRouter, HTTPException, status, UploadFile, File, BackgroundTasks, Form
from pydantic import BaseModel
from typing import Optional, List
import logging

from botocore.exceptions import EndpointConnectionError

from app.services import s3, textract
from app.services.document_service import document_repo
from app.models.warranty import (
    ErrorResponse,
    WarrantyCreate,
    WarrantyResponse,
    WarrantyDocument,
    DocumentStatus,
    DocumentStatusResponse,
    DocumentProcessRequest,
    DocumentProcessResponse,
    DocumentExtractionResponse,
    DocumentConfirmRequest,
    DocumentConfirmResponse,
    ExtractedInvoiceData,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/documents", tags=["documents"])


class PresignedUploadRequest(BaseModel):
    object_key: str
    content_type: str = "application/pdf"
    expiration: int = 3600


class PresignedUploadResponse(BaseModel):
    upload_url: str
    bucket: str
    key: str
    expires_in: int


class PresignedDownloadResponse(BaseModel):
    download_url: str
    expires_in: int


class DocumentCreateRequest(BaseModel):
    fileName: str
    fileType: str
    fileSize: str
    warrantyId: Optional[str] = None
    objectKey: Optional[str] = None
    productName: Optional[str] = None
    rawTextExcerpt: Optional[str] = None
    status: Optional[str] = "uploaded"


class DocumentResponse(BaseModel):
    id: str
    fileName: str
    fileType: str
    fileSize: str
    uploadedAt: str
    warrantyId: Optional[str] = None
    objectKey: Optional[str] = None
    productName: Optional[str] = None
    rawTextExcerpt: Optional[str] = None
    isSample: bool = False
    status: Optional[str] = None
    progress: int = 0
    error_message: Optional[str] = None
    extracted_data: Optional[dict] = None


def _to_document_response(doc: dict) -> DocumentResponse:
    """Convert a repository dict into a DocumentResponse."""
    return DocumentResponse(
        id=doc["id"],
        fileName=doc["fileName"],
        fileType=doc["fileType"],
        fileSize=doc["fileSize"],
        uploadedAt=doc["uploadedAt"],
        warrantyId=doc.get("warrantyId"),
        objectKey=doc.get("objectKey"),
        productName=doc.get("productName"),
        rawTextExcerpt=doc.get("rawTextExcerpt"),
        isSample=doc.get("isSample", False) or False,
        status=doc.get("status"),
        progress=doc.get("progress", 0),
        error_message=doc.get("error_message"),
        extracted_data=doc.get("extracted_data"),
    )


def _parse_warranty_months(duration: Optional[str], default: int = 12) -> int:
    """Best-effort parse of a warranty duration like '2 years' or '24 months'."""
    if not duration:
        return default
    import re
    match = re.search(r"(\d+)", str(duration))
    if not match:
        return default
    value = int(match.group(1))
    if "year" in str(duration).lower():
        return value * 12
    return value


def _add_months_iso(iso_date: Optional[str], months: int) -> Optional[str]:
    """Add months to a YYYY-MM-DD date string without external dependencies."""
    if not iso_date:
        return None
    import calendar
    from datetime import date as _date
    try:
        d = _date.fromisoformat(str(iso_date)[:10])
    except ValueError:
        return iso_date
    m = d.month - 1 + months
    y = d.year + m // 12
    m = m % 12 + 1
    day = min(d.day, calendar.monthrange(y, m)[1])
    return f"{y:04d}-{m:02d}-{day:02d}"


@router.get(
    "",
    response_model=List[DocumentResponse],
    summary="List all documents",
    description="Returns all document records persisted in DynamoDB.",
    responses={
        200: {"description": "List of documents"},
        503: {"model": ErrorResponse, "description": "Service unavailable"},
    },
)
async def list_documents():
    """Get all documents from DynamoDB."""
    try:
        documents = document_repo.list_documents()
        return [_to_document_response(doc) for doc in documents]
    except Exception as e:
        logger.error("Failed to list documents: %s", e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service unavailable"
        )


@router.post(
    "",
    response_model=DocumentResponse,
    summary="Create document metadata",
    description="Create a document metadata record in DynamoDB (used after a direct S3 upload).",
    responses={
        200: {"description": "Document created"},
        400: {"model": ErrorResponse, "description": "Invalid request"},
        503: {"model": ErrorResponse, "description": "Service unavailable"},
    },
)
async def create_document(request: DocumentCreateRequest):
    """Create a document metadata record in DynamoDB."""
    try:
        new_doc = document_repo.create_document({
            "fileName": request.fileName,
            "fileType": request.fileType,
            "fileSize": request.fileSize,
            "userId": "user-demo-1",
            "warrantyId": request.warrantyId,
            "objectKey": request.objectKey,
            "productName": request.productName,
            "rawTextExcerpt": request.rawTextExcerpt,
            "status": request.status,
        })
        return _to_document_response(new_doc)
    except HTTPException:
        raise
    except EndpointConnectionError:
        logger.error("DynamoDB endpoint unreachable while creating document")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Document database is unavailable"
        )
    except Exception as e:
        logger.error("Failed to create document: %s", e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to persist document metadata"
        )


@router.post(
    "/presign-upload",
    response_model=PresignedUploadResponse,
    summary="Generate presigned upload URL",
    description="Generate a presigned URL for uploading a file directly to the private S3 bucket.",
    responses={
        200: {"description": "Presigned upload URL"},
        502: {"model": ErrorResponse, "description": "S3 unavailable"},
    },
)
async def presign_upload(request: PresignedUploadRequest):
    """Generate a presigned S3 upload URL."""
    try:
        result = s3.generate_presigned_upload_url(
            object_key=request.object_key,
            content_type=request.content_type,
            expiration=request.expiration,
        )
        return PresignedUploadResponse(**result)
    except EndpointConnectionError:
        logger.error("S3 endpoint unreachable while generating presigned upload URL")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="File storage is unavailable. Check AWS credentials and S3 connectivity."
        )
    except Exception as e:
        logger.error("Failed to generate presigned upload URL: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to generate upload URL"
        )


@router.get(
    "/presign-download/{object_key:path}",
    response_model=PresignedDownloadResponse,
    summary="Generate presigned download URL",
    description="Generate a presigned URL for downloading a file from the private S3 bucket.",
    responses={
        200: {"description": "Presigned download URL"},
        502: {"model": ErrorResponse, "description": "S3 unavailable"},
    },
)
async def presign_download(object_key: str, expiration: int = 3600):
    """Generate a presigned S3 download URL for a specific object key."""
    try:
        url = s3.generate_presigned_download_url(object_key, expiration=expiration)
        return PresignedDownloadResponse(download_url=url, expires_in=expiration)
    except EndpointConnectionError:
        logger.error("S3 endpoint unreachable while generating presigned download URL")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="File storage is unavailable. Check AWS credentials and S3 connectivity."
        )
    except Exception as e:
        logger.error("Failed to generate presigned download URL: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to generate download URL"
        )


@router.delete(
    "/{document_id}",
    summary="Delete a document",
    description="Delete a document metadata record and its associated S3 object (if any).",
    responses={
        200: {"description": "Document deleted"},
        404: {"model": ErrorResponse, "description": "Document not found"},
        503: {"model": ErrorResponse, "description": "Service unavailable"},
    },
)
async def delete_document(document_id: str):
    """Delete a document record (and only its own S3 object, if stored)."""
    try:
        doc = document_repo.get_document(document_id)
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )

        deleted = document_repo.delete_document(document_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )

        # Remove only this document's own S3 object (never a broad cleanup)
        object_key = doc.get("objectKey")
        if object_key:
            try:
                s3.delete_object(object_key)
            except Exception as e:
                # Metadata is already deleted; log the orphaned object honestly
                logger.warning("Document %s deleted but S3 object %s could not be removed: %s",
                               document_id, object_key, e)

        return {"message": "Document deleted", "id": document_id}
    except HTTPException:
        raise
    except EndpointConnectionError:
        logger.error("DynamoDB endpoint unreachable while deleting document")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Document database is unavailable"
        )
    except Exception as e:
        logger.error("Failed to delete document: %s", e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to delete document"
        )


@router.post(
    "/upload-invoice",
    summary="Upload and extract invoice data",
    description="Upload an invoice file for OCR extraction. Returns extracted warranty data.",
    responses={
        200: {"description": "Extracted invoice data"},
        400: {"model": ErrorResponse, "description": "Invalid file"},
        503: {"model": ErrorResponse, "description": "Service unavailable"},
    },
)
async def upload_invoice(file: UploadFile = File(...)):
    """Upload invoice file - extracts data using Textract OCR."""
    # Validate file type
    valid_extensions = ['pdf', 'png', 'jpg', 'jpeg']
    ext = file.filename.lower().split('.')[-1] if '.' in file.filename else ''
    if ext not in valid_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: .{ext}. Only PDF, PNG, and JPG are supported."
        )

    # Check file size (max 10MB)
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File exceeds the 10 MB limit."
        )

    content_type = file.content_type or 'application/pdf'

    # Generate a unique object key for S3
    import time
    import random
    timestamp = int(time.time())
    random_suffix = format(random.getrandbits(32), '08x')
    object_key = f"uploads/{timestamp}_{random_suffix}_{file.filename}"

    # Step 1: Create document metadata in DynamoDB (persists across restarts)
    try:
        new_doc = document_repo.create_document({
            "fileName": file.filename,
            "fileType": ext,
            "fileSize": str(len(content)),
            "userId": "user-demo-1",
            "objectKey": object_key,
        })
    except Exception as e:
        logger.error("Failed to create document metadata in DynamoDB: %s", e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to persist document metadata. Is DynamoDB Local running on port 8000?"
        )

    document_id = new_doc["id"]

    # Step 2: Upload the file to the private S3 bucket. Never claim success
    # unless the upload actually succeeded.
    try:
        s3.upload_file(content, object_key, content_type)
    except Exception as e:
        logger.error("S3 upload failed for %s: %s", object_key, e)
        # Roll back the metadata record so no phantom document is left behind
        try:
            document_repo.delete_document(document_id)
        except Exception:
            logger.warning("Rollback of document %s failed after S3 upload error", document_id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="File upload to storage failed. Nothing was saved - please try again."
        )

    # Step 3: Process with AWS Textract. OCR failure must not lose the document.
    extracted = None
    ocr_error = None
    try:
        extracted = textract.extract_text_from_document(
            content, file.filename, s3_bucket=s3._bucket, s3_key=object_key
        )
        if extracted.processing_status == "failed":
            ocr_error = extracted.error_message or "OCR processing failed"
    except Exception as e:
        logger.warning("Textract processing failed: %s", e)
        ocr_error = f"OCR processing unavailable: {e}"

    # Step 4: Persist extraction results and processing status
    doc_status = "failed"
    if extracted and not ocr_error:
        extracted_data_dict = {
            "merchant_name": extracted.merchant_name,
            "invoice_number": extracted.invoice_number,
            "purchase_date": extracted.purchase_date,
            "product_name": extracted.product_name,
            "brand": extracted.brand,
            "model_number": extracted.model_number,
            "serial_number": extracted.serial_number,
            "quantity": extracted.quantity,
            "purchase_price": extracted.purchase_price,
            "currency": extracted.currency,
            "tax_amount": extracted.tax_amount,
            "warranty_duration": extracted.warranty_duration,
            "warranty_start_date": extracted.warranty_start_date,
            "warranty_end_date": extracted.warranty_end_date,
            "warranty_provider": extracted.warranty_provider,
            "warranty_terms": extracted.warranty_terms,
            "raw_text": extracted.raw_text,
            "extraction_confidence": extracted.extraction_confidence,
            "uncertain_fields": extracted.uncertain_fields,
            "is_uncertain": extracted.is_uncertain,
            "processing_status": extracted.processing_status,
            "error_message": extracted.error_message,
            "processing_time_ms": extracted.processing_time_ms,
            "pages_processed": extracted.pages_processed,
        }
        try:
            update_payload = {
                "status": "needs_review",
                "progress": 100,
                "extracted_data": extracted_data_dict,
            }
            if extracted.raw_text:
                update_payload["rawTextExcerpt"] = extracted.raw_text[:1000]
            document_repo.update_document(document_id, update_payload)
            doc_status = "needs_review"
        except Exception as e:
            logger.error("Failed to persist extracted data for %s: %s", document_id, e)
            ocr_error = "Extracted data could not be saved to the database"
    else:
        try:
            document_repo.update_document(document_id, {
                "status": "failed",
                "progress": 100,
                "error_message": ocr_error,
            })
        except Exception as e:
            logger.error("Failed to persist OCR failure for %s: %s", document_id, e)

    # Step 5: Build a response in the frontend's ExtractedInvoiceResult shape.
    # When OCR failed, return empty (but correctly typed) fields so the user can
    # enter the details manually - never fabricate extracted values.
    from datetime import date as _date
    today = _date.today().isoformat()
    ok = bool(extracted and not ocr_error)
    start_date = (extracted.warranty_start_date or extracted.purchase_date or today) if ok else today
    months = _parse_warranty_months(extracted.warranty_duration) if ok else 12
    expiry_date = (extracted.warranty_end_date or _add_months_iso(start_date, months)) if ok else _add_months_iso(today, months)
    confidence = extracted.extraction_confidence if ok else 0.0
    raw_confidence = int(round(confidence * 100 if confidence <= 1.0 else confidence))
    size = len(content)
    file_size_formatted = (
        f"{size / (1024 * 1024):.1f} MB" if size > 1024 * 1024
        else f"{max(1, round(size / 1024))} KB"
    )

    return {
        "document_id": document_id,
        "status": doc_status,
        "processing_status": "completed" if ok else "failed",
        "error_message": ocr_error,
        "productName": (extracted.product_name or "") if ok else "",
        "brand": (extracted.brand or "") if ok else "",
        "category": "Other",
        "seller": (extracted.merchant_name or "") if ok else "",
        "invoiceNumber": (extracted.invoice_number or "") if ok else "",
        "purchaseDate": ((extracted.purchase_date or today)[:10]) if ok else today,
        "purchasePrice": float(extracted.purchase_price or 0) if ok else 0,
        "currency": (extracted.currency or "INR") if ok else "INR",
        "warrantyDurationMonths": months,
        "warrantyStartDate": (start_date[:10] if start_date else today),
        "warrantyExpiryDate": expiry_date,
        "serialNumber": extracted.serial_number if ok else None,
        "notes": extracted.warranty_terms if ok else None,
        "fileName": file.filename,
        "fileSize": file_size_formatted,
        "rawConfidence": raw_confidence,
    }


@router.post(
    "/process",
    response_model=DocumentProcessResponse,
    summary="Start document processing",
    description="Start OCR processing of an uploaded document.",
    responses={
        200: {"description": "Processing started"},
        404: {"model": ErrorResponse, "description": "Document not found"},
        503: {"model": ErrorResponse, "description": "Service unavailable"},
    },
)
async def process_document(request: DocumentProcessRequest, background_tasks: BackgroundTasks):
    """Start OCR processing of an uploaded document."""
    # Find the document in DynamoDB
    doc = document_repo.get_document(request.document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    if doc["status"] not in ["uploaded", "failed"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Document is not in a processable state (current: {doc['status']})"
        )

    # Update status to processing in DynamoDB
    document_repo.update_document(
        request.document_id,
        {"status": "processing", "progress": 0}
    )

    # Process in background
    background_tasks.add_task(process_document_background, request.document_id, request.object_key, request.content_type)

    return DocumentProcessResponse(
        document_id=request.document_id,
        status=DocumentStatus.PROCESSING,
        message="Document processing started"
    )


async def process_document_background(document_id: str, object_key: str, content_type: str):
    """Background task to process document with Textract."""
    # Find the document in DynamoDB
    doc = document_repo.get_document(document_id)
    if not doc:
        logger.error("Document %s not found during background processing", document_id)
        return

    try:
        # Get file from S3
        from app.services import s3
        s3_client = s3._get_client()
        response = s3_client.get_object(Bucket=s3._bucket, Key=object_key)
        file_content = response['Body'].read()

        # Process with Textract (use the stored file name for extension checks,
        # and the S3 object reference for any multi-page async job)
        extracted = textract.extract_text_from_document(
            file_content,
            doc.get("fileName") or object_key or f"file.{doc.get('fileType', 'pdf')}",
            s3_bucket=s3._bucket,
            s3_key=object_key,
        )

        if extracted.processing_status == "failed":
            # Update document status to failed in DynamoDB
            document_repo.update_document(document_id, {
                "status": "failed",
                "progress": 100,
                "error_message": extracted.error_message or "OCR processing failed"
            })
            return

        # Store extracted data in DynamoDB
        import json
        extracted_data_dict = {
            "merchant_name": extracted.merchant_name,
            "invoice_number": extracted.invoice_number,
            "purchase_date": extracted.purchase_date,
            "product_name": extracted.product_name,
            "brand": extracted.brand,
            "model_number": extracted.model_number,
            "serial_number": extracted.serial_number,
            "quantity": extracted.quantity,
            "purchase_price": extracted.purchase_price,
            "currency": extracted.currency,
            "tax_amount": extracted.tax_amount,
            "warranty_duration": extracted.warranty_duration,
            "warranty_start_date": extracted.warranty_start_date,
            "warranty_end_date": extracted.warranty_end_date,
            "warranty_provider": extracted.warranty_provider,
            "warranty_terms": extracted.warranty_terms,
            "raw_text": extracted.raw_text,
            "extraction_confidence": extracted.extraction_confidence,
            "uncertain_fields": extracted.uncertain_fields,
            "is_uncertain": extracted.is_uncertain,
            "processing_status": extracted.processing_status,
            "error_message": extracted.error_message,
            "processing_time_ms": extracted.processing_time_ms,
            "pages_processed": extracted.pages_processed,
        }

        document_repo.update_document(document_id, {
            "status": "needs_review",
            "progress": 100,
            "extracted_data": extracted_data_dict,
        })

    except Exception as e:
        logger.exception("Background document processing failed: %s", e)
        # Update document status to failed in DynamoDB
        document_repo.update_document(document_id, {
            "status": "failed",
            "progress": 100,
            "error_message": str(e)
        })


@router.get(
    "/{document_id}/status",
    response_model=DocumentStatusResponse,
    summary="Get document processing status",
    description="Get the current processing status of a document from DynamoDB.",
    responses={
        200: {"description": "Document status"},
        404: {"model": ErrorResponse, "description": "Document not found"},
        503: {"model": ErrorResponse, "description": "Service unavailable"},
    },
)
async def get_document_status(document_id: str):
    """Get document processing status from DynamoDB."""
    try:
        doc = document_repo.get_document(document_id)
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )

        return DocumentStatusResponse(
            document_id=doc["id"],
            status=DocumentStatus(doc["status"]) if doc.get("status") else DocumentStatus.UPLOADED,
            progress=doc.get("progress", 0),
            message="Processing complete" if doc.get("status") == "completed" else None,
            error_message=doc.get("error_message"),
            extracted_data=doc.get("extracted_data"),
            created_at=doc["uploadedAt"],
            updated_at=doc.get("updatedAt", doc["uploadedAt"]),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get document status: %s", e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service unavailable"
        )


@router.get(
    "/{document_id}/extracted",
    response_model=DocumentExtractionResponse,
    summary="Get extracted invoice data",
    description="Get extracted invoice data for review from DynamoDB.",
    responses={
        200: {"description": "Extracted data"},
        404: {"model": ErrorResponse, "description": "Document not found"},
        400: {"model": ErrorResponse, "description": "Document not ready for review"},
        503: {"model": ErrorResponse, "description": "Service unavailable"},
    },
)
async def get_extracted_data(document_id: str):
    """Get extracted invoice data for review from DynamoDB."""
    try:
        doc = document_repo.get_document(document_id)
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )

        if doc["status"] != "needs_review":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Document is not ready for review (status: {doc['status']})"
            )

        if not doc.get("extracted_data"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No extracted data available"
            )

        return DocumentExtractionResponse(
            document_id=doc["id"],
            status=DocumentStatus(doc["status"]),
            extracted_data=doc["extracted_data"],
            message="Extracted data ready for review"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get extracted data: %s", e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service unavailable"
        )


@router.post(
    "/confirm",
    response_model=DocumentConfirmResponse,
    summary="Confirm extracted data and create warranty",
    description="Confirm extracted invoice data and create a warranty record.",
    responses={
        200: {"description": "Warranty created"},
        404: {"model": ErrorResponse, "description": "Document not found"},
        400: {"model": ErrorResponse, "description": "Document not ready for confirmation"},
        503: {"model": ErrorResponse, "description": "Service unavailable"},
    },
)
async def confirm_document(request: DocumentConfirmRequest):
    """Confirm extracted data and create warranty record."""
    # Find the document in DynamoDB
    doc = document_repo.get_document(request.document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    if doc["status"] != "needs_review":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Document is not ready for confirmation (status: {doc['status']})"
        )

    if not request.confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confirmation required"
        )

    # Create warranty from extracted data
    warranty_data = request.warranty_data
    warranty_data["documentIds"] = [doc["id"]]
    warranty_data["userId"] = "user-demo-1"

    # Create warranty record
    from app.services.warranty_service import warranty_repo as warranty_repo_obj
    created = await warranty_repo_obj.create_warranty(warranty_data)

    # Update document status in DynamoDB - associate with warranty
    document_repo.update_document(request.document_id, {
        "status": "completed",
        "warrantyId": created.id,
        "progress": 100,
    })

    return DocumentConfirmResponse(
        warranty_id=created.id,
        document_id=doc["id"],
        message="Warranty created successfully from extracted invoice data"
    )