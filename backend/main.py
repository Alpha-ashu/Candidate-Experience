from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import time
import uuid
import logging
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import psutil
import os

from .config import settings
from .db import connect, disconnect
from .routes import auth as auth_routes
from .routes import interview as interview_routes
from .routes import media as media_routes
from .routes import ws as ws_routes

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter


app = FastAPI(title="Candidate Experience Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    try:
        await connect()
    except Exception as e:
        print(f"Failed to connect to database: {e}")
        # Continue without database for now, but log the error


@app.on_event("shutdown")
async def on_shutdown():
    await disconnect()


app.include_router(auth_routes.router)
app.include_router(interview_routes.router)
app.include_router(media_routes.router)
app.include_router(ws_routes.router)


@app.get("/healthz")
async def healthz():
    return {"ok": True}
