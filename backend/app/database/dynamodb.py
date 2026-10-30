"""DynamoDB database operations for local development."""

import os
import logging
from typing import Optional

import boto3
from botocore.exceptions import ClientError, EndpointConnectionError

from app.config import settings

logger = logging.getLogger(__name__)


class DynamoDBClient:
    """Wrapper for DynamoDB operations with local development support."""

    def __init__(self):
        self._client: Optional[boto3.client] = None
        self._table_name = settings.dynamodb_table_name
        self._endpoint_url = settings.dynamodb_endpoint_url
        self._region = settings.aws_region

    def _get_client(self) -> boto3.client:
        """Create or return cached DynamoDB client."""
        if self._client is None:
            self._client = boto3.client(
                "dynamodb",
                endpoint_url=self._endpoint_url,
                region_name=self._region,
                # Local development credentials (not used for real AWS)
                aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID", "local"),
                aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY", "local"),
            )
        return self._client

    def check_connection(self) -> bool:
        """Verify DynamoDB connectivity by listing tables."""
        try:
            client = self._get_client()
            client.list_tables(Limit=1)
            return True
        except EndpointConnectionError:
            logger.warning("DynamoDB endpoint unreachable at %s", self._endpoint_url)
            return False
        except ClientError as e:
            logger.error("DynamoDB connection error: %s", e)
            return False
        except Exception as e:
            logger.exception("Unexpected error checking DynamoDB connection: %s", e)
            return False

    def create_dev_table(self) -> bool:
        """Create the development table if it doesn't exist."""
        try:
            client = self._get_client()

            # Check if table already exists
            try:
                client.describe_table(TableName=self._table_name)
                logger.info("Table '%s' already exists", self._table_name)
                return True
            except ClientError as e:
                if e.response["Error"]["Code"] != "ResourceNotFoundException":
                    raise

            # Create table with simple PK/SK schema
            logger.info("Creating table '%s'...", self._table_name)
            client.create_table(
                TableName=self._table_name,
                KeySchema=[
                    {"AttributeName": "PK", "KeyType": "HASH"},
                    {"AttributeName": "SK", "KeyType": "RANGE"},
                ],
                AttributeDefinitions=[
                    {"AttributeName": "PK", "AttributeType": "S"},
                    {"AttributeName": "SK", "AttributeType": "S"},
                ],
                BillingMode="PAY_PER_REQUEST",
            )

            # Wait for table to become active
            waiter = client.get_waiter("table_exists")
            waiter.wait(TableName=self._table_name, WaiterConfig={"Delay": 2, "MaxAttempts": 15})
            logger.info("Table '%s' created and active", self._table_name)
            return True

        except EndpointConnectionError:
            logger.error("Cannot create table: DynamoDB endpoint unreachable at %s", self._endpoint_url)
            return False
        except ClientError as e:
            logger.error("Failed to create table: %s", e)
            return False
        except Exception as e:
            logger.exception("Unexpected error creating table: %s", e)
            return False

    def get_table_name(self) -> str:
        """Return the configured table name."""
        return self._table_name


# Singleton instance
db = DynamoDBClient()