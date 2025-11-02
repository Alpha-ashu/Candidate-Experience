from pydantic_settings import BaseSettings
from pydantic import AnyUrl
from typing import List, Optional, Dict, Any
import secrets


class Settings(BaseSettings):
    # Environment
    environment: str = "development"

    # Database
    mongodb_uri: str = "mongodb://localhost:27017"
    db_name: str = "cx"

    # Auth & Security
    auth_secret: str = secrets.token_urlsafe(32)
    refresh_token_secret: str = secrets.token_urlsafe(32)
    cookie_secure: bool = False
    cookie_domain: Optional[str] = None
    allowed_origins: List[str] = ["http://localhost:3000"]
    allowed_hosts: List[str] = ["localhost", "127.0.0.1"]

    # AI providers
    openai_api_key: Optional[str] = None
    google_api_key: Optional[str] = None
    ai_provider: str = "openai"  # or "gemini"

    # AI Model Configuration
    ai_provider_fallback_chain: List[str] = ["openai", "gemini", "deterministic"]
    ai_model_timeouts: Dict[str, int] = {"openai": 30, "gemini": 25}
    ai_cache_ttl: int = 3600  # 1 hour

    # Token lifetimes (seconds)
    ttl_user_jwt: int = 60 * 60  # 1h
    ttl_ist: int = 15 * 60
    ttl_wst: int = 15 * 60
    ttl_aipt: int = 10 * 60
    ttl_upt: int = 20 * 60
    ttl_refresh_token: int = 7 * 24 * 60 * 60  # 7 days
    ttl_device_fingerprint: int = 30 * 24 * 60 * 60  # 30 days

    # Anti-Cheat Policy Configuration
    violation_thresholds: Dict[str, int] = {
        "face_missing_yellow": 2,  # seconds
        "face_missing_red": 3,     # occurrences
        "fullscreen_warning": 10,  # seconds grace
        "tab_switch_limit": 3      # per session
    }

    # Data Retention Policies (days)
    media_retention_days: int = 30
    audit_log_retention_days: int = 365
    transcript_retention_days: int = 90

    # Rate limiting
    rate_limits: Dict[str, str] = {
        "auth_endpoints": "5/minute",
        "interview_endpoints": "10/minute",
        "media_upload": "20/hour",
        "default": "100/minute"
    }

    # Security settings
    max_request_size_mb: int = 50
    session_timeout_minutes: int = 30
    max_login_attempts: int = 5
    account_lockout_minutes: int = 15

    # OAuth settings
    google_oauth_client_id: Optional[str] = None
    google_oauth_client_secret: Optional[str] = None
    oauth_redirect_uri: str = "http://localhost:3000/auth/callback"

    # Features flags
    enable_mfa: bool = False
    enable_oauth: bool = False
    enable_live_interview: bool = False
    enable_career_tools: bool = False
    enable_resume_analyzer: bool = False

    # Performance settings
    enable_compression: bool = True
    cache_responses: bool = True
    max_concurrent_interviews: int = 1000

    class Config:
        env_file = ".env.local"
        case_sensitive = False


settings = Settings()
