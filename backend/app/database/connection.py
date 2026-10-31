"""SQLAlchemy engine and session management.

The engine is created lazily on first use, so the API process starts (and
/health responds) even when PostgreSQL is down; database-backed endpoints
then return 503 instead of crashing the server.
"""

import logging
from collections.abc import Generator
from functools import lru_cache

from sqlalchemy import Engine, create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

logger = logging.getLogger(__name__)


class DatabaseNotConfiguredError(RuntimeError):
    pass


def build_engine(database_url: str) -> Engine:
    if not database_url:
        raise DatabaseNotConfiguredError("DATABASE_URL is not set. Add it to backend/.env.")

    url = make_url(database_url)
    kwargs: dict = {"pool_pre_ping": True}
    if url.get_backend_name() == "postgresql":
        kwargs.update(
            pool_size=settings.DB_POOL_SIZE,
            max_overflow=settings.DB_MAX_OVERFLOW,
            connect_args={"connect_timeout": settings.DB_CONNECT_TIMEOUT},
        )
    return create_engine(url, **kwargs)


@lru_cache
def get_engine() -> Engine:
    return build_engine(settings.DATABASE_URL)


@lru_cache
def get_session_factory() -> sessionmaker[Session]:
    return sessionmaker(bind=get_engine(), autoflush=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a database session and always closes it."""
    db = get_session_factory()()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def check_database_connection() -> tuple[bool, str | None]:
    """Run a trivial query. Returns (ok, error_message)."""
    try:
        with get_engine().connect() as conn:
            conn.execute(text("SELECT 1"))
        return True, None
    except (SQLAlchemyError, DatabaseNotConfiguredError) as exc:
        logger.warning("Database connection check failed: %s", exc.__class__.__name__)
        return False, str(exc).splitlines()[0]
