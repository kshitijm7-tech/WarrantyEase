"""AWS Textract service for invoice OCR processing.

Uses the Textract *AnalyzeExpense* API to extract structured invoice/receipt
fields (vendor, invoice number, dates, totals, line items) plus raw text.

- Images (PNG/JPG/JPEG) and single-page PDF/TIFF use the synchronous
  ``analyze_expense`` API with the document bytes.
- Multi-page PDF/TIFF fall back to the asynchronous ``start_expense_analysis``
  API, which requires the document to live in S3 (Textract reads it directly).
"""

import re
import time
import logging
from typing import Optional, List
from datetime import datetime
from dataclasses import dataclass, field

import boto3
from botocore.exceptions import ClientError, EndpointConnectionError, BotoCoreError, NoCredentialsError

from app.config import settings

logger = logging.getLogger(__name__)


@dataclass
class ExtractedField:
    """Represents an extracted field with confidence and source location."""
    value: str
    confidence: float
    source_text: str = ""
    is_uncertain: bool = False


@dataclass
class ExtractedInvoiceData:
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
    uncertain_fields: List[str] = field(default_factory=list)
    is_uncertain: bool = False

    # Processing metadata
    processing_status: str = "completed"
    error_message: Optional[str] = None
    processing_time_ms: int = 0
    pages_processed: int = 0


