"""Central API v1 Router."""

from fastapi import APIRouter
from app.api.v1.endpoints import analyze, batch, health, history

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["Health"])
api_router.include_router(analyze.router, prefix="/analyze", tags=["Steganalysis"])
api_router.include_router(batch.router, prefix="/batch", tags=["Batch Analysis"])
api_router.include_router(history.router, prefix="/history", tags=["History"])

