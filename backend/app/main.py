"""FastAPI Main Application Entry Point."""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.api.v1.endpoints import auth, users
from app.core.config import settings
from app.core.database import ACTIVE_DB_TYPE, init_db
from app.ml.inference import engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes ML engine and database connections on startup."""
    print(f"[*] Starting {settings.PROJECT_NAME} v{settings.VERSION}")
    print(f"[*] Initializing database ({ACTIVE_DB_TYPE})...")
    await init_db()
    print(f"[*] Initializing PyTorch Steganalysis Engine on device: {engine.device}...")
    engine.load_model()
    print(f"[*] Steganalysis Engine initialized: {engine.active_model_name}")
    yield
    print("[*] Shutting down application...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Cross-Origin Resource Sharing (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"^https://.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """
    Injects enterprise defense-in-depth security headers into all responses:
    - X-Frame-Options: Prevents UI redressing & Clickjacking attacks.
    - X-Content-Type-Options: Prevents MIME-confusion and drive-by download sniffing.
    - Referrer-Policy: Protects against credential leakage in HTTP referrers.
    - Permissions-Policy: Restricts browser hardware APIs.
    - Strict-Transport-Security (HSTS): Enforces encrypted HTTPS connections in production.
    - Content-Security-Policy: Mitigates XSS and data injection vectors.
    """
    response = await call_next(request)

    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

    # Enforce HSTS (Strict-Transport-Security) for HTTPS connections and production
    is_https = (
        request.url.scheme == "https"
        or request.headers.get("x-forwarded-proto") == "https"
        or not settings.DEBUG
        or getattr(settings, "ENVIRONMENT", "").lower() == "production"
    )
    if is_https:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"

    # Prevent public and intermediate proxy caching of forensic and authentication API responses
    if request.url.path.startswith("/api"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
        response.headers["Pragma"] = "no-cache"

    # Restrict CSP while permitting Vite frontend assets and local API communication
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: blob:; "
        "connect-src 'self' https://*.vercel.app https://*.onrender.com http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*; "
        "frame-ancestors 'none';"
    )
    return response

# Register API v1 Router
app.include_router(api_router, prefix=settings.API_V1_STR)

# Direct aliases for /api/auth and /api/users
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["User Profile"])


@app.get("/", tags=["Root"])
async def root():
    return {
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
        "health": f"{settings.API_V1_STR}/health",
    }

