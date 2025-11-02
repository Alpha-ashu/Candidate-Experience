from datetime import timedelta, datetime
from typing import Optional, Dict, Any
from fastapi import APIRouter, Response, Request, HTTPException, status, Depends
from slowapi import Limiter
from slowapi.util import get_remote_address
import pyotp
import qrcode
import io
import base64
from fastapi.responses import JSONResponse
import secrets
import time

from ..config import settings
from ..security.jwt import (
    mint_jwt, mint_refresh_token, decode_refresh_token,
    rotate_refresh_token, generate_device_fingerprint,
    mint_device_fingerprint_token, revoke_token_family
)
from ..schemas import LoginRequest, UserJWT
from ..db import get_database
from ..main import limiter

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=UserJWT)
@limiter.limit(settings.rate_limits["auth_endpoints"])
async def login(req: LoginRequest, response: Response, request: Request):
    """Enhanced login with device fingerprinting and refresh token"""
    # Generate device fingerprint
    user_agent = request.headers.get("user-agent", "")
    ip_address = get_remote_address(request)
    accept_language = request.headers.get("accept-language", "")

    device_fingerprint = generate_device_fingerprint(user_agent, ip_address, accept_language)
    device_id = str(uuid.uuid4())

    # In a real app, validate credentials. Here, accept email.
    sub = req.email.lower()

    # Store user session info (in production, use database)
    user_data = {
        "email": sub,
        "name": req.name or sub.split("@")[0],
        "device_fingerprint": device_fingerprint,
        "device_id": device_id,
        "ip_address": ip_address,
        "login_time": datetime.utcnow(),
        "mfa_enabled": settings.enable_mfa
    }

    # Store in database
    db = get_database()
    await db.users.update_one(
        {"email": sub},
        {"$set": user_data, "$setOnInsert": {"created_at": datetime.utcnow()}},
        upsert=True
    )

    # Mint tokens
    user_jwt = mint_jwt(
        sub=sub,
        role="candidate",
        scopes=["user"],
        aud="user-api",
        ttl_seconds=settings.ttl_user_jwt,
        device_id=device_id,
        ip_address=ip_address,
    )

    refresh_data = mint_refresh_token(
        sub=sub,
        device_id=device_id,
    )

    session_token = mint_jwt(
        sub=sub,
        role="candidate",
        scopes=["session"],
        aud="session",
        ttl_seconds=settings.ttl_user_jwt,
        device_id=device_id,
    )

    # Set session cookie
    response.set_cookie(
        key="session",
        value=session_token,
        httponly=True,
        samesite="strict",
        secure=settings.cookie_secure,
        domain=settings.cookie_domain,
        max_age=settings.ttl_user_jwt,
    )

    # Set refresh token cookie (more secure, httpOnly)
    response.set_cookie(
        key="refresh_token",
        value=refresh_data["token"],
        httponly=True,
        samesite="strict",
        secure=settings.cookie_secure,
        domain=settings.cookie_domain,
        max_age=settings.ttl_refresh_token,
    )

    return UserJWT(
        token=user_jwt,
        refresh_token=refresh_data["token"],
        device_id=device_id,
        mfa_required=settings.enable_mfa
    )


@router.post("/refresh")
@limiter.limit("10/minute")
async def refresh_token(request: Request, response: Response):
    """Refresh access token using refresh token"""
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="no_refresh_token")

    try:
        # Decode refresh token
        refresh_payload = decode_refresh_token(refresh_token)

        # Generate new device fingerprint
        user_agent = request.headers.get("user-agent", "")
        ip_address = get_remote_address(request)
        accept_language = request.headers.get("accept-language", "")
        device_fingerprint = generate_device_fingerprint(user_agent, ip_address, accept_language)

        # Rotate refresh token for security
        new_refresh = rotate_refresh_token(refresh_token)

        # Mint new access token
        user_jwt = mint_jwt(
            sub=refresh_payload["sub"],
            role="candidate",
            scopes=["user"],
            aud="user-api",
            ttl_seconds=settings.ttl_user_jwt,
            device_id=refresh_payload["deviceId"],
            ip_address=ip_address,
        )

        # Update refresh token cookie
        response.set_cookie(
            key="refresh_token",
            value=new_refresh["token"],
            httponly=True,
            samesite="strict",
            secure=settings.cookie_secure,
            domain=settings.cookie_domain,
            max_age=settings.ttl_refresh_token,
        )

        return UserJWT(token=user_jwt)

    except Exception as e:
        raise HTTPException(status_code=401, detail="invalid_refresh_token")


