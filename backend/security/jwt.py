import time
import uuid
from typing import Any, Dict, List, Optional

import jwt
from fastapi import HTTPException, status

from ..config import settings


def mint_jwt(
    sub: str,
    role: str,
    scopes: List[str],
    aud: str,
    session_id: Optional[str] = None,
    ttl_seconds: int = 900,
    extra: Optional[Dict[str, Any]] = None,
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
    }
    if session_id:
        payload["sessionId"] = session_id
    if extra:
        payload.update(extra)

    return jwt.encode(payload, settings.auth_secret, algorithm="HS256")


def decode_jwt(token: str, audience: Optional[str] = None) -> Dict[str, Any]:
    try:
        options = {"require": ["exp", "iat", "aud"]} if audience else {"require": ["exp", "iat"]}
        return jwt.decode(
            token,
            settings.auth_secret,
            algorithms=["HS256"],
            audience=audience,
            options=options,
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="token_expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")


def require_scope(claims: Dict[str, Any], required: str) -> None:
    scopes: List[str] = claims.get("scope", [])
    if required in scopes:
        return
    # Support prefix matching for session-bound scopes like interview:session:<id>
    # Example required: "interview:session:abc123" should match exact.
    if any(s == required for s in scopes):
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="insufficient_scope")
