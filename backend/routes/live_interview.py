from fastapi import APIRouter, HTTPException, status, Depends, WebSocket, WebSocketDisconnect
from slowapi import Limiter
from slowapi.util import get_remote_address
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import json
import uuid
import asyncio
import logging

from ..main import limiter
from ..config import settings
from ..schemas import LiveInterviewSession, WebRTCCredentials
from ..security.deps import get_current_user
from ..security.jwt import mint_jwt, decode_jwt
from ..db import get_database

router = APIRouter(prefix="/live-interview", tags=["live-interview"])
logger = logging.getLogger(__name__)

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.session_participants: Dict[str, Dict[str, str]] = {}

    async def connect(self, websocket: WebSocket, session_id: str, user_id: str, user_role: str):
        await websocket.accept()

        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
            self.session_participants[session_id] = {}

        self.active_connections[session_id].append(websocket)
        self.session_participants[session_id][user_id] = {
            "role": user_role,
            "connected_at": datetime.utcnow().isoformat(),
            "websocket_id": id(websocket)
        }

        # Notify other participants
        await self.broadcast_to_session(session_id, {
            "type": "participant_joined",
            "user_id": user_id,
            "role": user_role,
            "timestamp": datetime.utcnow().isoformat()
        }, exclude_websocket=websocket)

    def disconnect(self, websocket: WebSocket, session_id: str, user_id: str):
        if session_id in self.active_connections:
            if websocket in self.active_connections[session_id]:
                self.active_connections[session_id].remove(websocket)

            if user_id in self.session_participants[session_id]:
                del self.session_participants[session_id][user_id]

            # Clean up empty sessions
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]
                del self.session_participants[session_id]

    async def broadcast_to_session(self, session_id: str, message: Dict[str, Any], exclude_websocket: Optional[WebSocket] = None):
        if session_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[session_id]:
                if connection != exclude_websocket:
                    try:
                        await connection.send_text(json.dumps(message))
                    except:
                        disconnected.append(connection)

            # Remove disconnected connections
            for conn in disconnected:
                self.active_connections[session_id].remove(conn)

    async def send_to_user(self, session_id: str, user_id: str, message: Dict[str, Any]):
        if session_id in self.session_participants and user_id in self.session_participants[session_id]:
            websocket_id = self.session_participants[session_id][user_id]["websocket_id"]
            for connection in self.active_connections.get(session_id, []):
                if id(connection) == websocket_id:
                    try:
                        await connection.send_text(json.dumps(message))
                        break
                    except:
                        # Connection is dead, will be cleaned up on next disconnect
                        pass

manager = ConnectionManager()


@router.post("/schedule", response_model=LiveInterviewSession)
@limiter.limit("5/minute")
async def schedule_interview(
    request_data: Dict[str, Any],
    current_user: Dict = Depends(get_current_user)
):
    """Schedule a new live interview session"""
    user_id = current_user["sub"]
    user_role = current_user.get("role", "candidate")

    if not settings.enable_live_interview:
        raise HTTPException(status_code=403, detail="Live interviews are not enabled")

    # Validate required fields
    required_fields = ["candidate_id", "scheduled_time", "duration"]
    for field in required_fields:
        if field not in request_data:
            raise HTTPException(status_code=400, detail=f"Missing required field: {field}")

    try:
        scheduled_time = datetime.fromisoformat(request_data["scheduled_time"].replace('Z', '+00:00'))
        if scheduled_time <= datetime.utcnow():
            raise HTTPException(status_code=400, detail="Scheduled time must be in the future")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid scheduled_time format")

    # Create interview session
    session_id = str(uuid.uuid4())
    session = LiveInterviewSession(
        sessionId=session_id,
        candidateId=request_data["candidate_id"],
        recruiterId=user_id if user_role != "candidate" else request_data.get("recruiter_id"),
        scheduledTime=request_data["scheduled_time"],
        duration=request_data["duration"],
        status="scheduled",
        recordingEnabled=request_data.get("recording_enabled", True),
        notes=request_data.get("notes", "")
    )

    # Save to database
    db = get_database()
    await db.live_interviews.insert_one(session.dict())

    # Generate meeting link
    meeting_link = f"https://meet.firstround.ai/interview/{session_id}"

    # Update session with meeting link
    await db.live_interviews.update_one(
        {"sessionId": session_id},
        {"$set": {"meetingLink": meeting_link}}
    )
    session.meetingLink = meeting_link

    # TODO: Send calendar invitations and email notifications

    return session


@router.get("/sessions")
@limiter.limit("20/minute")
async def get_interview_sessions(
    status_filter: Optional[str] = None,
    current_user: Dict = Depends(get_current_user)
):
    """Get user's interview sessions"""
    user_id = current_user["sub"]
    user_role = current_user.get("role", "candidate")

    db = get_database()

    # Build query based on user role
    if user_role == "candidate":
        query = {"candidateId": user_id}
    else:
        query = {"recruiterId": user_id}

    if status_filter:
        query["status"] = status_filter

    sessions = await db.live_interviews.find(query).sort("scheduledTime", 1).to_list(None)
    return sessions


