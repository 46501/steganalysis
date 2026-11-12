"""Authentication and Session Lifecycle API Endpoints."""

from typing import Optional
from fastapi import APIRouter, Cookie, Depends, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    MessageResponse,
    RefreshTokenRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
)
from app.services.auth_service import AuthService, REFRESH_COOKIE_NAME

router = APIRouter()


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new StegoShield AI user",
)
async def register(
    req: UserRegisterRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """
    Registers a new user account, creates an active session with secure cookies,
    and returns a signed JWT access token.
    """
    user, access_token, refresh_token, expires_in = await AuthService.register(db, req, request, response)
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=expires_in,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate user and establish session",
)
async def login(
    req: UserLoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticates user credentials, applies brute-force rate limiting,
    issues an HttpOnly refresh cookie, and returns a signed JWT access token.
    """
    user, access_token, refresh_token, expires_in = await AuthService.login(db, req, request, response)
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=expires_in,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Renew access token via refresh token rotation",
)
async def refresh_token(
    request: Request,
    response: Response,
    body: Optional[RefreshTokenRequest] = None,
    stego_refresh_token: Optional[str] = Cookie(None, alias=REFRESH_COOKIE_NAME),
    db: AsyncSession = Depends(get_db),
):
    """
    Validates the refresh token (from HttpOnly cookie or request body),
    executes cryptographic refresh-token rotation, and returns a fresh access token.
    """
    token_str = (body.refresh_token if (body and body.refresh_token) else None) or stego_refresh_token
    user, access_token, refresh_token, expires_in = await AuthService.refresh(db, token_str, request, response)
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=expires_in,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Terminate session and revoke tokens",
)
async def logout(
    response: Response,
    stego_refresh_token: Optional[str] = Cookie(None, alias=REFRESH_COOKIE_NAME),
    db: AsyncSession = Depends(get_db),
):
    """
    Revokes the active refresh token session in the database and clears cookies.
    """
    await AuthService.logout(db, stego_refresh_token, response)
    return MessageResponse(message="Successfully signed out.")


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current authenticated user identity",
)
async def get_me(
    current_user: User = Depends(get_current_user),
):
    """
    Returns the current verified user profile.
    """
    return UserResponse.model_validate(current_user)


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    summary="Request a password recovery reset token",
)
async def forgot_password(
    req: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Generates a secure password reset token without revealing account existence.
    """
    dev_token = await AuthService.forgot_password(db, req.email)
    msg = "If an account exists with this email address, password reset instructions have been generated."
    return MessageResponse(message=msg, detail=dev_token if dev_token else None)


@router.post(
    "/reset-password",
    response_model=MessageResponse,
    summary="Reset password using valid recovery token",
)
async def reset_password(
    req: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Validates token, updates password, and revokes all active sessions.
    """
    await AuthService.reset_password(db, req)
    return MessageResponse(message="Your password has been reset successfully. Please sign in with your new credentials.")


@router.post(
    "/change-password",
    response_model=MessageResponse,
    summary="Change password for authenticated user",
)
async def change_password(
    req: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Validates current password and sets a new password for the authenticated user.
    """
    await AuthService.change_password(db, current_user, req)
    return MessageResponse(message="Password changed successfully.")
