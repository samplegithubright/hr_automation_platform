import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # API Configurations
    OPENAI_API_KEY: str = ""
    GITHUB_TOKEN: str = ""

    # Database
    # We default to a local SQLite database for easy development/testing, but it can be overridden with a PostgreSQL URL
    DATABASE_URL: str = "sqlite+aiosqlite:///./hr_platform.db"

    # JWT Authentication
    JWT_SECRET: str = "super_secret_key_hr_automation_platform_2026_change_me_in_prod"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # File Storage
    STORAGE_TYPE: str = "local"  # "local" or "s3"
    UPLOAD_DIR: str = "uploads"
    
    # AWS S3 Settings (if STORAGE_TYPE == "s3")
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_BUCKET_NAME: str = ""
    AWS_REGION: str = "us-east-1"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

# Ensure uploads directory exists locally if using local storage
if settings.STORAGE_TYPE == "local":
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    # Also ensure a directory for generated visuals exists
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "visuals"), exist_ok=True)