class TextractService:
    """AWS Textract service for invoice OCR processing (AnalyzeExpense)."""

    SUPPORTED_FORMATS = ['pdf', 'png', 'jpg', 'jpeg', 'tiff', 'tif']
    MAX_FILE_SIZE_MB = 10
    MAX_PAGES_SYNC = 1          # Sync AnalyzeExpense limit: single page
    POLL_INTERVAL_SECONDS = 3
    MAX_POLL_SECONDS = 120      # Async job timeout

    def __init__(self):
        self._textract_client = None
        self._region = settings.aws_region
        self._profile = settings.aws_profile

    def _get_client(self):
        """Get or create Textract client using the configured AWS profile/credentials."""
        if self._textract_client is None:
            try:
                session = boto3.Session(profile_name=self._profile) if self._profile else boto3.Session()
                credentials = session.get_credentials()
                if credentials is None:
                    raise NoCredentialsError(
                        f"No AWS credentials found for profile '{self._profile or 'default'}'"
                    )
                frozen = credentials.get_frozen_credentials()
                self._textract_client = boto3.client(
                    'textract',
                    region_name=self._region,
                    aws_access_key_id=frozen.access_key,
                    aws_secret_access_key=frozen.secret_key,
                    aws_session_token=frozen.token,
                )
            except (EndpointConnectionError, NoCredentialsError):
                raise
            except Exception as e:
                logger.error("Failed to create Textract client: %s", e)
                raise
        return self._textract_client

    def check_connection(self) -> bool:
        """Best-effort check that a Textract client can be constructed."""
        try:
            self._get_client()
            return True
        except EndpointConnectionError:
            logger.warning("Textract endpoint unreachable")
            return False
        except Exception as e:
            logger.warning("Textract connection check failed: %s", e)
            return False

    def validate_file(self, file_content: bytes, filename: str) -> tuple:
        """Validate file type and size."""
        if len(file_content) > self.MAX_FILE_SIZE_MB * 1024 * 1024:
            return False, f"File exceeds {self.MAX_FILE_SIZE_MB} MB limit"
        ext = filename.lower().split('.')[-1] if '.' in filename else ''
        if ext not in self.SUPPORTED_FORMATS:
            return False, f"Unsupported file type: .{ext}. Supported: {', '.join(self.SUPPORTED_FORMATS)}"
        return True, None

    # ------------------------------------------------------------------ #
    # Entry point
    # ------------------------------------------------------------------ #
    def extract_text_from_document(
        self,
        file_content: bytes,
        filename: str,
        s3_bucket: Optional[str] = None,
        s3_key: Optional[str] = None,
    ) -> ExtractedInvoiceData:
        """Extract invoice text + fields using Textract AnalyzeExpense.

        Returns an ``ExtractedInvoiceData`` whose ``processing_status`` is
        ``completed`` on success or ``failed`` with a human-readable
        ``error_message`` on failure. Never fabricates data on failure.
        """
        start_time = datetime.now()
        result = ExtractedInvoiceData()

        try:
            is_valid, error = self.validate_file(file_content, filename)
            if not is_valid:
                result.processing_status = "failed"
                result.error_message = error
                return result

            client = self._get_client()
            ext = filename.lower().rsplit('.', 1)[-1]
            is_multipage_type = ext in ('pdf', 'tiff', 'tif')

            # Primary: synchronous AnalyzeExpense with bytes (works for images
            # and single-page PDF/TIFF).
            try:
                response = client.analyze_expense(Document={'Bytes': file_content})
                self._apply_expense_response(response, result)
            except ClientError as sync_err:
                code = sync_err.response.get('Error', {}).get('Code', '')
                msg = sync_err.response.get('Error', {}).get('Message', str(sync_err))
                multi_page_hint = code == 'InvalidParameterException' and (
                    'page' in msg.lower() or 'single' in msg.lower())
                if is_multipage_type and multi_page_hint and s3_bucket and s3_key:
                    # Fallback: asynchronous expense analysis from S3.
                    logger.info("Sync AnalyzeExpense rejected multi-page doc; using async S3 job")
                    self._analyze_expense_async_s3(client, s3_bucket, s3_key, result)
                else:
                    raise

            if result.processing_status != "failed":
                result.processing_status = "completed"

        except ClientError as e:
            logger.error("Textract AnalyzeExpense error for '%s': %s", filename, e)
            result.processing_status = "failed"
            result.error_message = self._error_to_message(e)
        except EndpointConnectionError as e:
            logger.error("Textract endpoint unreachable: %s", e)
            result.processing_status = "failed"
            result.error_message = "Could not reach AWS Textract (network/endpoint)."
        except NoCredentialsError as e:
            logger.error("No AWS credentials for Textract: %s", e)
            result.processing_status = "failed"
            result.error_message = "No AWS credentials configured for Textract."
        except Exception as e:
            logger.exception("Unexpected OCR error for '%s': %s", filename, e)
            result.processing_status = "failed"
            result.error_message = f"OCR processing error: {e}"

        result.processing_time_ms = int((datetime.now() - start_time).total_seconds() * 1000)
        return result

    # ------------------------------------------------------------------ #
    # Textract API wrappers
    # ------------------------------------------------------------------ #
    def _analyze_expense_async_s3(self, client, bucket: str, key: str,
                                  result: ExtractedInvoiceData) -> None:
        """Run asynchronous expense analysis on an S3 object and poll for results."""
        start = client.start_expense_analysis(DocumentLocation={'S3Object': {'Bucket': bucket, 'Name': key}})
        job_id = start['JobId']
        logger.info("Started Textract expense job %s for s3://%s/%s", job_id, bucket, key)

        deadline = time.time() + self.MAX_POLL_SECONDS
        job_status = None
        while time.time() < deadline:
            resp = client.get_expense_analysis(JobId=job_id)
            job_status = resp.get('JobStatus')
            if job_status == 'SUCCEEDED':
                self._collect_async_expense_pages(client, job_id, resp, result)
                return
            if job_status == 'FAILED':
                status_msg = resp.get('StatusMessage', 'Textract job failed')
                logger.error("Textract expense job %s FAILED: %s", job_id, status_msg)
                result.processing_status = "failed"
                result.error_message = f"Textract job failed: {status_msg}"
                return
            time.sleep(self.POLL_INTERVAL_SECONDS)

        result.processing_status = "failed"
        result.error_message = (f"Textract job {job_id} did not finish within "
                                f"{self.MAX_POLL_SECONDS}s (last status: {job_status}).")

    def _collect_async_expense_pages(self, client, job_id: str, first_page: dict,
                                     result: ExtractedInvoiceData) -> None:
        """Aggregate all paginated results of a succeeded async expense job."""
        expense_docs = list(first_page.get('ExpenseDocuments', []))
        blocks = list(first_page.get('Blocks', []))
        next_token = first_page.get('NextToken')
        while next_token:
            page = client.get_expense_analysis(JobId=job_id, NextToken=next_token)
            expense_docs.extend(page.get('ExpenseDocuments', []))
            blocks.extend(page.get('Blocks', []))
            next_token = page.get('NextToken')

        # Synthesize a response dict so the same mapping code can run.
        synthetic = {'ExpenseDocuments': expense_docs, 'Blocks': blocks}
        self._apply_expense_response(synthetic, result)

    # ------------------------------------------------------------------ #
    # Response mapping
    # ------------------------------------------------------------------ #
    def _apply_expense_response(self, response: dict, result: ExtractedInvoiceData) -> None:
        """Map an AnalyzeExpense response (sync or async) onto the result."""
        blocks = response.get('Blocks', [])
        result.pages_processed = max(
            (b.get('Page', 1) for b in blocks), default=1)
        result.raw_text = '\n'.join(
            b['Text'] for b in blocks if b.get('BlockType') == 'LINE' and b.get('Text'))

        confidences = [b['Confidence'] for b in blocks if 'Confidence' in b]
        ocr_confidence = sum(confidences) / len(confidences) if confidences else 0.0

        # Structured summary fields (reliable) from expense documents.
        for exp_doc in response.get('ExpenseDocuments', []):
            self._map_summary_fields(exp_doc.get('SummaryFields', []), result)
            self._map_line_items(exp_doc.get('LineItemGroups', []), result)

        # Regex fallback fills any gaps (brand/model/serial/warranty, which
        # AnalyzeExpense does not return as summary fields).
        self._extract_structured_data(result)

        # Detect currency if still unknown from raw text.
        if not result.currency:
            result.currency = self._detect_currency(result.raw_text)

        result.extraction_confidence = round(ocr_confidence, 4)
        self._mark_uncertain_fields(result)

    def _map_summary_fields(self, summary_fields: List[dict], result: ExtractedInvoiceData) -> None:
        for f in summary_fields:
            ftype = (f.get('Type') or '').upper()
            value = (f.get('ValueDetection', {}) or {}).get('Text') or \
                    (f.get('LabelDetection', {}) or {}).get('Text')
            if not value:
                continue
            value = value.strip()
            if ftype == 'VENDOR_NAME' and not result.merchant_name:
                result.merchant_name = value
            elif ftype == 'INVOICE_NUMBER' and not result.invoice_number:
                result.invoice_number = value
            elif ftype == 'INVOICE_DATE' and not result.purchase_date:
                result.purchase_date = self._to_iso_date(value) or value
            elif ftype in ('TOTAL', 'GRAND_TOTAL') and result.purchase_price is None:
                amount = self._parse_amount(value)
                if amount is not None:
                    result.purchase_price = amount
            elif ftype == 'TAX' and result.tax_amount is None:
                amount = self._parse_amount(value)
                if amount is not None:
                    result.tax_amount = amount

    def _map_line_items(self, groups: List[dict], result: ExtractedInvoiceData) -> None:
        for group in groups:
            for item in group.get('LineItems', []):
                for fld in item.get('LineItemExpenseFields', []):
                    ftype = (fld.get('Type') or '').upper()
                    value = (fld.get('ValueDetection', {}) or {}).get('Text')
                    if not value:
                        continue
                    value = value.strip()
                    if ftype in ('PRODUCT_NAME', 'ITEM', 'DESCRIPTION') and not result.product_name:
                        result.product_name = value
                    elif ftype == 'QUANTITY' and result.quantity is None:
                        try:
                            result.quantity = int(float(value))
                        except ValueError:
                            pass

    # ------------------------------------------------------------------ #
    # Small parsers
    # ------------------------------------------------------------------ #
    @staticmethod
    def _parse_amount(text: str) -> Optional[float]:
        m = re.search(r'[-+]?\d[\d,]*\.?\d*', text)
        if not m:
            return None
        try:
            return float(m.group(0).replace(',', ''))
        except ValueError:
            return None

    @staticmethod
    def _to_iso_date(text: str) -> Optional[str]:
        text = text.strip()
        fmts = ['%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%m/%d/%Y',
                '%d %b %Y', '%d %B %Y', '%b %d, %Y', '%B %d, %Y']
        for fmt in fmts:
            try:
                return datetime.strptime(text, fmt).strftime('%Y-%m-%d')
            except ValueError:
                continue
        m = re.search(r'(\d{4})-(\d{2})-(\d{2})', text)
        return m.group(0) if m else None

    @staticmethod
    def _detect_currency(text: str) -> Optional[str]:
        if re.search(r'₹|\bRs\.?\b|\bINR\b', text):
            return 'INR'
        if re.search(r'\$|\bUSD\b', text):
            return 'USD'
        if re.search(r'€|\bEUR\b', text):
            return 'EUR'
        if re.search(r'£|\bGBP\b', text):
            return 'GBP'
        return None

    @staticmethod
    def _error_to_message(e: ClientError) -> str:
        """Turn a Textract ClientError into an actionable, non-fatal message."""
        code = e.response.get('Error', {}).get('Code', '')
        msg = e.response.get('Error', {}).get('Message', str(e))
        if code == 'SubscriptionRequiredException':
            return ("AWS Textract is not enabled for this account/region. "
                    "Enable Textract in the AWS console (one-time), then retry.")
        if code in ('AccessDeniedException', 'UnauthorizedOperation'):
            return ("Not authorized to use AWS Textract. Check IAM permissions "
                    "(textract:AnalyzeExpense, textract:StartExpenseAnalysis, "
                    f"textract:GetExpenseAnalysis). Detail: {msg}")
        if code in ('ExpiredTokenException', 'InvalidSignatureException',
                    'UnrecognizedClientException', 'InvalidClientTokenId'):
            return "AWS credentials are invalid or expired. Refresh the profile credentials."
        if code == 'UnsupportedDocumentException':
            return f"Textract does not support this document: {msg}"
        if code in ('ProvisionedThroughputExceededException', 'ThrottlingException',
                    'LimitExceededException'):
            return "Textract is rate-limiting requests right now. Please retry shortly."
        if code == 'InvalidParameterException':
            return f"Textract rejected the document: {msg}"
        if code == 'InvalidDocumentException':
            return f"Textract could not read the document: {msg}"
        return f"Textract error ({code}): {msg}"

    # ------------------------------------------------------------------ #
    # Regex fallback (fills gaps only)
    # ------------------------------------------------------------------ #
    def _extract_structured_data(self, result: ExtractedInvoiceData) -> None:
        """Extract fields from raw text, only filling fields not already set."""
        text = result.raw_text or ""
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        if not lines:
            return

        if not result.merchant_name:
            self._extract_merchant_name(result, lines)
        if not result.invoice_number:
            self._extract_invoice_number(result, lines)
        if not result.purchase_date:
            self._extract_dates(result, lines)
        if not result.product_name:
            self._extract_product_info(result, lines)
        if result.purchase_price is None:
            self._extract_price_info(result, lines)
        if not result.serial_number:
            self._extract_serial_number(result, lines)
        self._extract_warranty_info(result, lines)

    def _extract_merchant_name(self, result, lines):
        for line in lines[:10]:
            line_lower = line.lower()
            if any(skip in line_lower for skip in
                   ['invoice', 'date', 'address', 'phone', 'email', 'gst', 'gstin']):
                continue
            if len(line) > 3 and not re.match(r'^[\d\s\-\/\\]+$', line):
                result.merchant_name = line.strip()
                break

    def _extract_invoice_number(self, result, lines):
        patterns = [
            r'invoice\s*[#:no\.]*\s*([A-Z0-9\-\/]+)',
            r'inv[.\s#:]*([A-Z0-9\-\/]+)',
            r'bill\s*[#:no\.]*\s*([A-Z0-9\-\/]+)',
            r'order\s*[#:no\.]*\s*([A-Z0-9\-\/]+)',
        ]
        for line in lines:
            for pattern in patterns:
                match = re.search(pattern, line, re.IGNORECASE)
                if match:
                    result.invoice_number = match.group(1).strip()
                    return

    def _extract_dates(self, result, lines):
        date_patterns = [
            r'(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})',
            r'(\d{4})[\-\/](\d{1,2})[\-\/](\d{1,2})',
            r'(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{4})',
        ]
        found_dates = []
        for line in lines:
            for pattern in date_patterns:
                for match in re.finditer(pattern, line, re.IGNORECASE):
                    iso = self._to_iso_date(match.group(0))
                    if iso and iso not in found_dates:
                        found_dates.append(iso)
        if found_dates:
            result.purchase_date = result.purchase_date or found_dates[0]

    def _extract_product_info(self, result, lines):
        for line in lines:
            line_lower = line.lower()
            if 'brand' in line_lower or 'make' in line_lower:
                parts = re.split(r'[:]\s*', line, 1)
                if len(parts) > 1 and not result.brand:
                    result.brand = parts[1].strip()
            if 'model' in line_lower:
                parts = re.split(r'[:]\s*', line, 1)
                if len(parts) > 1 and not result.model_number:
                    result.model_number = parts[1].strip()
            if not result.product_name and 10 < len(line) < 100:
                if not any(skip in line_lower for skip in
                           ['invoice', 'date', 'address', 'phone', 'gst', 'tax', 'total', 'amount']):
                    if re.search(r'[A-Za-z]{3,}', line) and not re.match(r'^[\d\s\-\/\.]+$', line):
                        result.product_name = line.strip()

    def _extract_price_info(self, result, lines):
        currency_patterns = {
            'INR': [r'₹\s*(\d[\d,]*)', r'Rs\.?\s*(\d[\d,]*)', r'INR\s*(\d[\d,]*)'],
            'USD': [r'\$\s*(\d[\d,]*)', r'USD\s*(\d[\d,]*)'],
        }
        for line in lines:
            if any(kw in line.lower() for kw in ['total', 'amount', 'price', 'grand total', 'net amount']):
                for currency, patterns in currency_patterns.items():
                    for pattern in patterns:
                        match = re.search(pattern, line)
                        if match:
                            amount = self._parse_amount(match.group(1))
                            if amount is not None:
                                result.purchase_price = amount
                                result.currency = result.currency or currency
                                return

    def _extract_serial_number(self, result, lines):
        patterns = [
            r'serial\s*[#:no\.]*\s*([A-Z0-9\-\/]+)',
            r'sr\.?\s*[#:no\.]*\s*([A-Z0-9\-\/]+)',
            r'sl\.?\s*[#:no\.]*\s*([A-Z0-9\-\/]+)',
        ]
        for line in lines:
            for pattern in patterns:
                match = re.search(pattern, line, re.IGNORECASE)
                if match:
                    result.serial_number = match.group(1).strip()
                    return

    def _extract_warranty_info(self, result, lines):
        warranty_keywords = ['warranty', 'guarantee', 'guaranty', 'warrenty']
        for line in lines:
            line_lower = line.lower()
            if not any(kw in line_lower for kw in warranty_keywords):
                continue
            duration_match = re.search(r'(\d+)\s*(year|yr|month|mon)s?', line_lower)
            if duration_match and not result.warranty_duration:
                num = int(duration_match.group(1))
                unit = duration_match.group(2)
                if unit.startswith(('year', 'yr')):
                    result.warranty_duration = f"{num} year{'s' if num > 1 else ''}"
                else:
                    result.warranty_duration = f"{num} month{'s' if num > 1 else ''}"
            if any(kw in line_lower for kw in ['expire', 'expiry', 'valid till', 'valid until']):
                for pattern in [r'(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})',
                                r'(\d{4})[\-\/](\d{1,2})[\-\/](\d{1,2})']:
                    match = re.search(pattern, line)
                    if match and not result.warranty_end_date:
                        iso = self._to_iso_date(match.group(0))
                        if iso:
                            result.warranty_end_date = iso

    def _mark_uncertain_fields(self, result) -> None:
        """Mark missing fields as uncertain (does NOT overwrite OCR confidence)."""
        checks = {
            'merchant_name': result.merchant_name,
            'invoice_number': result.invoice_number,
            'purchase_date': result.purchase_date,
            'product_name': result.product_name,
            'brand': result.brand,
            'purchase_price': result.purchase_price,
            'serial_number': result.serial_number,
            'warranty_duration': result.warranty_duration,
            'warranty_end_date': result.warranty_end_date,
        }
        uncertain = [name for name, val in checks.items() if not val]
        result.uncertain_fields = uncertain
        result.is_uncertain = len(uncertain) > 4


# Singleton instance
textract = TextractService()
