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
from .routes import career as career_routes

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter


app = FastAPI(
    title="Candidate Experience Backend",
    description="AI-powered mock interview platform with anti-cheat validation",
    version="2.0.0",
    docs_url="/docs" if settings.environment == "development" else None,
    redoc_url="/redoc" if settings.environment == "development" else None,
)

# Rate limit exception handler
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)

    # Security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"

    if settings.environment == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

    return response

# Request ID and logging middleware
@app.middleware("http")
async def add_request_id_and_logging(request: Request, call_next):
    request_id = str(uuid.uuid4())
    start_time = time.time()

    # Add request ID to request state
    request.state.request_id = request_id

    # Log request
    logger.info(
        f"Request started: {request.method} {request.url.path} "
        f"[{request_id}] from {get_remote_address(request)}"
    )

    response = await call_next(request)

    # Calculate processing time
    process_time = time.time() - start_time

    # Add response headers
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time"] = str(process_time)

    # Log response
    logger.info(
        f"Request completed: {request.method} {request.url.path} "
        f"[{request_id}] status={response.status_code} "
        f"time={process_time:.4f}s"
    )

    return response

# Request size limiting middleware
@app.middleware("http")
async def limit_request_size(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length:
        content_length = int(content_length)
        max_size = 50 * 1024 * 1024  # 50MB limit

        if content_length > max_size:
            return JSONResponse(
                status_code=413,
                content={"detail": "Request entity too large"}
            )

    return await call_next(request)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Trusted host middleware for production
if settings.environment == "production":
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.allowed_hosts
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
@limiter.limit("100/minute")
async def healthz(request: Request):
    """Enhanced health check endpoint with system metrics"""
    try:
        # System metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')

        # Database connection check
        from .db import get_database
        try:
            db = get_database()
            await db.command("ping")
            database_status = "healthy"
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            database_status = "unhealthy"

        health_data = {
            "status": "healthy",
            "timestamp": time.time(),
            "version": "2.0.0",
            "system": {
                "cpu_percent": cpu_percent,
                "memory_percent": memory.percent,
                "memory_available_gb": memory.available / (1024**3),
                "disk_percent": disk.percent,
                "disk_free_gb": disk.free / (1024**3),
            },
            "services": {
                "database": database_status,
            },
            "environment": settings.environment
        }

        # Determine overall health status
        if database_status == "unhealthy" or cpu_percent > 90 or memory.percent > 90:
            health_data["status"] = "degraded"
            return JSONResponse(
                status_code=503,
                content=health_data
            )

        return health_data

    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "timestamp": time.time(),
                "error": str(e)
            }
        )
