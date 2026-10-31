from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_root():
    res = client.get("/")
    assert res.status_code == 200
    assert res.json() == {"message": "Welcome to AapdaSaathi API", "status": "running"}


def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "healthy"}


def test_cors_allows_frontend_origin():
    res = client.get("/health", headers={"Origin": "http://localhost:5173"})
    assert res.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_cors_rejects_unknown_origin():
    res = client.get("/health", headers={"Origin": "http://evil.example.com"})
    assert "access-control-allow-origin" not in res.headers


def test_docs_available():
    assert client.get("/docs").status_code == 200
    assert client.get("/openapi.json").status_code == 200


def test_database_health():
    with TestClient(app) as c:
        res = c.get("/health/db")
    assert res.status_code == 200
    assert res.json() == {"status": "healthy", "database": "connected"}
