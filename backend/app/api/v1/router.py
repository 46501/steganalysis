"""Central API v1 Router."""

from fastapi import APIRouter
from app.api.v1.endpoints import analyze, batch, health, history, lab, stego

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["Health"])
api_router.include_router(analyze.router, prefix="/analyze", tags=["Steganalysis"])
api_router.include_router(batch.router, prefix="/batch", tags=["Batch Analysis"])
api_router.include_router(history.router, prefix="/history", tags=["History"])
api_router.include_router(stego.router, prefix="/stego", tags=["Steganography Studio"])
api_router.include_router(lab.router, prefix="/lab", tags=["Forensics Lab"])

