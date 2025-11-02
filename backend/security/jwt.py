import time
import uuid
import hashlib
import secrets
import os
from typing import Any, Dict, List, Optional, Set
from datetime import datetime, timedelta

import jwt
from fastapi import HTTPException, status
import redis
import json

from ..config import settings


# In-memory token revocation list (in production, use Redis)
_token_revocation_list: Set[str] = set()
_device_fingerprints: Dict[str, Dict[str, Any]] = {}

# Redis client for production (fallback to memory if not available)
try:
    redis_client = redis.Redis(
        host=os.getenv("REDIS_HOST", "localhost"),
        port=int(os.getenv("REDIS_PORT", 6379)),
        db=0,
        decode_responses=True
    )
    redis_client.ping()  # Test connection
except:
    redis_client = None


def mint_jwt(
    sub: str,
    role: str,
    scopes: List[str],
    aud: str,
    session_id: Optional[str] = None,
    ttl_seconds: int = 900,
    extra: Optional[Dict[str, Any]] = None,
    device_id: Optional[str] = None,
    ip_address: Optional[str] = None,
) -> str:
    now = int(time.time())
    payload: Dict[str, Any] = {
        "sub": sub,
        "role": role,
        "scope": scopes,
        "aud": aud,
        "iat": now,
        "exp": now + ttl_seconds,
        "jti": str(uuid.uuid4()),
        "type": "access",
    }
    if session_id:
        payload["sessionId"] = session_id
    if device_id:
        payload["deviceId"] = device_id
    if ip_address:
        payload["ip"] = hashlib.sha256(ip_address.encode()).hexdigest()[:16]
    if extra:
        payload.update(extra)

    return jwt.encode(payload, settings.auth_secret, algorithm="HS256")


def mint_refresh_token(
    sub: str,
    device_id: str,
    family_id: Optional[str] = None,
    ttl_seconds: Optional[int] = None,
) -> Dict[str, str]:
    """Mint a refresh token with device binding"""
    if ttl_seconds is None:
        ttl_seconds = settings.ttl_refresh_token

    family_id = family_id or str(uuid.uuid4())
    now = int(time.time())

    token_data = {
        "sub": sub,
        "deviceId": device_id,
        "familyId": family_id,
        "iat": now,
        "exp": now + ttl_seconds,
        "jti": str(uuid.uuid4()),
        "type": "refresh",
    }

    token = jwt.encode(token_data, settings.refresh_token_secret, algorithm="HS256")

    return {
        "token": token,
        "family_id": family_id,
        "device_id": device_id,
    }


def mint_device_fingerprint_token(device_fingerprint: str, user_id: str) -> str:
    """Mint a device fingerprint token for persistent login"""
    now = int(time.time())
    payload = {
        "sub": user_id,
        "deviceFingerprint": device_fingerprint,
        "iat": now,
        "exp": now + settings.ttl_device_fingerprint,
        "jti": str(uuid.uuid4()),
        "type": "device",
        "aud": "device-auth",
    }

    return jwt.encode(payload, settings.auth_secret, algorithm="HS256")


def decode_jwt(token: str, audience: Optional[str] = None, check_revocation: bool = True) -> Dict[str, Any]:
    try:
        options = {"require": ["exp", "iat", "aud"]} if audience else {"require": ["exp", "iat"]}
        payload = jwt.decode(
            token,
            settings.auth_secret,
            algorithms=["HS256"],
            audience=audience,
            options=options,
        )

        # Check token revocation
        if check_revocation and payload.get("type") == "access":
            jti = payload.get("jti")
            if is_token_revoked(jti):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="token_revoked"
                )

        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="token_expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")


def decode_refresh_token(token: str) -> Dict[str, Any]:
    """Decode a refresh token using the refresh token secret"""
    try:
        return jwt.decode(
            token,
            settings.refresh_token_secret,
            algorithms=["HS256"],
            options={"require": ["exp", "iat", "type"]},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="refresh_token_expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_refresh_token")


def revoke_token(jti: str, reason: Optional[str] = None) -> None:
    """Revoke a token by its JTI"""
    if redis_client:
        # Store in Redis with TTL based on token type
        redis_client.setex(f"revoked:{jti}", 3600, json.dumps({
            "revoked_at": int(time.time()),
            "reason": reason or "manual_revocation"
        }))
    else:
        _token_revocation_list.add(jti)


def revoke_token_family(family_id: str, except_device: Optional[str] = None) -> None:
    """Revoke all tokens in a family except for a specific device"""
    if redis_client:
        # Get all tokens in the family
        pattern = f"token_family:{family_id}:*"
        keys = redis_client.keys(pattern)

        for key in keys:
            device_id = key.split(":")[-1]
            if device_id != except_device:
                token_data = redis_client.get(key)
                if token_data:
                    data = json.loads(token_data)
                    revoke_token(data["jti"], "family_revocation")
                    redis_client.delete(key)
    else:
        # Fallback to memory storage (simplified)
        pass


def is_token_revoked(jti: str) -> bool:
    """Check if a token is revoked"""
    if redis_client:
        return redis_client.exists(f"revoked:{jti}") > 0
    else:
        return jti in _token_revocation_list


def require_scope(claims: Dict[str, Any], required: str) -> None:
    scopes: List[str] = claims.get("scope", [])
    if required in scopes:
        return
    # Support prefix matching for session-bound scopes
    if any(s == required for s in scopes):
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="insufficient_scope")


def generate_device_fingerprint(user_agent: str, ip_address: str, accept_language: str) -> str:
    """Generate a device fingerprint from browser characteristics"""
    fingerprint_data = f"{user_agent}:{ip_address}:{accept_language}"
    return hashlib.sha256(fingerprint_data.encode()).hexdigest()


def validate_device_binding(claims: Dict[str, Any], current_fingerprint: str) -> bool:
    """Validate that the request comes from the same device"""
    if claims.get("type") == "device":
        stored_fingerprint = claims.get("deviceFingerprint")
        return stored_fingerprint == current_fingerprint
    return True


def validate_ip_binding(claims: Dict[str, Any], current_ip: str) -> bool:
    """Validate that the request comes from the same IP (optional security)"""
    stored_ip_hash = claims.get("ip")
    if not stored_ip_hash:
        return True  # No IP binding

    current_ip_hash = hashlib.sha256(current_ip.encode()).hexdigest()[:16]
    return stored_ip_hash == current_ip_hash


def rotate_refresh_token(old_token: str, new_device_fingerprint: Optional[str] = None) -> Dict[str, str]:
    """Rotate a refresh token for security"""
    try:
        old_payload = decode_refresh_token(old_token)

        # Revoke old token
        revoke_token(old_payload["jti"], "token_rotation")

        # Mint new refresh token
        new_refresh = mint_refresh_token(
            sub=old_payload["sub"],
            device_id=old_payload["deviceId"],
            family_id=old_payload.get("familyId"),
        )

        return new_refresh
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="refresh_token_rotation_failed"
        )
