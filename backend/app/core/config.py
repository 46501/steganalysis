import os
import urllib.parse
from pathlib import Path
from typing import List, Optional

# Compute absolute directory anchors
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ROOT_DIR = BACKEND_DIR.parent
ENV_FILE_PATHS = [str(BACKEND_DIR / ".env"), str(ROOT_DIR / ".env")]

# Proactively load backend/.env into environment with override to prevent stale shell variables
try:
    from dotenv import load_dotenv
    if (BACKEND_DIR / ".env").is_file():
        load_dotenv(BACKEND_DIR / ".env", override=True)
except ImportError:
    pass


def _normalize_asyncpg_url(raw_url: str) -> str:
    """
    Normalizes PostgreSQL URLs to postgresql+asyncpg:// and cleans libpq query parameters
    (e.g., sslmode, channel_binding) which asyncpg rejects as unexpected keyword arguments.
    SSL and statement caching are configured via connect_args in core/database.py.
    """
    url = raw_url.strip()
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

    if "asyncpg" in url:
        parsed = urllib.parse.urlparse(url)
        if parsed.query:
            query_params = urllib.parse.parse_qsl(parsed.query)
            filtered = [(k, v) for k, v in query_params if k.lower() not in ("sslmode", "channel_binding")]
            new_query = urllib.parse.urlencode(filtered)
            url = urllib.parse.urlunparse((parsed.scheme, parsed.netloc, parsed.path, parsed.params, new_query, parsed.fragment))
    return url

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
    from pydantic import field_validator

    class Settings(BaseSettings):
        PROJECT_NAME: str = "StegoShield AI Forensic Steganalysis API"
        VERSION: str = "1.0.0"
        API_V1_STR: str = "/api/v1"
        DEBUG: bool = True
        ENVIRONMENT: str = "development"  # "development", "production", "test"
        USE_SQLITE: bool = False  # Set to True for explicit local SQLite usage

        # Database URLs (read dynamically from environment variables or .env)
        DATABASE_URL: Optional[str] = None
        SYNC_DATABASE_URL: Optional[str] = None

        # ML Configuration
        DEVICE: str = "cpu"
        SRNET_WEIGHTS_PATH: str = "app/ml/weights/srnet_weights.pth"

        # AI Conversational Assistant (Optional External LLM Providers)
        GEMINI_API_KEY: Optional[str] = None
        OPENAI_API_KEY: Optional[str] = None

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
        RATE_LIMIT_REGISTER_PER_HOUR: int = 30
        RATE_LIMIT_FORGOT_PW_PER_HOUR: int = 10
        RATE_LIMIT_ANALYZE_PER_MINUTE: int = 60

        # CORS Allowed Origins
        CORS_ORIGINS: List[str] = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "https://steganalysis-beta.vercel.app",
        ]

        model_config = SettingsConfigDict(
            env_file=ENV_FILE_PATHS,
            env_file_encoding="utf-8",
            case_sensitive=True,
            extra="ignore",
        )

        @field_validator("CORS_ORIGINS", mode="before")
        @classmethod
        def parse_cors_origins(cls, v):
            """Parses CORS origins from list, JSON string, or comma-separated string."""
            origins = []
            if isinstance(v, str):
                v = v.strip()
                if v.startswith("[") and v.endswith("]"):
                    try:
                        import json
                        parsed = json.loads(v)
                        origins = parsed if isinstance(parsed, list) else [parsed]
                    except Exception:
                        origins = [origin.strip().strip("'\"") for origin in v.strip("[]").split(",") if origin.strip()]
                else:
                    origins = [origin.strip() for origin in v.split(",") if origin.strip()]
            elif isinstance(v, list):
                origins = list(v)

            # Always guarantee production frontend domains are allowed
            guaranteed = [
                "https://steganalysis-beta.vercel.app",
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:3000",
            ]
            for g in guaranteed:
                if g not in origins:
                    origins.append(g)
            return origins

        @field_validator("USE_SQLITE", mode="before")
        @classmethod
        def parse_use_sqlite(cls, v):
            """Robustly parses boolean values even with accidental trailing whitespace."""
            if isinstance(v, str):
                return v.strip().lower() in ("true", "1", "yes", "on")
            return bool(v)

        def get_async_database_url(self) -> str:
            """
            Resolves and normalizes the asynchronous database URL.
            Automatically converts postgres:// or postgresql:// schemes to postgresql+asyncpg://
            """
            url = self.DATABASE_URL
            if not url or self.USE_SQLITE or "sqlite" in str(url).lower():
                storage_dir = BACKEND_DIR / "storage"
                storage_dir.mkdir(parents=True, exist_ok=True)
                sqlite_path = storage_dir / "stego.db"
                return f"sqlite+aiosqlite:///{sqlite_path.as_posix()}"

            return _normalize_asyncpg_url(url)

        def get_sync_database_url(self) -> str:
            """
            Resolves synchronous database URL for Alembic migrations.
            Automatically converts postgresql+asyncpg:// or postgresql:// to postgresql+psycopg2://
            """
            if self.SYNC_DATABASE_URL:
                return self.SYNC_DATABASE_URL.strip()

            url = self.DATABASE_URL
            if not url or self.USE_SQLITE or "sqlite" in str(url).lower():
                storage_dir = BACKEND_DIR / "storage"
                storage_dir.mkdir(parents=True, exist_ok=True)
                sqlite_path = storage_dir / "stego.db"
                return f"sqlite:///{sqlite_path.as_posix()}"

            url = url.strip()
            if url.startswith("postgres://"):
                url = url.replace("postgres://", "postgresql+psycopg2://", 1)
            elif url.startswith("postgresql+asyncpg://"):
                url = url.replace("postgresql+asyncpg://", "postgresql+psycopg2://", 1)
            elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
                url = url.replace("postgresql://", "postgresql+psycopg2://", 1)

            return url

