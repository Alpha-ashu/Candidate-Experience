from pydantic_settings import BaseSettings
from pydantic import AnyUrl
from typing import List, Optional


class Settings(BaseSettings):
    mongodb_uri: str = "mongodb://localhost:27017"
    db_name: str = "cx"

    # Auth
    auth_secret: str = "change_this"
    cookie_secure: bool = False
    cookie_domain: Optional[str] = None
    allowed_origins: List[str] = ["http://localhost:3000"]

    # AI providers
    openai_api_key: Optional[str] = None
    google_api_key: Optional[str] = None
    ai_provider: str = "openai"  # or "gemini"

    # Tokens lifetimes (seconds)
    ttl_user_jwt: int = 60 * 60  # 1h
    ttl_ist: int = 15 * 60
    ttl_wst: int = 15 * 60
    ttl_aupt: int = 10 * 60
    ttl_upt: int = 20 * 60

    class Config:
        env_file = ".env.local"


settings = Settings()
