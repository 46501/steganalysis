"""Scan history retrieval and management endpoints."""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, desc, func, select
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


@router.get("/{record_id}", response_model=ScanHistoryItem)
async def get_scan_record_by_id(
    record_id: int,
    db: AsyncSession = Depends(get_db),
) -> ScanHistoryItem:
    """Retrieves a single scan history record by ID."""
    stmt = select(ScanRecord).where(ScanRecord.id == record_id)
    result = await db.execute(stmt)
    record = result.scalar_one_or_none()

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan record with ID {record_id} not found",
        )

    return ScanHistoryItem.model_validate(record)


@router.delete("/{record_id}", status_code=status.HTTP_200_OK)
async def delete_scan_record(
    record_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Deletes a specific scan record from the history."""
    stmt = select(ScanRecord).where(ScanRecord.id == record_id)
    result = await db.execute(stmt)
    record = result.scalar_one_or_none()

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan record with ID {record_id} not found",
        )

    await db.delete(record)
    await db.commit()
    return {"message": f"Scan record {record_id} deleted successfully"}


@router.delete("", status_code=status.HTTP_200_OK)
async def clear_all_history(
    db: AsyncSession = Depends(get_db),
):
    """Clears all scan records from the database."""
    await db.execute(delete(ScanRecord))
    await db.commit()
    return {"message": "All scan records cleared successfully"}
