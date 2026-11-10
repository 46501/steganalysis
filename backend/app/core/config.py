from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "SRNet Steganalysis API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres_secure_password@localhost:5432/steganalysis"
    SYNC_DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres_secure_password@localhost:5432/steganalysis"

    # ML Configuration
    DEVICE: str = "cpu"
    SRNET_WEIGHTS_PATH: str = "app/ml/weights/srnet_weights.pth"

    # File Upload Constraints
    MAX_UPLOAD_SIZE_MB: int = 25
    ALLOWED_EXTENSIONS: List[str] = ["png", "bmp", "pgm", "jpg", "jpeg"]

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()

