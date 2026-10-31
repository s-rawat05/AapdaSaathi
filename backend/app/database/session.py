"""Backward-compatible import path from Phase 1.

Prefer importing from app.database.connection and app.database.base.
"""

from app.database.base import Base
from app.database.connection import get_db, get_engine, get_session_factory

__all__ = ["Base", "get_db", "get_engine", "get_session_factory"]
