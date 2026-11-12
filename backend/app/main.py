"""FastAPI Main Application Entry Point."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

