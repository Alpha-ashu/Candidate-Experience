from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .db import connect, disconnect
from .routes import auth as auth_routes
from .routes import interview as interview_routes
from .routes import media as media_routes
from .routes import ws as ws_routes


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
