from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/.env, resolved independently of the current working directory
ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    """Application settings loaded from environment variables / backend/.env.

    Real environment variables take precedence over values in the .env file.
    """

    model_config = SettingsConfigDict(env_file=ENV_FILE, env_file_encoding="utf-8", extra="ignore")

    APP_NAME: str = "AapdaSaathi API"
    APP_VERSION: str = "0.2.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False

    # Comma-separated list of allowed frontend origins
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # PostgreSQL connection string, e.g. postgresql+psycopg2://user:password@localhost:5432/aapdasaathi
    DATABASE_URL: str = Field(default="", repr=False)
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_CONNECT_TIMEOUT: int = 5

    # JWT settings. SECRET_KEY has no default on purpose: it must come from the environment.
    SECRET_KEY: str = Field(default="", repr=False)
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Initial administrator, used only by the seed script (python -m app.database.seed_admin)
    ADMIN_EMAIL: str = ""
    ADMIN_PASSWORD: str = Field(default="", repr=False)
    ADMIN_FULL_NAME: str = "AapdaSaathi Administrator"
    ADMIN_PHONE: str = ""

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, value: str) -> str:
        if len(value) < 32 or value.startswith("CHANGE_ME"):
            raise ValueError(
                "SECRET_KEY must be set to a random string of at least 32 characters. "
                'Generate one with: python -c "import secrets; print(secrets.token_urlsafe(64))"'
            )
        return value

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
