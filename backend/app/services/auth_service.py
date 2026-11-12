"""Authentication Service Layer handling registration, login, token rotation, and password recovery."""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

from fastapi import HTTPException, Request, Response, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import (
    check_login_rate_limit,
    create_access_token,
    generate_secure_token,
    hash_password,
    hash_token,
    record_failed_login,
    reset_login_rate_limit,
    verify_password,
)
from app.core.config import settings
from app.models.user import PasswordResetToken, User, UserSession
from app.schemas.auth import (
    ChangePasswordRequest,
    ResetPasswordRequest,
    UserLoginRequest,
    UserRegisterRequest,
)

logger = logging.getLogger("stego.auth")

REFRESH_COOKIE_NAME = "stego_refresh_token"


def set_refresh_cookie(response: Response, refresh_token: str, max_age_seconds: int) -> None:
    """Sets a secure HttpOnly cookie for refresh token."""
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        max_age=max_age_seconds,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path="/",
    )


def clear_refresh_cookie(response: Response) -> None:
    """Clears the refresh token cookie."""
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path="/",
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
    )


class AuthService:
    """Enterprise authentication and session lifecycle management service."""

    @staticmethod
    async def register(
        db: AsyncSession,
        req: UserRegisterRequest,
        request: Request,
        response: Response,
    ) -> Tuple[User, str, int]:
        """Registers a new user account, creates an active session, and returns auth credentials."""
        clean_email = req.email.lower().strip()

        # Check existing user
        stmt = select(User).where(User.email == clean_email)
        res = await db.execute(stmt)
        if res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email address already exists.",
            )

        # Hash password and create user
        pwd_hash = hash_password(req.password)
        user = User(
            full_name=req.full_name.strip(),
            email=clean_email,
            password_hash=pwd_hash,
            is_active=True,
            email_verified=True,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

        # Create authenticated session
        raw_refresh_token = generate_secure_token()
        session_duration = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        expires_at = datetime.now(timezone.utc) + session_duration

        user_agent = request.headers.get("user-agent", "")[:255]
        client_ip = request.client.host if request.client else "unknown"

        session = UserSession(
            user_id=user.id,
            refresh_token_hash=hash_token(raw_refresh_token),
            expires_at=expires_at,
            user_agent=user_agent,
            ip_address=client_ip,
        )
        db.add(session)
        await db.commit()

        # Generate access token
        access_token = create_access_token(user.id, user.email)
        expires_in = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

        # Set HttpOnly cookie
        set_refresh_cookie(response, raw_refresh_token, int(session_duration.total_seconds()))

        logger.info(f"User registered successfully: {clean_email} (ID: {user.id})")
        return user, access_token, raw_refresh_token, expires_in

    @staticmethod
    async def login(
        db: AsyncSession,
        req: UserLoginRequest,
        request: Request,
        response: Response,
    ) -> Tuple[User, str, int]:
        """Authenticates user credentials, applies rate limiting, and issues session tokens."""
        clean_email = req.email.lower().strip()
        client_ip = request.client.host if request.client else "unknown"
        rate_key = f"{clean_email}:{client_ip}"

        # Rate limiting check
        check_login_rate_limit(rate_key)

        # Lookup user
        stmt = select(User).where(User.email == clean_email)
        res = await db.execute(stmt)
        user = res.scalar_one_or_none()

        if not user or not verify_password(req.password, user.password_hash):
            record_failed_login(rate_key)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email address or password.",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This account has been deactivated. Please contact support.",
            )

        # Reset rate limiting counter on success
        reset_login_rate_limit(rate_key)

        # Session duration based on Remember Me
        days = settings.REMEMBER_ME_EXPIRE_DAYS if req.remember_me else settings.REFRESH_TOKEN_EXPIRE_DAYS
        session_duration = timedelta(days=days)
        expires_at = datetime.now(timezone.utc) + session_duration

        raw_refresh_token = generate_secure_token()
        user_agent = request.headers.get("user-agent", "")[:255]

        session = UserSession(
            user_id=user.id,
            refresh_token_hash=hash_token(raw_refresh_token),
            expires_at=expires_at,
            user_agent=user_agent,
            ip_address=client_ip,
        )
        db.add(session)
        await db.commit()

        # Access token
        access_token = create_access_token(user.id, user.email)
        expires_in = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

        # Set cookie
        set_refresh_cookie(response, raw_refresh_token, int(session_duration.total_seconds()))

        logger.info(f"User logged in successfully: {clean_email} (ID: {user.id})")
        return user, access_token, raw_refresh_token, expires_in

    @staticmethod
    async def refresh(
        db: AsyncSession,
        raw_refresh_token: Optional[str],
        request: Request,
        response: Response,
    ) -> Tuple[User, str, int]:
        """Validates refresh token, executes refresh-token rotation, and returns new access token."""
        if not raw_refresh_token:
            clear_refresh_cookie(response)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token missing. Please sign in again.",
            )

        token_hash = hash_token(raw_refresh_token)
        stmt = select(UserSession).where(UserSession.refresh_token_hash == token_hash)
        res = await db.execute(stmt)
        session = res.scalar_one_or_none()

        if not session or not session.is_valid:
            clear_refresh_cookie(response)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token is expired, revoked, or invalid. Please sign in again.",
            )

        # Fetch user
        stmt_user = select(User).where(User.id == session.user_id)
        res_user = await db.execute(stmt_user)
        user = res_user.scalar_one_or_none()

        if not user or not user.is_active:
            clear_refresh_cookie(response)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account is inactive or not found.",
            )

        # Refresh-token rotation: Revoke old session and issue new session
        session.revoked_at = datetime.now(timezone.utc)

        new_raw_refresh = generate_secure_token()
        session_duration = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        new_expires_at = datetime.now(timezone.utc) + session_duration

        new_session = UserSession(
            user_id=user.id,
            refresh_token_hash=hash_token(new_raw_refresh),
            expires_at=new_expires_at,
            user_agent=request.headers.get("user-agent", "")[:255],
            ip_address=request.client.host if request.client else "unknown",
        )
        db.add(new_session)
        await db.commit()

        # New access token
        new_access_token = create_access_token(user.id, user.email)
        expires_in = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

        set_refresh_cookie(response, new_raw_refresh, int(session_duration.total_seconds()))

        return user, new_access_token, new_raw_refresh, expires_in

    @staticmethod
    async def logout(
        db: AsyncSession,
        raw_refresh_token: Optional[str],
        response: Response,
    ) -> None:
        """Revokes the current refresh session and clears the client cookie."""
        if raw_refresh_token:
            token_hash = hash_token(raw_refresh_token)
            stmt = update(UserSession).where(UserSession.refresh_token_hash == token_hash).values(
                revoked_at=datetime.now(timezone.utc)
            )
            await db.execute(stmt)
            await db.commit()

        clear_refresh_cookie(response)

    @staticmethod
    async def forgot_password(
        db: AsyncSession,
        email: str,
    ) -> Optional[str]:
        """
        Generates a secure password reset token.
        Never reveals whether the email exists. Returns the token in DEBUG mode for local development.
        """
        clean_email = email.lower().strip()
        stmt = select(User).where(User.email == clean_email, User.is_active == True)
        res = await db.execute(stmt)
        user = res.scalar_one_or_none()

        dev_token = None
        if user:
            raw_token = generate_secure_token()
            t_hash = hash_token(raw_token)
            expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES)

            reset_record = PasswordResetToken(
                user_id=user.id,
                token_hash=t_hash,
                expires_at=expires_at,
            )
            db.add(reset_record)
            await db.commit()

            logger.info(f"Password reset token generated for user ID {user.id}")
            if settings.DEBUG:
                dev_token = raw_token

        return dev_token

    @staticmethod
    async def reset_password(
        db: AsyncSession,
        req: ResetPasswordRequest,
    ) -> None:
        """Validates reset token, updates password, and revokes all active sessions."""
        t_hash = hash_token(req.token)
        stmt = select(PasswordResetToken).where(PasswordResetToken.token_hash == t_hash)
        res = await db.execute(stmt)
        reset_token = res.scalar_one_or_none()

        if not reset_token or not reset_token.is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password reset token is invalid, used, or expired. Please request a new one.",
            )

        # Fetch user
        stmt_user = select(User).where(User.id == reset_token.user_id)
        res_user = await db.execute(stmt_user)
        user = res_user.scalar_one_or_none()

        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User account not found or deactivated.",
            )

        # Update password hash
        user.password_hash = hash_password(req.new_password)
        user.updated_at = datetime.now(timezone.utc)
        reset_token.used_at = datetime.now(timezone.utc)

        # Revoke all existing sessions (session fixation protection)
        stmt_sessions = update(UserSession).where(
            UserSession.user_id == user.id,
            UserSession.revoked_at.is_(None),
        ).values(revoked_at=datetime.now(timezone.utc))
        await db.execute(stmt_sessions)

        await db.commit()
        logger.info(f"Password successfully reset for user ID {user.id}")

    @staticmethod
    async def change_password(
        db: AsyncSession,
        user: User,
        req: ChangePasswordRequest,
    ) -> None:
        """Allows authenticated user to change their password."""
        if not verify_password(req.current_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect.",
            )

        user.password_hash = hash_password(req.new_password)
        user.updated_at = datetime.now(timezone.utc)
        await db.commit()
        logger.info(f"Password changed successfully for user ID {user.id}")
