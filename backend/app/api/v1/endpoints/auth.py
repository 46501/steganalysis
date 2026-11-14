"""Authentication and Session Lifecycle API Endpoints."""

from typing import Optional
from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user, check_rate_limit, verify_password
from app.core.config import settings
from app.core.database import get_db
from app.core.mfa import MFAService
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    MessageResponse,
    MFACodeRequest,
    MFADisableRequest,
    MFASetupResponse,
    MFAStatusResponse,
    RefreshTokenRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
)
from app.services.auth_service import AuthService, REFRESH_COOKIE_NAME

router = APIRouter()


def verify_csrf_header(request: Request) -> None:
    """
    OWASP custom request header Anti-CSRF verification.
    Requests authenticated solely via ambient browser cookies MUST provide
    'X-StegoShield-Client: 1' or 'X-Requested-With: XMLHttpRequest'.
    Cross-origin form submissions and unauthorized scripts cannot forge custom headers.
    """
    client_header = request.headers.get("x-stegoshield-client")
    requested_with = request.headers.get("x-requested-with")
    auth_header = request.headers.get("authorization")

    # If explicit Authorization header is present, it's not vulnerable to ambient cookie CSRF
    if auth_header and auth_header.strip().lower().startswith("bearer "):
        return

    if client_header == "1" or requested_with == "XMLHttpRequest":
        return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Cross-Site Request Forgery protection: Missing required 'X-StegoShield-Client: 1' header on cookie-authenticated request.",
    )


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
    client_ip = request.client.host if request.client else "unknown"
    check_rate_limit(
        key=f"ip:{client_ip}",
        category="register",
        max_requests=settings.RATE_LIMIT_REGISTER_PER_HOUR,
        window_seconds=3600,
        custom_message="Registration rate limit exceeded. Please wait before creating more accounts.",
    )
    user, access_token, refresh_token_val, expires_in = await AuthService.register(db, req, request, response)
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=expires_in,
        refresh_token=refresh_token_val,
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
    user, access_token, refresh_token_val, expires_in = await AuthService.login(db, req, request, response)
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=expires_in,
        refresh_token=refresh_token_val,
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
    body_token = None
    if body and body.refresh_token:
        body_token = body.refresh_token
    else:
        try:
            raw_json = await request.json()
            if isinstance(raw_json, dict):
                body_token = raw_json.get("refresh_token")
        except Exception:
            pass

    token_str = body_token or stego_refresh_token
    # Anti-CSRF protection: ambient cookie authentication requires custom client header
    if not body_token and stego_refresh_token:
        verify_csrf_header(request)

    user, access_token, refresh_token_val, expires_in = await AuthService.refresh(db, token_str, request, response)
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=expires_in,
        refresh_token=refresh_token_val,
        user=UserResponse.model_validate(user),
    )


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Terminate session and revoke tokens",
)
async def logout(
    request: Request,
    response: Response,
    stego_refresh_token: Optional[str] = Cookie(None, alias=REFRESH_COOKIE_NAME),
    db: AsyncSession = Depends(get_db),
):
    """
    Revokes the active refresh token session in the database and clears cookies.
    """
    if stego_refresh_token:
        verify_csrf_header(request)
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
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Generates a secure password reset token without revealing account existence.
    """
    client_ip = request.client.host if request.client else "unknown"
    check_rate_limit(
        key=f"ip:{client_ip}",
        category="forgot_password",
        max_requests=settings.RATE_LIMIT_FORGOT_PW_PER_HOUR,
        window_seconds=900,
        custom_message="Too many password recovery requests. Please wait 15 minutes before attempting again.",
    )
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


# -----------------------------------------------------------------------------
# Optional Multi-Factor Authentication (RFC 6238 TOTP) Endpoints
# -----------------------------------------------------------------------------

@router.get(
    "/mfa/status",
    response_model=MFAStatusResponse,
    summary="Check MFA activation status for current authenticated user",
)
async def get_mfa_status(
    current_user: User = Depends(get_current_user),
):
    """Returns whether TOTP multi-factor authentication is active for this account."""
    status = MFAService.get_status(current_user.id)
    return MFAStatusResponse(
        mfa_enabled=status["mfa_enabled"],
        enrolled_at=status.get("enrolled_at"),
    )


@router.post(
    "/mfa/setup",
    response_model=MFASetupResponse,
    summary="Initiate optional MFA enrollment",
)
async def initiate_mfa_setup(
    current_user: User = Depends(get_current_user),
):
    """
    Generates a secure 160-bit Base32 TOTP secret and standard otpauth:// URI
    for enrollment into Google Authenticator, Microsoft Authenticator, or 1Password.
    """
    details = MFAService.initiate_setup(current_user.id, current_user.email)
    return MFASetupResponse(**details)


@router.post(
    "/mfa/enable",
    response_model=MessageResponse,
    summary="Confirm enrollment and activate MFA with 6-digit TOTP code",
)
async def enable_mfa(
    req: MFACodeRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Verifies initial 6-digit code against pending secret to confirm enrollment
    and enables multi-factor authentication on the account.
    """
    success = MFAService.confirm_enrollment(current_user.id, req.code)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code. Please check your authenticator clock and try again.",
        )
    return MessageResponse(message="Multi-factor authentication (TOTP) successfully activated.")


@router.post(
    "/mfa/disable",
    response_model=MessageResponse,
    summary="Disable MFA with password confirmation",
)
async def disable_mfa(
    req: MFADisableRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Requires account password confirmation before revoking multi-factor authentication.
    """
    if not verify_password(req.password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password. Cannot disable multi-factor authentication.",
        )
    MFAService.disable_mfa(current_user.id)
    return MessageResponse(message="Multi-factor authentication has been disabled.")


