"""Create demo RESIDENT and VOLUNTEER accounts for presentations.

Usage (from backend/, after `python -m app.database.init_db`):
    python -m app.database.seed_demo

Credentials come from DEMO_RESIDENT_EMAIL / DEMO_RESIDENT_PASSWORD and
DEMO_VOLUNTEER_EMAIL / DEMO_VOLUNTEER_PASSWORD in backend/.env. Accounts are
created through the normal registration service, so they are validated and
hashed exactly like real sign-ups. Idempotent, and refuses to run when
ENVIRONMENT=production.
"""

import logging
import sys

from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database.connection import check_database_connection, get_session_factory
from app.models import User, UserRole
from app.schemas.auth import RegisterRequest
from app.services import user_service

logger = logging.getLogger("seed_demo")

# Placed in Dehradun, Uttarakhand so demo alerts targeted there reach the resident
DEMO_RESIDENT_PROFILE = {
    "age": 67,
    "address": "12 Rajpur Road",
    "state": "Uttarakhand",
    "district": "Dehradun",
    "city": "Dehradun",
    "latitude": 30.3165,
    "longitude": 78.0322,
    "assistance_type": "ELDERLY",
    "emergency_contact": "9811100001",
    "emergency_contact_name": "Demo Contact",
    "emergency_contact_relationship": "Child",
    "accessibility_preferences": "Demo account: prefers voice calls",
}
DEMO_VOLUNTEER_PROFILE = {
    "location": "Clement Town, Dehradun",
    "latitude": 30.27,
    "longitude": 78.0,
    "availability_status": "AVAILABLE",
}


class SeedError(Exception):
    pass


def _ensure(db: Session, payload: dict, role: UserRole) -> tuple[User, bool]:
    try:
        data = RegisterRequest(**payload)
    except ValidationError as exc:
        problems = "; ".join(f"{'.'.join(map(str, e['loc']))}: {e['msg']}" for e in exc.errors())
        raise SeedError(f"Invalid demo {role.value.lower()} settings: {problems}") from None

    existing = user_service.get_user_by_email(db, data.email)
    if existing is not None:
        if existing.role is not role:
            raise SeedError(f"{data.email} already belongs to a {existing.role.value} account; not touching it.")
        return existing, False
    return user_service.register_user(db, data), True


def seed_demo(db: Session) -> list[tuple[User, bool]]:
    if settings.ENVIRONMENT.lower() == "production":
        raise SeedError("Refusing to create demo accounts when ENVIRONMENT=production.")

    accounts = [
        (settings.DEMO_RESIDENT_EMAIL, settings.DEMO_RESIDENT_PASSWORD, UserRole.RESIDENT,
         {"full_name": "Demo Resident", "phone": "9811100000", "resident_profile": DEMO_RESIDENT_PROFILE}),
        (settings.DEMO_VOLUNTEER_EMAIL, settings.DEMO_VOLUNTEER_PASSWORD, UserRole.VOLUNTEER,
         {"full_name": "Demo Volunteer", "phone": "9811100002", "volunteer_profile": DEMO_VOLUNTEER_PROFILE}),
    ]
    results = []
    for email, password, role, extra in accounts:
        if not email or not password:
            logger.info("Skipping demo %s: DEMO_%s_EMAIL / _PASSWORD not set.", role.value.lower(), role.value)
            continue
        results.append(_ensure(db, {"email": email, "password": password, "role": role.value, **extra}, role))
    return results


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    try:
        ok, error = check_database_connection()
        if not ok:
            raise SeedError(f"Cannot connect to the database: {error}")
        with get_session_factory()() as db:
            results = seed_demo(db)
    except SeedError as exc:
        logger.error("%s", exc)
        return 1

    for user, created in results:
        state = "Created" if created else "Already exists:"
        logger.info("%s demo %s %s", state, user.role.value.lower(), user.email)
    return 0


if __name__ == "__main__":
    sys.exit(main())
