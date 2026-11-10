"""Scan history retrieval endpoints."""

from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.scan import ScanRecord
from app.schemas.history import PaginatedHistoryResponse, ScanHistoryItem

router = APIRouter()


@router.get("", response_model=PaginatedHistoryResponse)
async def get_scan_history(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    verdict: Optional[str] = Query(None, description="Filter by 'Cover' or 'Stego'"),
    db: AsyncSession = Depends(get_db),
) -> PaginatedHistoryResponse:
    """Retrieves paginated scan history records."""
    query = select(ScanRecord)
    count_query = select(func.count(ScanRecord.id))

    if verdict:
        query = query.where(ScanRecord.verdict == verdict)
        count_query = count_query.where(ScanRecord.verdict == verdict)

    total_count = (await db.execute(count_query)).scalar_one_or_none() or 0

    query = query.order_by(desc(ScanRecord.created_at)).limit(limit).offset(offset)
    result = await db.execute(query)
    records = result.scalars().all()

    items = [ScanHistoryItem.model_validate(r) for r in records]

    return PaginatedHistoryResponse(
        total_count=total_count,
        limit=limit,
        offset=offset,
        items=items,
    )

