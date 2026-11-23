"""web/blueprints/auth_routes.py — Authentication, user management, and dashboard routes."""
from __future__ import annotations

from datetime import datetime, timezone, timedelta

from flask import (
    Blueprint,
    render_template,
    request,
    redirect,
    url_for,
    jsonify,
    g,
)

from core.auth import (
    hash_password,
    verify_password,
    validate_password_strength,
    validate_username,
    validate_email,
    generate_secure_token,
    hash_token,
)
from core.db import queries
from web.auth_middleware import (
    login_user,
    logout_user,
    set_session_cookie,
    login_required,
    anonymous_required,
    get_current_user,
    get_client_ip,
    is_authenticated,
)
from web.mail import send_email, is_smtp_configured

auth_views = Blueprint("auth_views", __name__)


def _render_auth_page(template: str, **context):
    """Helper to render auth templates with common branding context."""
    user = get_current_user()
    return render_template(
        template,
        current_user=user,
        app_name="StegoVault",
        version="1.5.0",
        smtp_configured=is_smtp_configured(),
        **context,
    )


# ── Landing / Welcome ────────────────────────────────────────────────────────

@auth_views.route("/welcome")
def welcome():
    """Public landing page showcasing StegoVault steganography capabilities."""
    if is_authenticated() and g.current_user:
        return redirect(url_for("auth_views.dashboard_page"))
    return _render_auth_page("welcome.html")


# ── Registration ─────────────────────────────────────────────────────────────

