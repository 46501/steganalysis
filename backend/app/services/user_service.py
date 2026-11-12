"""User Account Profile and Statistical Aggregation Service."""

import logging
from datetime import datetime, timezone
from typing import Dict, Any, List

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import verify_password
from app.models.experiment import ExperimentRecord
from app.models.scan import ScanRecord
from app.models.user import User
from app.schemas.user import UserProfileResponse, UserProfileUpdateRequest

logger = logging.getLogger("stego.users")


class UserService:
    """Service handling user account profile statistics, updates, and deletion."""

    @staticmethod
    async def get_profile(db: AsyncSession, user: User) -> UserProfileResponse:
        """Fetches complete user profile and computes real-time forensic statistics from actual database records."""
        # Query total scans
        stmt_scans = select(func.count(ScanRecord.id)).where(ScanRecord.user_id == user.id)
        res_scans = await db.execute(stmt_scans)
        total_scans = res_scans.scalar() or 0

        # Query total experiments
        stmt_exp = select(func.count(ExperimentRecord.id)).where(ExperimentRecord.user_id == user.id)
        res_exp = await db.execute(stmt_exp)
        total_experiments = res_exp.scalar() or 0

        # Saved reports count (scans with comprehensive verdicts)
        stmt_reports = select(func.count(ScanRecord.id)).where(
            ScanRecord.user_id == user.id,
            ScanRecord.forensic_explanation.is_not(None),
        )
        res_reports = await db.execute(stmt_reports)
        saved_reports_count = res_reports.scalar() or 0

        # Fetch recent 5 scans
        stmt_recent_scans = (
            select(ScanRecord)
            .where(ScanRecord.user_id == user.id)
            .order_by(ScanRecord.created_at.desc())
            .limit(5)
        )
        res_recent = await db.execute(stmt_recent_scans)
        recent_scans = res_recent.scalars().all()

        recent_activity: List[Dict[str, Any]] = []
        for s in recent_scans:
            recent_activity.append({
                "type": "scan",
                "id": s.id,
                "title": f"Scan: {s.filename}",
                "verdict": s.verdict,
                "confidence": s.confidence,
                "timestamp": s.created_at.isoformat() if s.created_at else datetime.now(timezone.utc).isoformat(),
            })

        # Fetch recent 5 experiments
        stmt_recent_exp = (
            select(ExperimentRecord)
            .where(ExperimentRecord.user_id == user.id)
            .order_by(ExperimentRecord.created_at.desc())
            .limit(5)
        )
        res_recent_exp = await db.execute(stmt_recent_exp)
        recent_experiments = res_recent_exp.scalars().all()

        for exp in recent_experiments:
            recent_activity.append({
                "type": "experiment",
                "id": exp.id,
                "title": f"Lab: {exp.experiment_name}",
                "experiment_type": exp.experiment_type,
                "timestamp": exp.created_at.isoformat() if exp.created_at else datetime.now(timezone.utc).isoformat(),
            })

        # Sort combined activity by timestamp descending
        recent_activity.sort(key=lambda x: x["timestamp"], reverse=True)

        return UserProfileResponse(
            id=user.id,
            full_name=user.full_name,
            email=user.email,
            is_active=user.is_active,
            email_verified=user.email_verified,
            created_at=user.created_at,
            updated_at=user.updated_at,
            total_scans=total_scans,
            total_experiments=total_experiments,
            saved_reports_count=saved_reports_count,
            recent_activity=recent_activity[:10],
        )

    @staticmethod
    async def update_profile(
        db: AsyncSession,
        user: User,
        req: UserProfileUpdateRequest,
    ) -> User:
        """Updates user profile information."""
        if req.full_name is not None and req.full_name.strip():
            user.full_name = req.full_name.strip()
            user.updated_at = datetime.now(timezone.utc)
            await db.commit()
            await db.refresh(user)

        return user

    @staticmethod
    async def delete_account(
        db: AsyncSession,
        user: User,
        password: str,
    ) -> None:
        """Permanently deletes the authenticated user account and cascades data deletion safely."""
        if not verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect password. Account deletion aborted.",
            )

        logger.warning(f"Deleting user account ID {user.id} ({user.email}) upon verified request.")
        await db.delete(user)
        await db.commit()
