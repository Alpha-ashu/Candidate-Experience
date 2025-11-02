from typing import Optional

from fastapi import Depends, Header, HTTPException, Request, status

from .jwt import decode_jwt, require_scope


def get_bearer_token(authorization: Optional[str] = Header(default=None)) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing_bearer")
    return authorization.split(" ", 1)[1]


def auth_user(token: str = Depends(get_bearer_token)) -> dict:
    return decode_jwt(token, audience="user-api")


def auth_ist(token: str = Depends(get_bearer_token)) -> dict:
    claims = decode_jwt(token, audience="interview-api")
    require_scope(claims, f"interview:session:{claims.get('sessionId')}")
    return claims


def auth_ai_proxy(token: str = Depends(get_bearer_token)) -> dict:
    claims = decode_jwt(token, audience="ai-proxy")
    require_scope(claims, "ai:ask")
    return claims


def auth_acet(token: str = Depends(get_bearer_token)) -> dict:
    claims = decode_jwt(token, audience="anti-cheat")
    require_scope(claims, f"anti-cheat:emit:{claims.get('sessionId')}")
    return claims


def get_session_cookie(request: Request) -> str:
    cookie = request.cookies.get("session")
    if not cookie:
        raise HTTPException(status_code=401, detail="missing_session")
    return cookie


def auth_session_cookie(token: str = Depends(get_session_cookie)) -> dict:
    return decode_jwt(token, audience="session")