@auth_views.route("/register", methods=["GET", "POST"])
@anonymous_required
def register():
    """Create account page and registration handler."""
    if request.method == "GET":
        return _render_auth_page("register.html")

    # Handle POST
    is_json = request.is_json
    data = request.get_json(silent=True) or request.form

    full_name = str(data.get("full_name", "")).strip()
    username = str(data.get("username", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    confirm_password = str(data.get("confirm_password", ""))
    terms = str(data.get("terms", "")).lower() in ("1", "true", "yes", "on")

    # Validations
    if not full_name:
        err = "Full name is required."
        return jsonify({"error": err, "field": "full_name"}), 400 if is_json else _render_auth_page("register.html", error=err, form_data=data)

    u_ok, u_msg = validate_username(username)
    if not u_ok:
        return jsonify({"error": u_msg, "field": "username"}), 400 if is_json else _render_auth_page("register.html", error=u_msg, form_data=data)

    e_ok, e_msg = validate_email(email)
    if not e_ok:
        return jsonify({"error": e_msg, "field": "email"}), 400 if is_json else _render_auth_page("register.html", error=e_msg, form_data=data)

    p_ok, p_msg = validate_password_strength(password)
    if not p_ok:
        return jsonify({"error": p_msg, "field": "password"}), 400 if is_json else _render_auth_page("register.html", error=p_msg, form_data=data)

    if password != confirm_password:
        err = "Passwords do not match."
        return jsonify({"error": err, "field": "confirm_password"}), 400 if is_json else _render_auth_page("register.html", error=err, form_data=data)

    if not terms:
        err = "You must agree to the Terms and Conditions."
        return jsonify({"error": err, "field": "terms"}), 400 if is_json else _render_auth_page("register.html", error=err, form_data=data)

    # Check for existing email or username
    if queries.get_user_by_email(email):
        err = "An account with this email address already exists."
        return jsonify({"error": err, "field": "email"}), 400 if is_json else _render_auth_page("register.html", error=err, form_data=data)

    if queries.get_user_by_username(username):
        err = "This username is already taken. Please choose another."
        return jsonify({"error": err, "field": "username"}), 400 if is_json else _render_auth_page("register.html", error=err, form_data=data)

    # Hash password with Argon2id and insert
    p_hash = hash_password(password)
    user_id = queries.create_user(full_name=full_name, username=username, email=email, password_hash=p_hash)

    # Generate email verification token (valid 24h)
    raw_token, token_hash = generate_secure_token(32)
    exp = datetime.now(timezone.utc) + timedelta(hours=24)
    queries.create_email_verification_token(user_id=user_id, token_hash=token_hash, expires_at=exp)

    # Send verification email
    verify_url = url_for("auth_views.verify_email", token=raw_token, _external=True)
    html_msg = f"""
    <div style="font-family: sans-serif; background: #080b11; color: #f1f5f9; padding: 24px; border-radius: 8px;">
      <h2 style="color: #06b6d4;">Welcome to StegoVault, {full_name}!</h2>
      <p>Thank you for creating an account. Please verify your email address by clicking the link below:</p>
      <p style="margin: 24px 0;">
        <a href="{verify_url}" style="background: #06b6d4; color: #080b11; padding: 12px 20px; text-decoration: none; font-weight: bold; border-radius: 6px;">Verify Email Address</a>
      </p>
      <p style="color: #94a3b8; font-size: 0.85em;">This verification link will expire in 24 hours.</p>
    </div>
    """
    text_msg = f"Welcome to StegoVault, {full_name}!\nPlease verify your email by opening: {verify_url}\nLink expires in 24 hours."
    email_sent, email_status = send_email(email, "Verify your StegoVault account", html_msg, text_msg)

    # Automatically log the user in
    session_token, session_exp = login_user(user_id=user_id, remember_me=False)

    if is_json:
        resp = jsonify({
            "success": True,
            "message": "Account created successfully.",
            "email_sent": email_sent,
            "redirect_url": url_for("auth_views.dashboard_page"),
        })
        return set_session_cookie(resp, session_token, session_exp, remember_me=False)

    resp = redirect(url_for("auth_views.dashboard_page"))
    return set_session_cookie(resp, session_token, session_exp, remember_me=False)


# ── Sign In ──────────────────────────────────────────────────────────────────

@auth_views.route("/login", methods=["GET", "POST"])
@anonymous_required
def login():
    """User login page and credential verification."""
    next_url = request.args.get("next") or url_for("auth_views.dashboard_page")

    if request.method == "GET":
        return _render_auth_page("login.html", next_url=next_url)

    is_json = request.is_json
    data = request.get_json(silent=True) or request.form

    identifier = str(data.get("identifier", "")).strip()
    password = str(data.get("password", ""))
    remember_me = str(data.get("remember_me", "")).lower() in ("1", "true", "yes", "on")

    ip = get_client_ip()

    if not identifier or not password:
        err = "Please enter both your username/email and password."
        return jsonify({"error": err}), 400 if is_json else _render_auth_page("login.html", error=err, identifier=identifier, next_url=next_url)

    # Brute-force rate limiting check (5 attempts per 5 minutes)
    if queries.is_login_rate_limited(ip, identifier, max_attempts=5, window_seconds=300):
        err = "Too many failed sign-in attempts. Please wait 5 minutes before trying again."
        return jsonify({"error": err, "code": "rate_limited"}), 429 if is_json else _render_auth_page("login.html", error=err, identifier=identifier, next_url=next_url)

    # Look up user by email or username
    user = queries.get_user_by_login(identifier)
    if not user:
        queries.record_login_attempt(ip, identifier, success=False)
        err = "Invalid username/email or password."
        return jsonify({"error": err}), 401 if is_json else _render_auth_page("login.html", error=err, identifier=identifier, next_url=next_url)

    # Verify password with Argon2id
    if not verify_password(user["password_hash"], password):
        queries.record_login_attempt(ip, identifier, success=False)
        err = "Invalid username/email or password."
        return jsonify({"error": err}), 401 if is_json else _render_auth_page("login.html", error=err, identifier=identifier, next_url=next_url)

    # Successful login: record success
    queries.record_login_attempt(ip, identifier, success=True)

    # Generate session and cookie
    session_token, session_exp = login_user(user["id"], remember_me=remember_me)

    target_redirect = next_url if (next_url and next_url.startswith("/")) else url_for("auth_views.dashboard_page")

    if is_json:
        resp = jsonify({
            "success": True,
            "message": "Signed in successfully.",
            "redirect_url": target_redirect,
            "user": {
                "id": user["id"],
                "full_name": user["full_name"],
                "username": user["username"],
                "email": user["email"],
                "email_verified": bool(user["email_verified"]),
            },
        })
        return set_session_cookie(resp, session_token, session_exp, remember_me=remember_me)

    resp = redirect(target_redirect)
    return set_session_cookie(resp, session_token, session_exp, remember_me=remember_me)


# ── Sign Out ─────────────────────────────────────────────────────────────────

@auth_views.route("/logout", methods=["GET", "POST"])
def logout():
    """Terminate current user session and remove cookie."""
    resp = redirect(url_for("auth_views.login"))
    logout_user(resp)
    return resp


# ── Password Recovery ────────────────────────────────────────────────────────

@auth_views.route("/forgot-password", methods=["GET", "POST"])
@anonymous_required
def forgot_password():
    """Request password reset link via email."""
    if request.method == "GET":
        return _render_auth_page("forgot_password.html")

    is_json = request.is_json
    data = request.get_json(silent=True) or request.form
    email = str(data.get("email", "")).strip().lower()

    if not email:
        err = "Please enter your registered email address."
        return jsonify({"error": err}), 400 if is_json else _render_auth_page("forgot_password.html", error=err)

    # Always return a generic success message to prevent user enumeration
    generic_msg = "If an account exists with that email, we have sent a password reset link."

    user = queries.get_user_by_email(email)
    if user:
        # Invalidate old reset tokens
        queries.invalidate_pending_reset_tokens(user["id"])

        # Generate single-use token (valid 1 hour)
        raw_token, token_hash = generate_secure_token(32)
        exp = datetime.now(timezone.utc) + timedelta(hours=1)
        queries.create_password_reset_token(user_id=user["id"], token_hash=token_hash, expires_at=exp)

        # Dispatch email
        reset_url = url_for("auth_views.reset_password", token=raw_token, _external=True)
        html_msg = f"""
        <div style="font-family: sans-serif; background: #080b11; color: #f1f5f9; padding: 24px; border-radius: 8px;">
          <h2 style="color: #06b6d4;">StegoVault Password Reset</h2>
          <p>We received a request to reset the password for your account.</p>
          <p style="margin: 24px 0;">
            <a href="{reset_url}" style="background: #06b6d4; color: #080b11; padding: 12px 20px; text-decoration: none; font-weight: bold; border-radius: 6px;">Reset Password</a>
          </p>
          <p style="color: #94a3b8; font-size: 0.85em;">This link expires in 1 hour. If you did not request this, please ignore this email.</p>
        </div>
        """
        text_msg = f"Reset your StegoVault password:\n{reset_url}\nLink expires in 1 hour."
        send_email(email, "Reset your StegoVault password", html_msg, text_msg)

    if is_json:
        return jsonify({"success": True, "message": generic_msg})
    return _render_auth_page("forgot_password.html", success=generic_msg)


@auth_views.route("/reset-password/<token>", methods=["GET", "POST"])
@anonymous_required
def reset_password(token: str):
    """Set new password using verified recovery token."""
    token_hash = hash_token(token)
    token_record = queries.get_password_reset_token(token_hash)

    if not token_record:
        err = "This password reset link is invalid, has expired, or has already been used."
        if request.is_json:
            return jsonify({"error": err}), 400
        return _render_auth_page("reset_password.html", invalid_token=True, error=err), 400

    if request.method == "GET":
        return _render_auth_page("reset_password.html", token=token)

    is_json = request.is_json
    data = request.get_json(silent=True) or request.form

    new_password = str(data.get("password", ""))
    confirm_password = str(data.get("confirm_password", ""))

    p_ok, p_msg = validate_password_strength(new_password)
    if not p_ok:
        return jsonify({"error": p_msg}), 400 if is_json else _render_auth_page("reset_password.html", token=token, error=p_msg)

    if new_password != confirm_password:
        err = "Passwords do not match."
        return jsonify({"error": err}), 400 if is_json else _render_auth_page("reset_password.html", token=token, error=err)

    # Consume token
    queries.mark_password_reset_token_used(token_record["id"])

    # Hash and update password
    new_hash = hash_password(new_password)
    queries.update_user_password(token_record["user_id"], new_hash)

    # Invalidate all existing sessions for security
    queries.delete_all_user_sessions(token_record["user_id"])

    msg = "Your password has been successfully reset. Please sign in with your new password."
    if is_json:
        return jsonify({"success": True, "message": msg, "redirect_url": url_for("auth_views.login")})
    return _render_auth_page("login.html", success=msg)


# ── Email Verification ───────────────────────────────────────────────────────

@auth_views.route("/verify-email/<token>")
def verify_email(token: str):
    """Verify user email address using single-use verification token."""
    token_hash = hash_token(token)
    token_record = queries.get_email_verification_token(token_hash)

    if not token_record:
        if request.is_json:
            return jsonify({"error": "Invalid or expired verification link."}), 400
        return _render_auth_page("verify_email.html", success=False, error="Invalid or expired verification link."), 400

    queries.mark_email_verification_token_used(token_record["id"])
    queries.set_email_verified(token_record["user_id"], True)

    return _render_auth_page("verify_email.html", success=True, message="Your email address has been verified successfully!")


@auth_views.route("/api/auth/resend-verification", methods=["POST"])
@login_required
def resend_verification():
    """Resend email verification link for the authenticated user."""
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    if user["email_verified"]:
        return jsonify({"error": "Your email is already verified."}), 400

    raw_token, token_hash = generate_secure_token(32)
    exp = datetime.now(timezone.utc) + timedelta(hours=24)
    queries.create_email_verification_token(user_id=user["id"], token_hash=token_hash, expires_at=exp)

    verify_url = url_for("auth_views.verify_email", token=raw_token, _external=True)
    html_msg = f"""
    <div style="font-family: sans-serif; background: #080b11; color: #f1f5f9; padding: 24px; border-radius: 8px;">
      <h2 style="color: #06b6d4;">Verify your StegoVault email</h2>
      <p>Click below to verify your email address:</p>
      <p style="margin: 24px 0;">
        <a href="{verify_url}" style="background: #06b6d4; color: #080b11; padding: 12px 20px; text-decoration: none; font-weight: bold; border-radius: 6px;">Verify Email Address</a>
      </p>
      <p style="color: #94a3b8; font-size: 0.85em;">Expires in 24 hours.</p>
    </div>
    """
    text_msg = f"Verify your StegoVault account:\n{verify_url}\nLink expires in 24 hours."
    sent, status = send_email(user["email"], "Verify your StegoVault account", html_msg, text_msg)

    if not sent:
        return jsonify({
            "success": False,
            "smtp_configured": False,
            "message": "SMTP is not configured on this server. Check server logs for the verification link.",
        }), 200

    return jsonify({"success": True, "message": "Verification link has been sent to your email."})


# ── Personalized User Dashboard ──────────────────────────────────────────────

@auth_views.route("/dashboard")
@login_required
def dashboard_page():
    """User dashboard featuring account summary, quick tools, and real activity."""
    user = get_current_user()
    if not user:
        return redirect(url_for("auth_views.login"))

    stats = queries.get_user_activity_stats(user["id"])
    recent_activity = queries.get_user_activity(user["id"], limit=10)

    return _render_auth_page(
        "dashboard.html",
        user=user,
        stats=stats,
        recent_activity=recent_activity,
        active_nav="dashboard",
    )


# ── Profile & Account Settings ───────────────────────────────────────────────

@auth_views.route("/profile", methods=["GET", "POST"])
@login_required
def profile_page():
    """Account settings: profile update, security, active sessions, danger zone."""
    user = get_current_user()
    if not user:
        return redirect(url_for("auth_views.login"))

    if request.method == "POST":
        data = request.form
        full_name = str(data.get("full_name", "")).strip()
        username = str(data.get("username", "")).strip()

        if not full_name:
            return _render_auth_page("profile.html", user=user, error="Full name is required.")

        u_ok, u_msg = validate_username(username)
        if not u_ok:
            return _render_auth_page("profile.html", user=user, error=u_msg)

        # Check username uniqueness if changed
        existing = queries.get_user_by_username(username)
        if existing and existing["id"] != user["id"]:
            return _render_auth_page("profile.html", user=user, error="Username is already taken.")

        queries.update_user_profile(user["id"], full_name, username)
        user = queries.get_user_by_id(user["id"])
        g.current_user = user
        return _render_auth_page("profile.html", user=user, success="Profile updated successfully.")

    sessions = queries.get_user_active_sessions(user["id"])
    current_token_hash = getattr(g, "current_session", {}).get("session_token_hash")

    return _render_auth_page(
        "profile.html",
        user=user,
        sessions=sessions,
        current_session_hash=current_token_hash,
        active_nav="profile",
    )


@auth_views.route("/api/user/change-password", methods=["POST"])
@login_required
def change_password():
    """Change user password after verifying existing password."""
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json(silent=True) or request.form
    current_pw = str(data.get("current_password", ""))
    new_pw = str(data.get("new_password", ""))
    confirm_pw = str(data.get("confirm_password", ""))

    if not verify_password(user["password_hash"], current_pw):
        return jsonify({"error": "Current password is incorrect."}), 400

    p_ok, p_msg = validate_password_strength(new_pw)
    if not p_ok:
        return jsonify({"error": p_msg}), 400

    if new_pw != confirm_pw:
        return jsonify({"error": "New passwords do not match."}), 400

    new_hash = hash_password(new_pw)
    queries.update_user_password(user["id"], new_hash)

    # Invalidate all other sessions except current session
    curr_hash = getattr(g, "current_session", {}).get("session_token_hash")
    queries.delete_all_user_sessions(user["id"], except_session_hash=curr_hash)

    return jsonify({"success": True, "message": "Password changed successfully."})


@auth_views.route("/api/user/logout-all", methods=["POST"])
@login_required
def logout_all_sessions():
    """Revoke all sessions for user except current."""
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    curr_hash = getattr(g, "current_session", {}).get("session_token_hash")
    count = queries.delete_all_user_sessions(user["id"], except_session_hash=curr_hash)
    return jsonify({"success": True, "message": f"Logged out from {count} other active session(s)."})


@auth_views.route("/api/user/delete-account", methods=["POST"])
@login_required
def delete_account():
    """Permanently delete user account after password verification."""
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json(silent=True) or request.form
    password = str(data.get("password", ""))

    if not verify_password(user["password_hash"], password):
        return jsonify({"error": "Incorrect password. Account deletion aborted."}), 400

    queries.delete_user(user["id"])
    resp = jsonify({"success": True, "message": "Account has been permanently deleted.", "redirect_url": url_for("auth_views.welcome")})
    logout_user(resp)
    return resp


@auth_views.route("/api/user/activity")
@login_required
def user_activity_api():
    """Retrieve user recent activity log."""
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    items = queries.get_user_activity(user["id"], limit=30)
    return jsonify({"activity": items})


@auth_views.route("/api/user/stats")
@login_required
def user_stats_api():
    """Retrieve user operations telemetry stats."""
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    stats = queries.get_user_activity_stats(user["id"])
    return jsonify({"stats": stats})