@router.post("/logout")
@limiter.limit("20/minute")
async def logout(request: Request, response: Response):
    """Logout user and revoke tokens"""
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        try:
            refresh_payload = decode_refresh_token(refresh_token)
            # Revoke all tokens in the family
            revoke_token_family(refresh_payload.get("familyId"))
        except:
            pass  # Token might be invalid, just continue

    # Clear cookies
    response.delete_cookie(key="session", domain=settings.cookie_domain)
    response.delete_cookie(key="refresh_token", domain=settings.cookie_domain)

    return {"message": "logged_out_successfully"}


# MFA Setup endpoints
@router.post("/mfa/setup")
@limiter.limit("5/minute")
async def setup_mfa(request: Request):
    """Setup MFA for user (TOTP)"""
    if not settings.enable_mfa:
        raise HTTPException(status_code=403, detail="mfa_disabled")

    # Extract user from session (simplified)
    session_token = request.cookies.get("session")
    if not session_token:
        raise HTTPException(status_code=401, detail="no_session")

    # For demo, generate a secret (in production, store per user)
    totp_secret = pyotp.random_base32()

    # Generate QR code
    totp_uri = pyotp.totp.TOTP(totp_secret).provisioning_uri(
        name="user@example.com",  # Replace with actual email
        issuer_name="First Round AI"
    )

    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(totp_uri)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    qr_code_data = base64.b64encode(buffer.getvalue()).decode()

    # Store secret temporarily (in production, store in database)
    temp_mfa_secrets = {}  # In production, use Redis with TTL
    temp_mfa_secrets["user@example.com"] = totp_secret

    return {
        "secret": totp_secret,
        "qr_code": f"data:image/png;base64,{qr_code_data}",
        "manual_entry_key": totp_secret,
        "backup_codes": [secrets.token_hex(4) for _ in range(10)]
    }


@router.post("/mfa/verify")
@limiter.limit("10/minute")
async def verify_mfa(request: Request, data: Dict[str, str]):
    """Verify MFA code during login"""
    if not settings.enable_mfa:
        raise HTTPException(status_code=403, detail="mfa_disabled")

    code = data.get("code")
    if not code or len(code) != 6:
        raise HTTPException(status_code=400, detail="invalid_code_format")

    # In production, get user's MFA secret from database
    user_secret = "JBSWY3DPEHPK3PXP"  # Demo secret

    totp = pyotp.TOTP(user_secret)
    if not totp.verify(code):
        raise HTTPException(status_code=401, detail="invalid_mfa_code")

    return {"verified": True}


# OAuth endpoints (simplified Google OAuth)
@router.get("/oauth/google")
@limiter.limit("10/minute")
async def google_oauth_login():
    """Initiate Google OAuth flow"""
    if not settings.enable_oauth or not settings.google_oauth_client_id:
        raise HTTPException(status_code=403, detail="oauth_disabled")

    oauth_params = {
        "client_id": settings.google_oauth_client_id,
        "redirect_uri": settings.oauth_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": secrets.token_urlsafe(32),
    }

    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{'&'.join([f'{k}={v}' for k, v in oauth_params.items()])}"

    return {"auth_url": auth_url}


