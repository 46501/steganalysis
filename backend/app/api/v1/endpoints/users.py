"""User Profile and Account Management API Endpoints."""

from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.auth import MessageResponse
from app.schemas.user import (
    UserAccountDeleteRequest,
    UserProfileResponse,
    UserProfileUpdateRequest,
)
from app.services.auth_service import clear_refresh_cookie
from app.services.user_service import UserService

router = APIRouter()


@router.get(
    "/profile",
    response_model=UserProfileResponse,
    summary="Get user profile and live forensic investigation stats",
)
async def get_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns complete account profile along with real aggregated scan count,
    experiment count, saved report count, and recent activity from the database.
    """
    return await UserService.get_profile(db, current_user)


@router.patch(
    "/profile",
    response_model=UserProfileResponse,
    summary="Update user display profile",
)
async def update_profile(
    req: UserProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Updates editable profile attributes like display name.
    """
    updated_user = await UserService.update_profile(db, current_user, req)
    return await UserService.get_profile(db, updated_user)


@router.delete(
    "/account",
    response_model=MessageResponse,
    summary="Delete account and cascade personal records",
)
async def delete_account(
    req: UserAccountDeleteRequest,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Permanently deletes user account and personal forensic records after verifying password.
    """
    await UserService.delete_account(db, current_user, req.password)
    clear_refresh_cookie(response)
    return MessageResponse(message="Your account and associated personal data have been permanently deleted.")
