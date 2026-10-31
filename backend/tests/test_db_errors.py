"""The API must degrade to 503 (not crash) when the database is unreachable."""

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.api import health as health_module
from app.database.connection import get_db
from app.main import app
from tests.conftest import resident_payload


def _unreachable_db():
    # Nothing listens on port 1; connect fails immediately
    engine = create_engine("postgresql+psycopg2://u:p@127.0.0.1:1/none", connect_args={"connect_timeout": 1})
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


def test_database_outage_returns_503(client):
    app.dependency_overrides[get_db] = _unreachable_db
    try:
        res = client.post("/api/auth/register", json=resident_payload())
        assert res.status_code == 503
        assert "temporarily unavailable" in res.json()["detail"]

        res = client.post("/api/auth/login", json={"email": "a@example.com", "password": "x"})
        assert res.status_code == 503

        # Plain health check does not touch the database
        assert client.get("/health").status_code == 200
    finally:
        app.dependency_overrides.clear()


def test_database_health_reports_outage(monkeypatch):
    monkeypatch.setattr(health_module, "check_database_connection", lambda: (False, "connection refused"))
    with TestClient(app) as c:
        res = c.get("/health/db")
    assert res.status_code == 503
    assert res.json() == {"status": "unhealthy", "database": "unreachable"}
