from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from .config import settings


client: AsyncIOMotorClient | None = None
db: AsyncIOMotorDatabase | None = None


async def connect() -> None:
    global client, db
    client = AsyncIOMotorClient(settings.mongodb_uri)
    db = client[settings.db_name]


async def disconnect() -> None:
    global client
    if client:
        client.close()
        client = None


def get_database() -> AsyncIOMotorDatabase:
    """Get the database instance"""
    global db
    if db is None:
        raise RuntimeError("Database not connected. Call connect() first.")
    return db
