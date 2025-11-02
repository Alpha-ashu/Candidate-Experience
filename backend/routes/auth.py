from datetime import timedelta
from fastapi import APIRouter, Response

from ..config import settings
from ..security.jwt import mint_jwt
from ..schemas import LoginRequest, UserJWT


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=UserJWT)
async def login(req: LoginRequest, response: Response):
    # In a real app, validate credentials. Here, accept email.
    sub = req.email.lower()
    user_jwt = mint_jwt(
        sub=sub,
        role="candidate",
        scopes=["user"],
        aud="user-api",
        ttl_seconds=settings.ttl_user_jwt,
    )
    session_token = mint_jwt(
        sub=sub,
        role="candidate",
        scopes=["session"],
        aud="session",
        ttl_seconds=settings.ttl_user_jwt,
    )
    response.set_cookie(
        key="session",
        value=session_token,
        httponly=True,
        samesite="strict",
        secure=settings.cookie_secure,
        domain=settings.cookie_domain,
        max_age=settings.ttl_user_jwt,
    )
    return UserJWT(token=user_jwt)
