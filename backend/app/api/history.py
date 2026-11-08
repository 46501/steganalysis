from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any

from ..database import database

router = APIRouter()

class SaveAnalysisRequest(BaseModel):
    analysis_data: Dict[str, Any]

@router.post("/save")
async def save_analysis(req: SaveAnalysisRequest):
    try:
        database.save_analysis(req.analysis_data)
        return {"status": "success", "message": "Analysis saved to history."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/")
async def get_history():
    try:
        return database.get_all_analyses()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{analysis_id}")
async def get_analysis(analysis_id: str):
    try:
        data = database.get_analysis_by_id(analysis_id)
        if not data:
            raise HTTPException(status_code=404, detail="Analysis not found.")
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{analysis_id}")
async def delete_analysis(analysis_id: str):
    try:
        database.delete_analysis(analysis_id)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
