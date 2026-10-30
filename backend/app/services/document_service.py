"""Document service for DynamoDB operations."""

import logging
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Any, Dict

from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError, EndpointConnectionError

from app.config import settings
from app.database.dynamodb import db
from app.models.warranty import (
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
from app.services.warranty_service import warranty_repo, DEMO_USER_ID

logger = logging.getLogger(__name__)

# Demo user ID for development (matches frontend demo data)
DEMO_USER_ID = "user-demo-1"


def _deserialize_ddb_value(value: Any) -> Any:
    """Convert DynamoDB typed value to Python native value."""
    if not isinstance(value, dict):
        return value
    if "S" in value:
        return value["S"]
    if "N" in value:
        # Try int first, then float
        try:
            return int(value["N"])
        except ValueError:
            return float(value["N"])
    if "BOOL" in value:
        return value["BOOL"]
    if "L" in value:
        return [_deserialize_ddb_value(v) for v in value["L"]]
    if "M" in value:
        return {k: _deserialize_ddb_value(v) for k, v in value["M"].items()}
    if "NULL" in value:
        return None
    return value


def _deserialize_ddb_item(item: Dict[str, Any]) -> Dict[str, Any]:
    """Convert full DynamoDB item to plain dict."""
    return {k: _deserialize_ddb_value(v) for k, v in item.items()}


def _parse_document_id(sk: str) -> Optional[str]:
    """Extract document ID from sort key."""
    if sk.startswith("DOCUMENT#"):
        return sk[9:]
    return None


def _item_to_document_response(item: dict) -> WarrantyDocument:
    """Convert DynamoDB item to WarrantyDocument."""
    # Handle both plain dict and DynamoDB typed format
    plain = _deserialize_ddb_item(item) if any(
        isinstance(v, dict) and ("S" in v or "N" in v) for v in item.values()
    ) else item
    return WarrantyDocument(
        id=_parse_document_id(plain.get("SK", "")) or "",
        warrantyId=plain.get("warrantyId"),
        productName=plain.get("productName"),
        fileName=plain.get("fileName"),
        fileType=plain.get("fileType"),
        fileSize=plain.get("fileSize"),
        uploadedAt=plain.get("uploadedAt"),
        previewUrl=plain.get("previewUrl"),
        isSample=plain.get("isSample", False),
        rawTextExcerpt=plain.get("rawTextExcerpt"),
        status=plain.get("status"),
        progress=plain.get("progress", 0),
        error_message=plain.get("error_message"),
        extracted_data=plain.get("extracted_data"),
    )


class DocumentRepository:
    """Repository for document metadata operations using DynamoDB."""

    def __init__(self, dynamo_client=None):
        self._client = dynamo_client or db
        self._table_name = self._client.get_table_name()
        self._dynamodb_client = None

    def _get_boto3_client(self):
        """Get the underlying boto3 client."""
        if self._dynamodb_client is None:
            self._dynamodb_client = self._client._get_client()
        return self._dynamodb_client

    def _build_pk(self, user_id: str) -> str:
        """Build partition key for user."""
        return f"USER#{user_id}"

    def _build_sk(self, document_id: str) -> str:
        """Build sort key for document."""
        return f"DOCUMENT#{document_id}"

    def _parse_document_id(self, sk: str) -> Optional[str]:
        """Extract document ID from sort key."""
        if sk.startswith("DOCUMENT#"):
            return sk[9:]
        return None

    def _item_to_response(self, item: dict) -> dict:
        """Convert DynamoDB item to plain dict response."""
        plain = _deserialize_ddb_item(item) if any(
            isinstance(v, dict) and ("S" in v or "N" in v) for v in item.values()
        ) else item
        return {
            "id": self._parse_document_id(plain.get("SK", "")) or "",
            "warrantyId": plain.get("warrantyId"),
            "objectKey": plain.get("objectKey"),
            "productName": plain.get("productName"),
            "fileName": plain.get("fileName"),
            "fileType": plain.get("fileType"),
            "fileSize": plain.get("fileSize"),
            "uploadedAt": plain.get("uploadedAt"),
            "previewUrl": plain.get("previewUrl"),
            "isSample": plain.get("isSample", False),
            "rawTextExcerpt": plain.get("rawTextExcerpt"),
            "status": plain.get("status"),
            "progress": plain.get("progress", 0),
            "error_message": plain.get("error_message"),
            "extracted_data": plain.get("extracted_data"),
        }

    def list_documents(self, user_id: str = DEMO_USER_ID) -> List[dict]:
        """List all documents for a user."""
        try:
            client = self._get_boto3_client()
            pk = self._build_pk(user_id)
            sk_prefix = "DOCUMENT#"

            response = client.query(
                TableName=self._table_name,
                KeyConditionExpression="PK = :pk AND begins_with(SK, :sk)",
                ExpressionAttributeValues={
                    ":pk": {"S": pk},
                    ":sk": {"S": sk_prefix},
                },
            )

            documents = []
            for item in response.get("Items", []):
                documents.append(self._item_to_response(item))

            return documents

        except EndpointConnectionError:
            logger.error("DynamoDB endpoint unreachable")
            raise
        except ClientError as e:
            logger.error("DynamoDB error listing documents: %s", e)
            raise
        except Exception as e:
            logger.exception("Unexpected error listing documents: %s", e)
            raise

    def create_document(self, document_data: dict) -> dict:
        """Create a new document metadata record."""
        try:
            client = self._get_boto3_client()
            document_id = f"doc-{uuid.uuid4().hex[:12]}"
            sk = self._build_sk(document_id)
            now_iso = datetime.now(timezone.utc).isoformat()

            # Build the DynamoDB item
            item = {
                "PK": {"S": self._build_pk(document_data.get("userId", DEMO_USER_ID))},
                "SK": {"S": sk},
                "fileName": {"S": document_data["fileName"]},
                "fileType": {"S": document_data["fileType"]},
                "fileSize": {"S": document_data["fileSize"]},
                "uploadedAt": {"S": now_iso},
                # Coerce None to empty string - DynamoDB rejects {"S": None}
                "warrantyId": {"S": document_data.get("warrantyId") or ""},
                "productName": {"S": document_data.get("productName") or ""},
                "status": {"S": "uploaded"},
                "progress": {"N": "0"},
            }

            # Add optional fields if present
            if document_data.get("objectKey"):
                item["objectKey"] = {"S": document_data["objectKey"]}
            if document_data.get("rawTextExcerpt"):
                item["rawTextExcerpt"] = {"S": document_data["rawTextExcerpt"]}
            if document_data.get("extractedData"):
                import json
                item["extracted_data"] = {"S": json.dumps(document_data["extractedData"])}

            # Use condition expression to prevent overwriting
            client.put_item(
                TableName=self._table_name,
                Item=item,
                ConditionExpression="attribute_not_exists(PK) AND attribute_not_exists(SK)",
            )            # Return response with the document ID parsed from SK
            return {
                "id": document_id,
                "warrantyId": document_data.get("warrantyId"),
                "objectKey": document_data.get("objectKey"),
                "productName": document_data.get("productName", ""),
                "fileName": document_data["fileName"],
                "fileType": document_data["fileType"],
                "fileSize": document_data["fileSize"],
                "uploadedAt": now_iso,
                "previewUrl": None,
                "isSample": False,
                "rawTextExcerpt": document_data.get("rawTextExcerpt"),
                "status": "uploaded",
                "progress": 0,
                "error_message": None,
                "extracted_data": document_data.get("extractedData"),
            }

        except ClientError as e:
            if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                logger.error("Document ID already exists: %s", document_id)
                raise ValueError("Document with this ID already exists")
            if isinstance(e, EndpointConnectionError) or "EndpointConnectionError" in str(type(e)):
                logger.error("DynamoDB endpoint unreachable")
                raise
            logger.error("DynamoDB error creating document: %s", e)
            raise
        except EndpointConnectionError:
            logger.error("DynamoDB endpoint unreachable")
            raise
        except Exception as e:
            logger.exception("Unexpected error creating document: %s", e)
            raise

    def get_document(self, document_id: str, user_id: str = DEMO_USER_ID) -> Optional[dict]:
        """Get a single document by ID for a user."""
        try:
            client = self._get_boto3_client()
            pk = self._build_pk(user_id)
            sk = self._build_sk(document_id)

            response = client.get_item(
                TableName=self._table_name,
                Key={
                    "PK": {"S": pk},
                    "SK": {"S": sk},
                },
            )

            item = response.get("Item")
            if not item:
                return None

            return self._item_to_response(item)

        except EndpointConnectionError:
            logger.error("DynamoDB endpoint unreachable")
            raise
        except ClientError as e:
            logger.error("DynamoDB error getting document: %s", e)
            raise
        except Exception as e:
            logger.exception("Unexpected error getting document: %s", e)
            raise

    def update_document(self, document_id: str, updates: dict, user_id: str = DEMO_USER_ID) -> Optional[dict]:
        """Update a document's processing status and extracted data."""
        try:
            client = self._get_boto3_client()
            pk = self._build_pk(user_id)
            sk = self._build_sk(document_id)

            # First check if item exists
            existing = client.get_item(
                TableName=self._table_name,
                Key={"PK": {"S": pk}, "SK": {"S": sk}},
            )
            if "Item" not in existing:
                return None

            now_iso = datetime.now(timezone.utc).isoformat()
            update_parts = []
            expr_attr_values = {}
            expr_attr_names = {}

            # Map fields to DynamoDB attributes
            field_mapping = {
                "status": "status",
                "progress": "progress",
                "error_message": "error_message",
                "extracted_data": "extracted_data",
                "warrantyId": "warrantyId",
                "rawTextExcerpt": "rawTextExcerpt",
            }

            for field, attr_name in field_mapping.items():
                if field in updates:
                    value = updates[field]
                    attr_key = f"#{attr_name}"
                    val_key = f":{attr_name}"

                    if field == "progress":
                        expr_attr_values[val_key] = {"N": str(value)}
                    elif field == "extracted_data":
                        import json
                        expr_attr_values[val_key] = {"S": json.dumps(value)}
                    else:
                        expr_attr_values[val_key] = {"S": str(value)}

                    expr_attr_names[attr_key] = attr_name
                    update_parts.append(f"{attr_key} = {val_key}")

            if not update_parts:
                # No fields to update, just return existing
                return self.get_document(document_id, user_id)

            # Always update updatedAt
            update_parts.append("#updatedAt = :updatedAt")
            expr_attr_names["#updatedAt"] = "updatedAt"
            expr_attr_values[":updatedAt"] = {"S": now_iso}

            update_expr = "SET " + ", ".join(update_parts)

            response = client.update_item(
                TableName=self._table_name,
                Key={"PK": {"S": pk}, "SK": {"S": sk}},
                UpdateExpression=update_expr,
                ExpressionAttributeNames=expr_attr_names,
                ExpressionAttributeValues=expr_attr_values,
                ConditionExpression="attribute_exists(PK) AND attribute_exists(SK)",
                ReturnValues="ALL_NEW",
            )

            return self._item_to_response(response.get("Attributes", {}))

        except ClientError as e:
            if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                return None
            if isinstance(e, EndpointConnectionError) or "EndpointConnectionError" in str(type(e)):
                logger.error("DynamoDB endpoint unreachable")
                raise
            logger.error("DynamoDB error updating document: %s", e)
            raise
        except EndpointConnectionError:
            logger.error("DynamoDB endpoint unreachable")
            raise
        except Exception as e:
            logger.exception("Unexpected error updating document: %s", e)
            raise

    def delete_document(self, document_id: str, user_id: str = DEMO_USER_ID) -> bool:
        """Delete a document metadata record."""
        try:
            client = self._get_boto3_client()
            pk = self._build_pk(user_id)
            sk = self._build_sk(document_id)

            response = client.delete_item(
                TableName=self._table_name,
                Key={"PK": {"S": pk}, "SK": {"S": sk}},
                ConditionExpression="attribute_exists(PK) AND attribute_exists(SK)",
                ReturnValues="ALL_OLD",
            )

            return "Attributes" in response

        except ClientError as e:
            if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                return False
            if isinstance(e, EndpointConnectionError) or "EndpointConnectionError" in str(type(e)):
                logger.error("DynamoDB endpoint unreachable")
                raise
            logger.error("DynamoDB error deleting document: %s", e)
            raise
        except EndpointConnectionError:
            logger.error("DynamoDB endpoint unreachable")
            raise
        except Exception as e:
            logger.exception("Unexpected error deleting document: %s", e)
            raise


# Singleton instance
document_repo = DocumentRepository()