@router.post("/oauth/google/callback")
@limiter.limit("10/minute")
async def google_oauth_callback(request: Request, response: Response, data: Dict[str, str]):
    """Handle Google OAuth callback"""
    if not settings.enable_oauth:
        raise HTTPException(status_code=403, detail="oauth_disabled")

    code = data.get("code")
    state = data.get("state")

    if not code:
        raise HTTPException(status_code=400, detail="missing_code")

    # In production, exchange code for tokens with Google
    # For demo, simulate successful OAuth
    google_user_info = {
        "email": "user@gmail.com",
        "name": "Google User",
        "picture": "https://example.com/avatar.jpg",
        "verified": True
    }

    # Create user account or login existing
    sub = google_user_info["email"].lower()

    # Device fingerprinting
    user_agent = request.headers.get("user-agent", "")
    ip_address = get_remote_address(request)
    accept_language = request.headers.get("accept-language", "")
    device_fingerprint = generate_device_fingerprint(user_agent, ip_address, accept_language)
    device_id = str(uuid.uuid4())

    # Store/update user in database
    db = get_database()
    await db.users.update_one(
        {"email": sub},
        {"$set": {
            "email": sub,
            "name": google_user_info["name"],
            "oauth_provider": "google",
            "oauth_verified": google_user_info["verified"],
            "device_fingerprint": device_fingerprint,
            "device_id": device_id,
            "last_login": datetime.utcnow()
        }, "$setOnInsert": {"created_at": datetime.utcnow()}},
        upsert=True
    )

    # Mint tokens
    user_jwt = mint_jwt(
        sub=sub,
        role="candidate",
        scopes=["user", "oauth"],
        aud="user-api",
        ttl_seconds=settings.ttl_user_jwt,
        device_id=device_id,
        ip_address=ip_address,
        extra={"oauth_provider": "google"}
    )

    refresh_data = mint_refresh_token(
        sub=sub,
        device_id=device_id,
    )

    session_token = mint_jwt(
        sub=sub,
        role="candidate",
        scopes=["session"],
        aud="session",
        ttl_seconds=settings.ttl_user_jwt,
        device_id=device_id,
    )

    # Set cookies
    response.set_cookie(
        key="session",
        value=session_token,
        httponly=True,
        samesite="strict",
        secure=settings.cookie_secure,
        domain=settings.cookie_domain,
        max_age=settings.ttl_user_jwt,
    )

    response.set_cookie(
        key="refresh_token",
        value=refresh_data["token"],
        httponly=True,
        samesite="strict",
        secure=settings.cookie_secure,
        domain=settings.cookie_domain,
        max_age=settings.ttl_refresh_token,
    )

    return UserJWT(
        token=user_jwt,
        refresh_token=refresh_data["token"],
        device_id=device_id
    )


@router.get("/devices")
@limiter.limit("20/minute")
async def list_devices(request: Request):
    """List user's active devices/sessions"""
    session_token = request.cookies.get("session")
    if not session_token:
        raise HTTPException(status_code=401, detail="no_session")

    # In production, get from database
    # For demo, return mock data
    return {
        "devices": [
            {
                "id": "device1",
                "name": "Chrome on Windows",
                "last_active": "2025-11-01T10:30:00Z",
                "ip_address": "192.168.1.100",
                "current": True
            }
        ]
    }


@router.delete("/devices/{device_id}")
@limiter.limit("10/minute")
async def revoke_device(device_id: str, request: Request):
    """Revoke a specific device/session"""
    session_token = request.cookies.get("session")
    if not session_token:
        raise HTTPException(status_code=401, detail="no_session")

    # In production, revoke specific device tokens
    return {"message": "device_revoked"}


@router.post("/password/reset")
@limiter.limit("5/minute")
async def request_password_reset(request: Request, data: Dict[str, str]):
    """Request password reset"""
    email = data.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="email_required")

    # Generate reset token
    reset_token = secrets.token_urlsafe(32)

    # Store in database with expiry
    db = get_database()
    await db.password_resets.insert_one({
        "email": email.lower(),
        "token": reset_token,
        "expires_at": datetime.utcnow() + timedelta(hours=1),
        "created_at": datetime.utcnow()
    })

    # In production, send email with reset link
    return {"message": "password_reset_sent", "token": reset_token}  # Remove token in production


@router.post("/password/reset/confirm")
@limiter.limit("5/minute")
async def confirm_password_reset(data: Dict[str, str]):
    """Confirm password reset with token"""
    token = data.get("token")
    new_password = data.get("new_password")

    if not token or not new_password:
        raise HTTPException(status_code=400, detail="missing_fields")

    # Validate token and expiry
    db = get_database()
    reset_record = await db.password_resets.find_one({"token": token})

    if not reset_record or reset_record["expires_at"] < datetime.utcnow():
        raise HTTPException(status_code=400, detail="invalid_or_expired_token")

    # Update password (in production, hash the password)
    await db.users.update_one(
        {"email": reset_record["email"]},
        {"$set": {"password_updated_at": datetime.utcnow()}}
    )

    # Delete reset token
    await db.password_resets.delete_one({"token": token})

    return {"message": "password_reset_successful"}
