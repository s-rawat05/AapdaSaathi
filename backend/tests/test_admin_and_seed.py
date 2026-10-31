import pytest
from sqlalchemy import func, select

from app.core.config import settings
from app.database import seed_admin as seed_module
from app.database.seed_admin import AdminSeedConfig, SeedError, load_config, seed_admin
from app.models import User, UserRole
from tests.conftest import auth, resident_payload

NEW_ADMIN = {"full_name": "Second Admin", "email": "admin2@example.com", "phone": "9000000001", "password": "AdminPass2"}


# ---------- RBAC on admin endpoints ----------


def test_admin_can_list_users(client, admin_token, resident_token, volunteer_token):
    res = client.get("/api/admin/users", headers=auth(admin_token))
    assert res.status_code == 200
    assert {u["role"] for u in res.json()} == {"ADMIN", "RESIDENT", "VOLUNTEER"}

    residents = client.get("/api/admin/users?role=RESIDENT", headers=auth(admin_token)).json()
    assert [u["email"] for u in residents] == ["asha@example.com"]


def test_resident_cannot_access_admin_endpoints(client, resident_token):
    assert client.get("/api/admin/users", headers=auth(resident_token)).status_code == 403
    assert client.post("/api/admin/users", headers=auth(resident_token), json=NEW_ADMIN).status_code == 403


def test_volunteer_cannot_access_admin_endpoints(client, volunteer_token):
    assert client.get("/api/admin/users", headers=auth(volunteer_token)).status_code == 403
    assert client.post("/api/admin/users", headers=auth(volunteer_token), json=NEW_ADMIN).status_code == 403


def test_only_admin_can_create_admin(client, db, admin_token):
    res = client.post("/api/admin/users", headers=auth(admin_token), json=NEW_ADMIN)
    assert res.status_code == 201
    assert res.json()["role"] == "ADMIN"
    assert client.post("/api/admin/users", headers=auth(admin_token), json=NEW_ADMIN).status_code == 409


# ---------- seed script ----------


def _config(**overrides) -> AdminSeedConfig:
    values = {"email": "seed@example.com", "password": "SeedPass1", "full_name": "Seed Admin", "phone": "9000000002"}
    values.update(overrides)
    return AdminSeedConfig(**values)


def test_seed_creates_admin_once(client, db):
    admin, created = seed_admin(db, _config())
    assert created is True
    assert admin.role is UserRole.ADMIN
    assert admin.password_hash.startswith("$argon2id$")

    again, created_again = seed_admin(db, _config())
    assert created_again is False
    assert again.id == admin.id
    assert db.scalar(select(func.count()).select_from(User)) == 1

    res = client.post("/api/auth/login", json={"email": "seed@example.com", "password": "SeedPass1"})
    assert res.status_code == 200
    assert res.json()["role"] == "ADMIN"


def test_seed_refuses_to_promote_existing_non_admin(client, db):
    client.post("/api/auth/register", json=resident_payload())
    with pytest.raises(SeedError, match="refusing to promote"):
        seed_admin(db, _config(email="asha@example.com"))
    user = db.scalar(select(User).where(User.email == "asha@example.com"))
    assert user.role is UserRole.RESIDENT


def test_seed_config_validation(monkeypatch):
    monkeypatch.setattr(seed_module, "settings", settings.model_copy(update={"ADMIN_EMAIL": "", "ADMIN_PASSWORD": ""}))
    with pytest.raises(SeedError, match="must be set"):
        load_config()

    monkeypatch.setattr(
        seed_module, "settings",
        settings.model_copy(update={"ADMIN_EMAIL": "a@example.com", "ADMIN_PASSWORD": "weak", "ADMIN_PHONE": ""}),
    )
    with pytest.raises(SeedError, match="password"):
        load_config()