@router.get("/session/{session_id}")
@limiter.limit("20/minute")
async def get_interview_session(
    session_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """Get specific interview session details"""
    user_id = current_user["sub"]

    db = get_database()
    session = await db.live_interviews.find_one({"sessionId": session_id})

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Verify user has access to this session
    if session["candidateId"] != user_id and session.get("recruiterId") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    return session


@router.post("/session/{session_id}/join")
@limiter.limit("10/minute")
async def join_interview_session(
    session_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """Get WebRTC credentials to join an interview session"""
    user_id = current_user["sub"]
    user_role = current_user.get("role", "candidate")

    # Validate session
    db = get_database()
    session = await db.live_interviews.find_one({"sessionId": session_id})

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Verify user has access to this session
    if session["candidateId"] != user_id and session.get("recruiterId") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Check if session is active or about to start (within 15 minutes)
    scheduled_time = datetime.fromisoformat(session["scheduledTime"].replace('Z', '+00:00'))
    if datetime.utcnow() > scheduled_time + timedelta(minutes=session["duration"]):
        raise HTTPException(status_code=400, detail="Session has ended")

    if datetime.utcnow() < scheduled_time - timedelta(minutes=15):
        raise HTTPException(status_code=400, detail="Session is not yet available to join")

    # Update session status if needed
    if session["status"] == "scheduled" and datetime.utcnow() >= scheduled_time - timedelta(minutes=5):
        await db.live_interviews.update_one(
            {"sessionId": session_id},
            {"$set": {"status": "in_progress", "startedAt": datetime.utcnow().isoformat()}}
        )

    # Generate WebRTC credentials
    webrtc_token = mint_jwt(
        sub=user_id,
        role=user_role,
        scopes=["webrtc", f"session:{session_id}"],
        aud="webrtc-service",
        ttl_seconds=settings.ttl_wst,
        extra={"session_id": session_id, "user_role": user_role}
    )

    # Configure ICE servers (in production, use actual TURN/STUN servers)
    ice_servers = [
        {"urls": "stun:stun.l.google.com:19302"},
        {
            "urls": "turn:turn.firstround.ai:3478",
            "username": "firstround",
            "credential": "turn-password"  # In production, use dynamic credentials
        }
    ]

    credentials = WebRTCCredentials(
        sessionId=session_id,
        iceServers=ice_servers,
        signalingUrl=f"ws://localhost:8000/ws/live-interview/{session_id}",
        accessToken=webrtc_token
    )

    return credentials


@router.put("/session/{session_id}/status")
@limiter.limit("10/minute")
async def update_session_status(
    session_id: str,
    status_data: Dict[str, Any],
    current_user: Dict = Depends(get_current_user)
):
    """Update interview session status"""
    user_id = current_user["sub"]
    new_status = status_data.get("status")

    if new_status not in ["scheduled", "in_progress", "completed", "cancelled"]:
        raise HTTPException(status_code=400, detail="Invalid status")

    db = get_database()
    session = await db.live_interviews.find_one({"sessionId": session_id})

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Verify user has access (recruiters can update, candidates can only cancel)
    if session.get("recruiterId") != user_id:
        if new_status != "cancelled" or session["candidateId"] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

    # Update session
    update_data = {
        "status": new_status,
        "updatedAt": datetime.utcnow().isoformat()
    }

    if new_status == "completed":
        update_data["completedAt"] = datetime.utcnow().isoformat()
    elif new_status == "cancelled":
        update_data["cancelledAt"] = datetime.utcnow().isoformat()
        update_data["cancelledBy"] = user_id

    result = await db.live_interviews.update_one(
        {"sessionId": session_id},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")

    return {"message": f"Session status updated to {new_status}"}


@router.post("/session/{session_id}/notes")
@limiter.limit("20/minute")
async def add_session_notes(
    session_id: str,
    notes_data: Dict[str, Any],
    current_user: Dict = Depends(get_current_user)
):
    """Add notes to interview session"""
    user_id = current_user["sub"]
    notes = notes_data.get("notes", "")

    if not notes:
        raise HTTPException(status_code=400, detail="Notes cannot be empty")

    db = get_database()
    session = await db.live_interviews.find_one({"sessionId": session_id})

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Verify user has access
    if session["candidateId"] != user_id and session.get("recruiterId") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Add notes with timestamp and author
    note_entry = {
        "id": str(uuid.uuid4()),
        "authorId": user_id,
        "notes": notes,
        "timestamp": datetime.utcnow().isoformat(),
        "authorRole": current_user.get("role", "candidate")
    }

    await db.live_interviews.update_one(
        {"sessionId": session_id},
        {
            "$push": {"sessionNotes": note_entry},
            "$set": {"updatedAt": datetime.utcnow().isoformat()}
        }
    )

    return {"message": "Notes added successfully", "note_id": note_entry["id"]}


@router.get("/session/{session_id}/notes")
@limiter.limit("20/minute")
async def get_session_notes(
    session_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """Get notes for interview session"""
    user_id = current_user["sub"]

    db = get_database()
    session = await db.live_interviews.find_one({"sessionId": session_id})

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Verify user has access
    if session["candidateId"] != user_id and session.get("recruiterId") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    return session.get("sessionNotes", [])


# WebSocket endpoint for real-time communication
@router.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str, token: str):
    """WebSocket endpoint for live interview signaling"""
    try:
        # Verify token
        claims = decode_jwt(token, audience="webrtc-service")
        user_id = claims["sub"]
        user_role = claims.get("role", "candidate")

        # Validate session access
        db = get_database()
        session = await db.live_interviews.find_one({"sessionId": session_id})
        if not session:
            await websocket.close(code=4004, reason="Session not found")
            return

        if session["candidateId"] != user_id and session.get("recruiterId") != user_id:
            await websocket.close(code=4003, reason="Access denied")
            return

        # Connect to session
        await manager.connect(websocket, session_id, user_id, user_role)
        logger.info(f"User {user_id} ({user_role}) connected to session {session_id}")

        # Send current session state
        await websocket.send_text(json.dumps({
            "type": "session_state",
            "session": session,
            "participants": manager.session_participants.get(session_id, {}),
            "timestamp": datetime.utcnow().isoformat()
        }))

        # Handle messages
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)

                # Process different message types
                await handle_websocket_message(session_id, user_id, user_role, message)

            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"Error processing WebSocket message: {e}")
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "Failed to process message",
                    "timestamp": datetime.utcnow().isoformat()
                }))

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
    finally:
        # Clean up connection
        manager.disconnect(websocket, session_id, user_id)
        logger.info(f"User {user_id} disconnected from session {session_id}")

        # Notify other participants
        await manager.broadcast_to_session(session_id, {
            "type": "participant_left",
            "user_id": user_id,
            "role": user_role,
            "timestamp": datetime.utcnow().isoformat()
        })


