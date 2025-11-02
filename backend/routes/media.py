from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from starlette.responses import JSONResponse
import hashlib
import os

from ..security.deps import auth_session_cookie
from ..security.jwt import mint_jwt
from ..config import settings
from ..utils.ids import new_id


router = APIRouter(prefix="/media", tags=["media"])


@router.post("/issue-upt")
async def issue_upt(sessionId: str, _=Depends(auth_session_cookie)):
    token = mint_jwt(
        sub="media",
        role="system",
        scopes=[f"upload:session:{sessionId}"],
        aud="upload",
        session_id=sessionId,
        ttl_seconds=settings.ttl_upt,
    )
    return {"upt": token}


@router.post("/upload")
async def upload_media(token: str, file: UploadFile = File(...)):
    # Validate token
    from ..security.jwt import decode_jwt, require_scope

    claims = decode_jwt(token, audience="upload")
    session_id = claims.get("sessionId")
    require_scope(claims, f"upload:session:{session_id}")

    data = await file.read()
    checksum = hashlib.sha256(data).hexdigest()
    os.makedirs(".uploads", exist_ok=True)
    fname = f".uploads/{session_id}_{new_id()}_{file.filename}"
    with open(fname, "wb") as f:
        f.write(data)
    return JSONResponse({"url": fname, "checksum": checksum})
