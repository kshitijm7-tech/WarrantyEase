"""Warranty service for DynamoDB operations."""

import uuid
from datetime import datetime, timezone
from typing import List, Optional, Any, Dict

from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError, EndpointConnectionError

from app.config import settings
from app.database.dynamodb import db
from app.models.warranty import (
    WarrantyCreate,
    WarrantyUpdate,
    WarrantyResponse,
    ErrorResponse,
)
import logging

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


class WarrantyRepository:
    """Repository for warranty data operations using DynamoDB."""

    def __init__(self, dynamo_client=None):
        self._client = dynamo_client or db
        self._table_name = self._client.get_table_name()
        self._dynamodb_client = None

    def _get_boto3_client(self):
        """Get the underlying boto3 client."""
        if self._dynamodb_client is None:
            self._dynamodb_client = self._client._get_client()
        return self._dynamodb_client

    def _get_resource(self):
        """Get boto3 resource for higher-level operations."""
        import boto3
        return boto3.resource(
            "dynamodb",
            endpoint_url=self._client._endpoint_url,
            region_name=self._client._region,
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
        )

    def _build_pk(self, user_id: str) -> str:
        """Build partition key for user."""
        return f"USER#{user_id}"

    def _build_sk(self, warranty_id: str) -> str:
        """Build sort key for warranty."""
        return f"WARRANTY#{warranty_id}"

    def _parse_warranty_id(self, sk: str) -> Optional[str]:
        """Extract warranty ID from sort key."""
        if sk.startswith("WARRANTY#"):
            return sk[9:]
        return None

    def _item_to_response(self, item: dict) -> WarrantyResponse:
        """Convert DynamoDB item to WarrantyResponse."""
        # Handle both plain dict and DynamoDB typed format
        plain = _deserialize_ddb_item(item) if any(isinstance(v, dict) and ("S" in v or "N" in v) for v in item.values()) else item
        return WarrantyResponse(
            id=self._parse_warranty_id(plain.get("SK", "")) or "",
            userId=plain.get("PK", "").split("#")[1] if "#" in plain.get("PK", "") else "",
            productName=plain.get("productName", ""),
            brand=plain.get("brand", ""),
            category=plain.get("category", ""),
            seller=plain.get("seller", ""),
            invoiceNumber=plain.get("invoiceNumber", ""),
            purchaseDate=plain.get("purchaseDate", ""),
            purchasePrice=plain.get("purchasePrice", 0.0),
            currency=plain.get("currency", "USD"),
            warrantyStartDate=plain.get("warrantyStartDate", ""),
            warrantyDurationMonths=plain.get("warrantyDurationMonths", 12),
            warrantyExpiryDate=plain.get("warrantyExpiryDate", ""),
            serialNumber=plain.get("serialNumber"),
            notes=plain.get("notes"),
            coverageSummary=plain.get("coverageSummary"),
            exclusions=plain.get("exclusions", []),
            claimRequirements=plain.get("claimRequirements", []),
            claimContact=plain.get("claimContact"),
            sourceWarrantyText=plain.get("sourceWarrantyText"),
            documentIds=plain.get("documentIds", []),
            createdAt=plain.get("createdAt", ""),
            updatedAt=plain.get("updatedAt", ""),
        )

    def list_warranties(self, user_id: str = DEMO_USER_ID) -> List[WarrantyResponse]:
        """List all warranties for a user."""
        try:
            client = self._get_boto3_client()
            pk = self._build_pk(user_id)
            sk_prefix = "WARRANTY#"

            response = client.query(
                TableName=self._table_name,
                KeyConditionExpression="PK = :pk AND begins_with(SK, :sk)",
                ExpressionAttributeValues={
                    ":pk": {"S": pk},
                    ":sk": {"S": sk_prefix},
                },
            )

            warranties = []
            for item in response.get("Items", []):
                warranties.append(self._item_to_response(item))

            return warranties

        except EndpointConnectionError:
            logger.error("DynamoDB endpoint unreachable")
            raise
        except ClientError as e:
            logger.error("DynamoDB error listing warranties: %s", e)
            raise
        except Exception as e:
            logger.exception("Unexpected error listing warranties: %s", e)
            raise

    def get_warranty(self, warranty_id: str, user_id: str = DEMO_USER_ID) -> Optional[WarrantyResponse]:
        """Get a single warranty by ID for a user."""
        try:
            client = self._get_boto3_client()
            pk = self._build_pk(user_id)
            sk = self._build_sk(warranty_id)

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
            logger.error("DynamoDB error getting warranty: %s", e)
            raise
        except Exception as e:
            logger.exception("Unexpected error getting warranty: %s", e)
            raise

    def create_warranty(self, data: WarrantyCreate, user_id: str = DEMO_USER_ID) -> WarrantyResponse:
        """Create a new warranty."""
        try:
            client = self._get_boto3_client()
            pk = self._build_pk(user_id)
            warranty_id = f"war-{uuid.uuid4().hex[:12]}"
            sk = self._build_sk(warranty_id)
            now_iso = datetime.now(timezone.utc).isoformat()

            item = {
                "PK": {"S": pk},
                "SK": {"S": sk},
                "productName": {"S": data.productName},
                "brand": {"S": data.brand},
                "category": {"S": data.category},
                "seller": {"S": data.seller},
                "invoiceNumber": {"S": data.invoiceNumber},
                "purchaseDate": {"S": data.purchaseDate},
                "purchasePrice": {"N": str(data.purchasePrice)},
                "currency": {"S": data.currency},
                "warrantyStartDate": {"S": data.warrantyStartDate},
                "warrantyDurationMonths": {"N": str(data.warrantyDurationMonths)},
                "warrantyExpiryDate": {"S": data.warrantyExpiryDate},
                "documentIds": {"L": [{"S": d} for d in data.documentIds]},
                "createdAt": {"S": now_iso},
                "updatedAt": {"S": now_iso},
            }

            # Add optional fields if present
            if data.serialNumber is not None:
                item["serialNumber"] = {"S": data.serialNumber}
            if data.notes is not None:
                item["notes"] = {"S": data.notes}
            if data.coverageSummary is not None:
                item["coverageSummary"] = {"S": data.coverageSummary}
            if data.exclusions is not None:
                item["exclusions"] = {"L": [{"S": e} for e in data.exclusions]}
            if data.claimRequirements is not None:
                item["claimRequirements"] = {"L": [{"S": r} for r in data.claimRequirements]}
            if data.claimContact is not None:
                contact = data.claimContact.model_dump(exclude_none=True)
                if contact:
                    item["claimContact"] = {"M": {k: {"S": v} for k, v in contact.items()}}
            if data.sourceWarrantyText is not None:
                item["sourceWarrantyText"] = {"S": data.sourceWarrantyText}

            # Use condition expression to prevent overwriting
            client.put_item(
                TableName=self._table_name,
                Item=item,
                ConditionExpression="attribute_not_exists(PK) AND attribute_not_exists(SK)",
            )

            return WarrantyResponse(
                id=warranty_id,
                userId=user_id,
                **data.model_dump(),
                createdAt=now_iso,
                updatedAt=now_iso,
            )

        except ClientError as e:
            if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                logger.error("Warranty ID already exists: %s", warranty_id)
                raise ValueError("Warranty with this ID already exists")
            if isinstance(e, EndpointConnectionError) or "EndpointConnectionError" in str(type(e)):
                logger.error("DynamoDB endpoint unreachable")
                raise
            logger.error("DynamoDB error creating warranty: %s", e)
            raise
        except EndpointConnectionError:
            logger.error("DynamoDB endpoint unreachable")
            raise
        except Exception as e:
            logger.exception("Unexpected error creating warranty: %s", e)
            raise

    def update_warranty(
        self, warranty_id: str, data: WarrantyUpdate, user_id: str = DEMO_USER_ID
    ) -> Optional[WarrantyResponse]:
        """Update an existing warranty."""
        try:
            client = self._get_boto3_client()
            pk = self._build_pk(user_id)
            sk = self._build_sk(warranty_id)

            # First check if item exists
            existing = client.get_item(
                TableName=self._table_name,
                Key={"PK": {"S": pk}, "SK": {"S": sk}},
            )
            if "Item" not in existing:
                return None

            # Build update expression
            update_parts = []
            expr_attr_values = {}
            expr_attr_names = {}
            now_iso = datetime.now(timezone.utc).isoformat()

            # Map fields to DynamoDB attributes
            field_mapping = {
                "productName": "productName",
                "brand": "brand",
                "category": "category",
                "seller": "seller",
                "invoiceNumber": "invoiceNumber",
                "purchaseDate": "purchaseDate",
                "purchasePrice": "purchasePrice",
                "currency": "currency",
                "warrantyStartDate": "warrantyStartDate",
                "warrantyDurationMonths": "warrantyDurationMonths",
                "warrantyExpiryDate": "warrantyExpiryDate",
                "serialNumber": "serialNumber",
                "notes": "notes",
                "coverageSummary": "coverageSummary",
                "exclusions": "exclusions",
                "claimRequirements": "claimRequirements",
                "claimContact": "claimContact",
                "sourceWarrantyText": "sourceWarrantyText",
                "documentIds": "documentIds",
            }

            update_data = data.model_dump(exclude_none=True)

            for field, attr_name in field_mapping.items():
                if field in update_data:
                    value = update_data[field]
                    attr_key = f"#{attr_name}"
                    val_key = f":{attr_name}"

                    # Handle different types
                    if field in ("purchasePrice", "warrantyDurationMonths"):
                        expr_attr_values[val_key] = {"N": str(value)}
                    elif field in ("exclusions", "claimRequirements", "documentIds"):
                        expr_attr_values[val_key] = {"L": [{"S": v} for v in value]}
                    elif field == "claimContact" and value is not None:
                        contact_dict = value.model_dump(exclude_none=True)
                        if contact_dict:
                            expr_attr_values[val_key] = {"M": {k: {"S": v} for k, v in contact_dict.items()}}
                        else:
                            continue
                    else:
                        expr_attr_values[val_key] = {"S": str(value)}

                    expr_attr_names[attr_key] = attr_name
                    update_parts.append(f"{attr_key} = {val_key}")

            if not update_parts:
                # No fields to update, just return existing
                return self.get_warranty(warranty_id, user_id)

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
            logger.error("DynamoDB error updating warranty: %s", e)
            raise
        except EndpointConnectionError:
            logger.error("DynamoDB endpoint unreachable")
            raise
        except Exception as e:
            logger.exception("Unexpected error updating warranty: %s", e)
            raise

    def delete_warranty(self, warranty_id: str, user_id: str = DEMO_USER_ID) -> bool:
        """Delete a warranty."""
        try:
            client = self._get_boto3_client()
            pk = self._build_pk(user_id)
            sk = self._build_sk(warranty_id)

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
            logger.error("DynamoDB error deleting warranty: %s", e)
            raise
        except EndpointConnectionError:
            logger.error("DynamoDB endpoint unreachable")
            raise
        except Exception as e:
            logger.exception("Unexpected error deleting warranty: %s", e)
            raise


# Singleton instance
warranty_repo = WarrantyRepository()