except ImportError:
    from pydantic import BaseModel

    class Settings(BaseModel):
        PROJECT_NAME: str = "StegoShield AI Forensic Steganalysis API"
        VERSION: str = "1.0.0"
        API_V1_STR: str = "/api/v1"
        DEBUG: bool = True
        ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
        USE_SQLITE: bool = os.getenv("USE_SQLITE", "false").strip().lower() in ("true", "1")

        DATABASE_URL: Optional[str] = os.getenv("DATABASE_URL")
        SYNC_DATABASE_URL: Optional[str] = os.getenv("SYNC_DATABASE_URL")

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
        RATE_LIMIT_REGISTER_PER_HOUR: int = 30
        RATE_LIMIT_FORGOT_PW_PER_HOUR: int = 10
        RATE_LIMIT_ANALYZE_PER_MINUTE: int = 60

        CORS_ORIGINS: List[str] = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "https://steganalysis-beta.vercel.app",
        ]

        def get_async_database_url(self) -> str:
            url = self.DATABASE_URL
            if not url or self.USE_SQLITE or "sqlite" in str(url).lower():
                storage_dir = BACKEND_DIR / "storage"
                storage_dir.mkdir(parents=True, exist_ok=True)
                sqlite_path = storage_dir / "stego.db"
                return f"sqlite+aiosqlite:///{sqlite_path.as_posix()}"

            return _normalize_asyncpg_url(url)

        def get_sync_database_url(self) -> str:
            if self.SYNC_DATABASE_URL:
                return self.SYNC_DATABASE_URL.strip()

            url = self.DATABASE_URL
            if not url or self.USE_SQLITE or "sqlite" in str(url).lower():
                storage_dir = BACKEND_DIR / "storage"
                storage_dir.mkdir(parents=True, exist_ok=True)
                sqlite_path = storage_dir / "stego.db"
                return f"sqlite:///{sqlite_path.as_posix()}"

            url = url.strip()
            if url.startswith("postgres://"):
                url = url.replace("postgres://", "postgresql+psycopg2://", 1)
            elif url.startswith("postgresql+asyncpg://"):
                url = url.replace("postgresql+asyncpg://", "postgresql+psycopg2://", 1)
            elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
                url = url.replace("postgresql://", "postgresql+psycopg2://", 1)

            return url


settings = Settings()
