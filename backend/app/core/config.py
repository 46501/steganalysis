import os
from typing import List

try:
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
        ALLOWED_EXTENSIONS: List[str] = ["png", "bmp", "pgm", "jpg", "jpeg", "webp", "ppm"]

        # Authentication & Session Security
        JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "stegoshield-super-secure-jwt-key-nist-2026-auth")
        JWT_ALGORITHM: str = "HS256"
        ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
        REFRESH_TOKEN_EXPIRE_DAYS: int = 7
        REMEMBER_ME_EXPIRE_DAYS: int = 30
        PASSWORD_RESET_EXPIRE_MINUTES: int = 60
        COOKIE_SECURE: bool = False  # Set to True in production HTTPS
        COOKIE_SAMESITE: str = "lax"
        RATE_LIMIT_LOGIN_ATTEMPTS: int = 5
        RATE_LIMIT_WINDOW_SECONDS: int = 300

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
            extra="ignore",
        )

except ImportError:
    from pydantic import BaseModel

    class Settings(BaseModel):
        PROJECT_NAME: str = "SRNet Steganalysis API"
        VERSION: str = "1.0.0"
        API_V1_STR: str = "/api/v1"
        DEBUG: bool = True

        DATABASE_URL: str = os.getenv(
            "DATABASE_URL",
            "postgresql+asyncpg://postgres:postgres_secure_password@localhost:5432/steganalysis",
        )
        SYNC_DATABASE_URL: str = os.getenv(
            "SYNC_DATABASE_URL",
            "postgresql+psycopg2://postgres:postgres_secure_password@localhost:5432/steganalysis",
        )

        DEVICE: str = os.getenv("DEVICE", "cpu")
        SRNET_WEIGHTS_PATH: str = os.getenv("SRNET_WEIGHTS_PATH", "app/ml/weights/srnet_weights.pth")

        MAX_UPLOAD_SIZE_MB: int = 25
        ALLOWED_EXTENSIONS: List[str] = ["png", "bmp", "pgm", "jpg", "jpeg", "webp", "ppm"]

        JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "stegoshield-super-secure-jwt-key-nist-2026-auth")
        JWT_ALGORITHM: str = "HS256"
        ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
        REFRESH_TOKEN_EXPIRE_DAYS: int = 7
        REMEMBER_ME_EXPIRE_DAYS: int = 30
        PASSWORD_RESET_EXPIRE_MINUTES: int = 60
        COOKIE_SECURE: bool = False
        COOKIE_SAMESITE: str = "lax"
        RATE_LIMIT_LOGIN_ATTEMPTS: int = 5
        RATE_LIMIT_WINDOW_SECONDS: int = 300

        CORS_ORIGINS: List[str] = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
        ]


settings = Settings()