async def handle_websocket_message(session_id: str, user_id: str, user_role: str, message: Dict[str, Any]):
    """Handle different types of WebSocket messages"""
    message_type = message.get("type")

    if message_type == "ice_candidate":
        # Relay ICE candidates to other participants
        await manager.broadcast_to_session(session_id, {
            "type": "ice_candidate",
            "candidate": message.get("candidate"),
            "from_user": user_id,
            "timestamp": datetime.utcnow().isoformat()
        }, exclude_websocket=None)  # Send to all except sender (handled in broadcast function)

    elif message_type == "offer":
        # Relay WebRTC offer to other participant
        await manager.broadcast_to_session(session_id, {
            "type": "offer",
            "offer": message.get("offer"),
            "from_user": user_id,
            "timestamp": datetime.utcnow().isoformat()
        })

    elif message_type == "answer":
        # Relay WebRTC answer
        await manager.broadcast_to_session(session_id, {
            "type": "answer",
            "answer": message.get("answer"),
            "from_user": user_id,
            "timestamp": datetime.utcnow().isoformat()
        })

    elif message_type == "chat":
        # Handle chat messages
        chat_message = {
            "type": "chat",
            "message": message.get("message", ""),
            "from_user": user_id,
            "role": user_role,
            "timestamp": datetime.utcnow().isoformat()
        }

        # Save to database
        db = get_database()
        await db.live_interviews.update_one(
            {"sessionId": session_id},
            {"$push": {"chatMessages": chat_message}}
        )

        # Broadcast to all participants
        await manager.broadcast_to_session(session_id, chat_message)

    elif message_type == "screen_share":
        # Handle screen sharing events
        await manager.broadcast_to_session(session_id, {
            "type": "screen_share",
            "sharing": message.get("sharing", False),
            "from_user": user_id,
            "timestamp": datetime.utcnow().isoformat()
        })

    elif message_type == "recording":
        # Handle recording events
        recording_state = message.get("recording", False)

        # Update session recording state
        db = get_database()
        await db.live_interviews.update_one(
            {"sessionId": session_id},
            {"$set": {"recordingActive": recording_state}}
        )

        await manager.broadcast_to_session(session_id, {
            "type": "recording",
            "recording": recording_state,
            "from_user": user_id,
            "timestamp": datetime.utcnow().isoformat()
        })

    else:
        # Unknown message type
        await manager.send_to_user(session_id, user_id, {
            "type": "error",
            "message": f"Unknown message type: {message_type}",
            "timestamp": datetime.utcnow().isoformat()
        })


@router.get("/recordings/{session_id}")
@limiter.limit("10/minute")
async def get_session_recordings(
    session_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """Get recordings for a session"""
    user_id = current_user["sub"]

    db = get_database()
    session = await db.live_interviews.find_one({"sessionId": session_id})

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Verify user has access
    if session["candidateId"] != user_id and session.get("recruiterId") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # In production, return actual recording URLs
    # For now, return mock data
    recordings = session.get("recordings", [])

    return {
        "session_id": session_id,
        "recordings": recordings,
        "recording_enabled": session.get("recordingEnabled", False),
        "recording_active": session.get("recordingActive", False)
    }