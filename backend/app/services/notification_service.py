"""Notification service for DynamoDB operations (in-app expiry reminders)."""

import uuid
import logging
from datetime import datetime, timezone
from typing import List, Optional, Any, Dict

from botocore.exceptions import ClientError, EndpointConnectionError

from app.database.dynamodb import db

logger = logging.getLogger(__name__)

DEMO_USER_ID = "user-demo-1"


def _deserialize_ddb_value(value: Any) -> Any:
    if not isinstance(value, dict):
        return value
    if "S" in value:
        return value["S"]
    if "N" in value:
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
    return {k: _deserialize_ddb_value(v) for k, v in item.items()}


class NotificationRepository:
    """Repository for in-app notification records in DynamoDB.

    Uses the existing WarrantyEase-Dev table with:
        PK = USER#<user_id>
        SK = NOTIF#<notification_id>
    """

    def __init__(self, dynamo_client=None):
        self._client = dynamo_client or db
        self._table_name = self._client.get_table_name()
        self._dynamodb_client = None

    def _get_boto3_client(self):
        if self._dynamodb_client is None:
            self._dynamodb_client = self._client._get_client()
        return self._dynamodb_client

    def _build_pk(self, user_id: str) -> str:
        return f"USER#{user_id}"

    def _build_sk(self, notification_id: str) -> str:
        return f"NOTIF#{notification_id}"

    def _parse_notification_id(self, sk: str) -> Optional[str]:
        if sk.startswith("NOTIF#"):
            return sk[6:]
        return None

    def _item_to_response(self, item: dict) -> dict:
        plain = _deserialize_ddb_item(item) if any(
            isinstance(v, dict) and ("S" in v or "N" in v) for v in item.values()
        ) else item
        return {
            "id": self._parse_notification_id(plain.get("SK", "")) or "",
            "warrantyId": plain.get("warrantyId", ""),
            "productName": plain.get("productName", ""),
            "brand": plain.get("brand"),
            "type": plain.get("type", "expiring_soon"),
            "title": plain.get("title", ""),
            "message": plain.get("message", ""),
            "daysRemaining": plain.get("daysRemaining"),
            "expiryDate": plain.get("expiryDate"),
            "createdAt": plain.get("createdAt", ""),
            "isRead": bool(plain.get("isRead", False)),
        }

    def list_notifications(self, user_id: str = DEMO_USER_ID) -> List[dict]:
        try:
            client = self._get_boto3_client()
            response = client.query(
                TableName=self._table_name,
                KeyConditionExpression="PK = :pk AND begins_with(SK, :sk)",
                ExpressionAttributeValues={
                    ":pk": {"S": self._build_pk(user_id)},
                    ":sk": {"S": "NOTIF#"},
                },
            )
            items = [self._item_to_response(i) for i in response.get("Items", [])]
            # Newest first
            items.sort(key=lambda n: n.get("createdAt", ""), reverse=True)
            return items
        except EndpointConnectionError:
            logger.error("DynamoDB endpoint unreachable listing notifications")
            raise
        except ClientError as e:
            logger.error("DynamoDB error listing notifications: %s", e)
            raise
        except Exception as e:
            logger.exception("Unexpected error listing notifications: %s", e)
            raise

    def create_notification(self, data: dict, user_id: str = DEMO_USER_ID,
                            notification_id: Optional[str] = None) -> dict:
        """Create a notification. If notification_id is given and already exists,
        the existing record is returned unchanged (idempotent)."""
        try:
            client = self._get_boto3_client()
            nid = notification_id or f"notif-{uuid.uuid4().hex[:12]}"
            now_iso = datetime.now(timezone.utc).isoformat()

            item = {
                "PK": {"S": self._build_pk(user_id)},
                "SK": {"S": self._build_sk(nid)},
                "warrantyId": {"S": data.get("warrantyId", "")},
                "productName": {"S": data.get("productName", "")},
                "type": {"S": data.get("type", "expiring_soon")},
                "title": {"S": data.get("title", "")},
                "message": {"S": data.get("message", "")},
                "createdAt": {"S": data.get("createdAt") or now_iso},
                "isRead": {"BOOL": bool(data.get("isRead", False))},
            }
            if data.get("brand") is not None:
                item["brand"] = {"S": data["brand"]}
            if data.get("daysRemaining") is not None:
                item["daysRemaining"] = {"N": str(data["daysRemaining"])}
            if data.get("expiryDate") is not None:
                item["expiryDate"] = {"S": data["expiryDate"]}

            try:
                client.put_item(
                    TableName=self._table_name,
                    Item=item,
                    ConditionExpression="attribute_not_exists(PK) AND attribute_not_exists(SK)",
                )
                created = True
            except ClientError as e:
                if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                    # Already exists — return existing (idempotent, not an error)
                    existing = client.get_item(
                        TableName=self._table_name,
                        Key={"PK": item["PK"], "SK": item["SK"]},
                    )
                    return self._item_to_response(existing.get("Item", {})), False
                raise

            return self._item_to_response(item), created
        except EndpointConnectionError:
            logger.error("DynamoDB endpoint unreachable creating notification")
            raise
        except ClientError as e:
            logger.error("DynamoDB error creating notification: %s", e)
            raise
        except Exception as e:
            logger.exception("Unexpected error creating notification: %s", e)
            raise

    def mark_read(self, notification_id: str, user_id: str = DEMO_USER_ID) -> bool:
        try:
            client = self._get_boto3_client()
            client.update_item(
                TableName=self._table_name,
                Key={
                    "PK": {"S": self._build_pk(user_id)},
                    "SK": {"S": self._build_sk(notification_id)},
                },
                UpdateExpression="SET isRead = :true",
                ExpressionAttributeValues={":true": {"BOOL": True}},
                ConditionExpression="attribute_exists(PK) AND attribute_exists(SK)",
            )
            return True
        except ClientError as e:
            if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                return False
            logger.error("DynamoDB error marking notification read: %s", e)
            raise
        except EndpointConnectionError:
            raise
        except Exception as e:
            logger.exception("Unexpected error marking notification read: %s", e)
            raise

    def mark_all_read(self, user_id: str = DEMO_USER_ID) -> int:
        try:
            client = self._get_boto3_client()
            items = self.list_notifications(user_id)
            count = 0
            for n in items:
                if not n.get("isRead"):
                    if self.mark_read(n["id"], user_id):
                        count += 1
            return count
        except EndpointConnectionError:
            raise
        except Exception as e:
            logger.exception("Unexpected error marking all read: %s", e)
            raise

    def delete_notification(self, notification_id: str, user_id: str = DEMO_USER_ID) -> bool:
        try:
            client = self._get_boto3_client()
            response = client.delete_item(
                TableName=self._table_name,
                Key={
                    "PK": {"S": self._build_pk(user_id)},
                    "SK": {"S": self._build_sk(notification_id)},
                },
                ConditionExpression="attribute_exists(PK) AND attribute_exists(SK)",
                ReturnValues="ALL_OLD",
            )
            return "Attributes" in response
        except ClientError as e:
            if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                return False
            logger.error("DynamoDB error deleting notification: %s", e)
            raise
        except EndpointConnectionError:
            raise
        except Exception as e:
            logger.exception("Unexpected error deleting notification: %s", e)
            raise


# Singleton
notification_repo = NotificationRepository()
