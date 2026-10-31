"""Test configuration.

Uses TEST_DATABASE_URL (PostgreSQL) when set in the environment or backend/.env,
otherwise a throwaway SQLite file. The schema is built with the real Alembic
migrations, and every table is emptied after each test.
"""

import os
import tempfile
from pathlib import Path

from dotenv import dotenv_values

_env_file = Path(__file__).resolve().parents[1] / ".env"
_file_values = dotenv_values(_env_file) if _env_file.exists() else {}
_test_url = os.environ.get("TEST_DATABASE_URL") or _file_values.get("TEST_DATABASE_URL") or ""
_dev_url = os.environ.get("DATABASE_URL") or _file_values.get("DATABASE_URL") or ""

if not _test_url:
    _test_url = f"sqlite:///{Path(tempfile.mkdtemp()) / 'aapdasaathi_test.db'}"
if _test_url == _dev_url:
    raise RuntimeError("TEST_DATABASE_URL must differ from DATABASE_URL: tests wipe every table.")

# Must happen before anything imports app.core.config
os.environ["DATABASE_URL"] = _test_url
os.environ.setdefault("SECRET_KEY", "test-secret-key-that-is-long-enough-for-hs256-signing")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import event, text  # noqa: E402

from app.database.base import Base  # noqa: E402
from app.database.connection import get_engine, get_session_factory  # noqa: E402
from app.database.init_db import run_migrations  # noqa: E402
from app.main import app  # noqa: E402

PASSWORD = "Secure123"


@pytest.fixture(scope="session", autouse=True)
def _schema():
    engine = get_engine()
    if engine.dialect.name == "sqlite":
        event.listen(engine, "connect", lambda conn, _: conn.execute("PRAGMA foreign_keys=ON"))
    with engine.begin() as conn:
        Base.metadata.drop_all(conn)
        conn.execute(text("DROP TABLE IF EXISTS alembic_version"))
    run_migrations()
    yield
    engine.dispose()


@pytest.fixture(autouse=True)
def _clean_tables():
    yield
    engine = get_engine()
    with engine.begin() as conn:
        if engine.dialect.name == "postgresql":
            names = ", ".join(t.name for t in Base.metadata.sorted_tables)
            conn.execute(text(f"TRUNCATE {names} RESTART IDENTITY CASCADE"))
        else:
            for table in reversed(Base.metadata.sorted_tables):
                conn.execute(table.delete())


@pytest.fixture
def db():
    with get_session_factory()() as session:
        yield session


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


# ---------- helpers ----------


def resident_payload(**overrides) -> dict:
    payload = {
        "full_name": "Asha Devi",
        "email": "asha@example.com",
        "phone": "9876543210",
        "password": PASSWORD,
        "role": "RESIDENT",
        "resident_profile": {
            "age": 67,
            "address": "12 River Road",
            "state": "Uttarakhand",
            "district": "Dehradun",
            "city": "Dehradun",
            "village": None,
            "latitude": 30.3165,
            "longitude": 78.0322,
            "assistance_type": "ELDERLY",
            "emergency_contact": "9123456780",
            "accessibility_preferences": "Large text",
        },
    }
    payload.update(overrides)
    return payload


def volunteer_payload(**overrides) -> dict:
    payload = {
        "full_name": "Ravi Kumar",
        "email": "ravi@example.com",
        "phone": "9988776655",
        "password": PASSWORD,
        "role": "VOLUNTEER",
        "volunteer_profile": {
            "location": "Clement Town, Dehradun",
            "latitude": 30.27,
            "longitude": 78.0,
            "availability_status": "AVAILABLE",
        },
    }
    payload.update(overrides)
    return payload


def login(client: TestClient, email: str, password: str = PASSWORD) -> str:
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, res.text
    return res.json()["access_token"]


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def resident_token(client) -> str:
    assert client.post("/api/auth/register", json=resident_payload()).status_code == 201
    return login(client, "asha@example.com")


@pytest.fixture
def volunteer_token(client) -> str:
    assert client.post("/api/auth/register", json=volunteer_payload()).status_code == 201
    return login(client, "ravi@example.com")


@pytest.fixture
def admin_token(client, db) -> str:
    from app.database.seed_admin import AdminSeedConfig, seed_admin

    seed_admin(
        db,
        AdminSeedConfig(email="admin@example.com", password="AdminPass1", full_name="Admin", phone="9000000000"),
    )
    return login(client, "admin@example.com", "AdminPass1")
