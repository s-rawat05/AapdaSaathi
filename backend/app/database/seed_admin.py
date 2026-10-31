"""Create the initial administrator from ADMIN_EMAIL / ADMIN_PASSWORD.

Usage (from backend/, after `python -m app.database.init_db`):
    python -m app.database.seed_admin

Idempotent: if the admin already exists nothing changes. It refuses to promote
an existing non-admin account, so it can never silently escalate privileges.
"""

import logging
import sys

from pydantic import BaseModel, ValidationError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database.connection import check_database_connection, get_session_factory
from app.models import User, UserRole
from app.schemas.fields import Email, FullName, Password, Phone
from app.services import user_service

logger = logging.getLogger("seed_admin")


class AdminSeedConfig(BaseModel):
    email: Email
    password: Password
    full_name: FullName
    phone: Phone


class SeedError(Exception):
    pass


def seed_admin(db: Session, config: AdminSeedConfig) -> tuple[User, bool]:
    """Returns (admin_user, created)."""
    existing = user_service.get_user_by_email(db, config.email)
    if existing is not None:
        if existing.role is not UserRole.ADMIN:
            raise SeedError(
                f"{config.email} already belongs to a {existing.role.value} account; refusing to promote it."
            )
        return existing, False

    admin = user_service.create_admin(
        db, full_name=config.full_name, email=config.email, phone=config.phone, password=config.password
    )
    return admin, True


def load_config() -> AdminSeedConfig:
    if not settings.ADMIN_EMAIL or not settings.ADMIN_PASSWORD:
        raise SeedError("ADMIN_EMAIL and ADMIN_PASSWORD must be set in backend/.env")
    try:
        return AdminSeedConfig(
            email=settings.ADMIN_EMAIL,
            password=settings.ADMIN_PASSWORD,
            full_name=settings.ADMIN_FULL_NAME,
            phone=settings.ADMIN_PHONE or "0000000000",
        )
    except ValidationError as exc:
        problems = "; ".join(f"{'.'.join(map(str, e['loc']))}: {e['msg']}" for e in exc.errors())
        raise SeedError(f"Invalid admin settings: {problems}") from None


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    try:
        config = load_config()
        ok, error = check_database_connection()
        if not ok:
            raise SeedError(f"Cannot connect to the database: {error}")
        with get_session_factory()() as db:
            admin, created = seed_admin(db, config)
    except SeedError as exc:
        logger.error("%s", exc)
        return 1

    if created:
        logger.info("Created administrator %s (id=%s).", admin.email, admin.id)
    else:
        logger.info("Administrator %s already exists (id=%s); nothing to do.", admin.email, admin.id)
    return 0


if __name__ == "__main__":
    sys.exit(main())
