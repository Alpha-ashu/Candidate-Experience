from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, HTTPException

from ..security.jwt import decode_jwt, require_scope
from ..utils.broadcast import broker


router = APIRouter(tags=["ws"])


@router.websocket("/interview/{session_id}/stream")
async def ws_stream(websocket: WebSocket, session_id: str, token: Optional[str] = Query(default=None)):
    if not token:
        await websocket.close(code=4401)
        return
    try:
        claims = decode_jwt(token, audience="interview-ws")
        require_scope(claims, f"ws:interview:{session_id}")
    except HTTPException:
        await websocket.close(code=4403)
        return

    await websocket.accept()
    room = f"session:{session_id}"
    await broker.join(room, websocket)
    try:
        while True:
            # We don't expect client messages in this prototype. Keep alive by reading pings.
            await websocket.receive_text()
    except WebSocketDisconnect:
        await broker.leave(room, websocket)
