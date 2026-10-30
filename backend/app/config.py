from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Union, Optional


class Settings(BaseSettings):
    # Application
    app_env: str = "development"
    app_name: str = "WarrantyEase API"
    app_version: str = "0.1.0"
    debug: bool = True

    # Server
    host: str = "0.0.0.0"
    port: int = 8001

    # AWS
    aws_region: str = "ap-south-1"
    aws_profile: Optional[str] = None  # e.g., "warrantyease-local" for local dev
    aws_access_key_id: str = "local"
    aws_secret_access_key: str = "local"

    # DynamoDB
    dynamodb_endpoint_url: str = "http://localhost:8000"
    dynamodb_table_name: str = "WarrantyEase-Dev"

    # S3
    s3_bucket_name: str = "warrantyease-invoices-vu1-026146808037-ap-south-1-an"

    # CORS
    frontend_origins: Union[List[str], str] = ["http://localhost:3000", "http://localhost:3001"]

    @field_validator("frontend_origins", mode="before")
    @classmethod
    def parse_frontend_origins(cls, v: Union[List[str], str]) -> List[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "allow"


settings = Settings()