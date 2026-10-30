"""S3 service for invoice uploads using AWS profile credentials."""

import os
import logging
from typing import Optional
from urllib.parse import urlparse

import boto3
from botocore.exceptions import ClientError, EndpointConnectionError

from app.config import settings

logger = logging.getLogger(__name__)


class S3Client:
    """Wrapper for S3 operations using AWS profile credentials."""

    def __init__(self):
        self._client: Optional[boto3.client] = None
        self._bucket = settings.s3_bucket_name
        self._region = settings.aws_region
        self._profile = settings.aws_profile

    def _get_client(self) -> boto3.client:
        """Create or return cached S3 client using AWS profile."""
        if self._client is None:
            session = boto3.Session(profile_name=self._profile) if self._profile else boto3.Session()
            # Get credentials from the session to use with custom endpoint
            credentials = session.get_credentials()
            # Use regional endpoint to avoid 307 redirect issues with presigned URLs
            endpoint_url = f"https://s3.{self._region}.amazonaws.com"
            self._client = session.client(
                "s3",
                region_name=self._region,
                endpoint_url=endpoint_url,
                aws_access_key_id=credentials.access_key,
                aws_secret_access_key=credentials.secret_key,
                aws_session_token=credentials.token,
            )
        return self._client

    def check_connection(self) -> bool:
        """Verify S3 connectivity by checking bucket access."""
        try:
            client = self._get_client()
            client.head_bucket(Bucket=self._bucket)
            return True
        except EndpointConnectionError:
            logger.warning("S3 endpoint unreachable")
            return False
        except ClientError as e:
            logger.error("S3 connection error: %s", e)
            return False
        except Exception as e:
            logger.exception("Unexpected error checking S3 connection: %s", e)
            return False

    def generate_presigned_upload_url(
        self,
        object_key: str,
        content_type: str = "application/pdf",
        expiration: int = 3600,
    ) -> dict:
        """Generate a presigned URL for uploading a file to S3."""
        try:
            client = self._get_client()
            url = client.generate_presigned_url(
                "put_object",
                Params={
                    "Bucket": self._bucket,
                    "Key": object_key,
                    "ContentType": content_type,
                },
                ExpiresIn=expiration,
            )
            return {
                "upload_url": url,
                "bucket": self._bucket,
                "key": object_key,
                "expires_in": expiration,
            }
        except ClientError as e:
            logger.error("Failed to generate presigned URL: %s", e)
            raise

    def upload_file(
        self,
        content: bytes,
        object_key: str,
        content_type: str = "application/pdf",
    ) -> None:
        """Upload file content directly to the private S3 bucket."""
        try:
            client = self._get_client()
            client.put_object(
                Bucket=self._bucket,
                Key=object_key,
                Body=content,
                ContentType=content_type,
            )
        except ClientError as e:
            logger.error("Failed to upload object to S3: %s", e)
            raise
        except EndpointConnectionError:
            logger.error("S3 endpoint unreachable during upload")
            raise

    def generate_presigned_download_url(
        self,
        object_key: str,
        expiration: int = 3600,
    ) -> str:
        """Generate a presigned URL for downloading a file from S3."""
        try:
            client = self._get_client()
            url = client.generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": self._bucket,
                    "Key": object_key,
                },
                ExpiresIn=expiration,
            )
            return url
        except ClientError as e:
            logger.error("Failed to generate presigned download URL: %s", e)
            raise

    def delete_object(self, object_key: str) -> bool:
        """Delete an object from S3."""
        try:
            client = self._get_client()
            client.delete_object(Bucket=self._bucket, Key=object_key)
            return True
        except ClientError as e:
            logger.error("Failed to delete object: %s", e)
            raise

    def object_exists(self, object_key: str) -> bool:
        """Check if an object exists in S3."""
        try:
            client = self._get_client()
            client.head_object(Bucket=self._bucket, Key=object_key)
            return True
        except ClientError as e:
            if e.response["Error"]["Code"] == "404":
                return False
            logger.error("Failed to check object existence: %s", e)
            raise


# Singleton instance
s3 = S3Client()