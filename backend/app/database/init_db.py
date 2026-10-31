"""Initialise the database schema by applying all Alembic migrations.

Usage (from backend/):
    python -m app.database.init_db
"""

import logging
import sys
from pathlib import Path

from alembic import command
from alembic.config import Config

from app.database.connection import check_database_connection, get_engine

logger = logging.getLogger("init_db")

ALEMBIC_INI = Path(__file__).resolve().parents[2] / "alembic.ini"


def run_migrations() -> None:
    config = Config(str(ALEMBIC_INI))
    with get_engine().begin() as connection:
        config.attributes["connection"] = connection
        command.upgrade(config, "head")


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    ok, error = check_database_connection()
    if not ok:
        logger.error("Cannot connect to the database: %s", error)
        logger.error("Check that PostgreSQL is running and DATABASE_URL in backend/.env is correct.")
        return 1

    run_migrations()
    logger.info("Database schema is up to date.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
