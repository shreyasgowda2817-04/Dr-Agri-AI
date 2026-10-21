from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):
    PROJECT_NAME: str = "Crop Disease Detection API"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30 # 30 minutes short-lived access token
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30 # 30 days persistent refresh token
    COOKIE_SECURE: bool = True
    COOKIE_SAMESITE: str = "none"
    COOKIE_DOMAIN: str | None = None
    
    # Database
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "crop_disease_db"

    # AI Integration
    GEMINI_API_KEY: str | None = None
    GEMINI_PRIMARY_MODEL: str = "gemini-2.5-flash"
    GEMINI_FALLBACK_MODELS: str = "gemini-2.0-flash,gemini-1.5-flash,gemini-1.5-flash-8b"
    GEMINI_MAX_ATTEMPTS: int = 3
    GEMINI_PER_ATTEMPT_TIMEOUT: float = 20.0
    GEMINI_TOTAL_TIMEOUT: float = 45.0
    GEMINI_COOLDOWN_SECONDS: int = 60
    GEMINI_TRANSIENT_COOLDOWN_SECONDS: int = 15
    ML_SERVICE_URL: str | None = None

    def get_gemini_model_chain(self) -> list[str]:
        """
        Returns a deduplicated, ordered chain of Gemini models starting with
        the primary model followed by configured fallback models.
        """
        chain: list[str] = []
        
        def clean_model_name(name: str | None) -> str | None:
            if not name:
                return None
            m = name.strip()
            if m.startswith("models/"):
                m = m[7:].strip()
            return m if m else None

        primary = clean_model_name(self.GEMINI_PRIMARY_MODEL)
        if primary:
            chain.append(primary)

        if self.GEMINI_FALLBACK_MODELS:
            raw_fallbacks = self.GEMINI_FALLBACK_MODELS.split(",")
            for raw in raw_fallbacks:
                cleaned = clean_model_name(raw)
                if cleaned and cleaned not in chain:
                    chain.append(cleaned)
                    
        return chain if chain else ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]

    def get_gemini_fallback_models(self) -> list[str]:
        """Returns the fallback models in order (excluding primary)."""
        chain = self.get_gemini_model_chain()
        return chain[1:] if len(chain) > 1 else []

    # Cloud Storage (Cloudinary)
    CLOUDINARY_CLOUD_NAME: str | None = None
    CLOUDINARY_API_KEY: str | None = None
    CLOUDINARY_API_SECRET: str | None = None

    # Weather
    OPENWEATHERMAP_API_KEY: str | None = None

    # Payments (Razorpay)
    RAZORPAY_KEY_ID: str | None = None
    RAZORPAY_KEY_SECRET: str | None = None

    # Google OAuth
    GOOGLE_CLIENT_ID: str | None = None
    GOOGLE_CLIENT_SECRET: str | None = None

    # Email (SMTP)
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    EMAIL_USER: str | None = None
    EMAIL_PASS: str | None = None
    
    # SMS (Twilio)
    TWILIO_ACCOUNT_SID: str | None = None
    TWILIO_AUTH_TOKEN: str | None = None
    TWILIO_FROM_NUMBER: str | None = None
    
    # Frontend (for generating reset links)
    FRONTEND_URL: str = "http://localhost:5173"

    # Settings config ensures it reads from .env file if present
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()
