import jwt
from sqlalchemy import select

from app.core.config import settings
from app.core.security import verify_password
from app.models import User, UserRole
from tests.conftest import PASSWORD, login, resident_payload, volunteer_payload


# ---------- registration ----------


def test_register_resident_creates_user_and_profile(client, db):
    res = client.post("/api/auth/register", json=resident_payload())
    assert res.status_code == 201
    body = res.json()
    assert body["email"] == "asha@example.com"
    assert body["role"] == "RESIDENT"
    assert "password" not in body and "password_hash" not in body

    user = db.scalar(select(User).where(User.email == "asha@example.com"))
    assert user.resident_profile.state == "Uttarakhand"
    assert user.resident_profile.assistance_type.value == "ELDERLY"
    assert user.volunteer_profile is None


def test_register_volunteer_defaults_profile_phone(client, db):
    res = client.post("/api/auth/register", json=volunteer_payload())
    assert res.status_code == 201
    assert res.json()["role"] == "VOLUNTEER"

    user = db.scalar(select(User).where(User.email == "ravi@example.com"))
    assert user.volunteer_profile.phone == "9988776655"
    assert user.volunteer_profile.availability_status.value == "AVAILABLE"
    assert user.resident_profile is None


def test_register_admin_role_is_rejected(client, db):
    res = client.post("/api/auth/register", json=resident_payload(role="ADMIN"))
    assert res.status_code == 422
    assert db.scalar(select(User)) is None


def test_register_requires_matching_profile(client):
    missing = resident_payload()
    del missing["resident_profile"]
    assert client.post("/api/auth/register", json=missing).status_code == 422

    mixed = resident_payload(volunteer_profile={"location": "Somewhere"})
    assert client.post("/api/auth/register", json=mixed).status_code == 422


def test_register_missing_and_invalid_fields(client):
    payload = resident_payload()
    del payload["full_name"]
    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == 422
    assert any(err["loc"][-1] == "full_name" for err in res.json()["detail"])

    assert client.post("/api/auth/register", json=resident_payload(email="not-an-email")).status_code == 422
    assert client.post("/api/auth/register", json=resident_payload(phone="12ab")).status_code == 422
    assert client.post("/api/auth/register", json=resident_payload(password="short1")).status_code == 422
    assert client.post("/api/auth/register", json=resident_payload(password="nodigitshere")).status_code == 422


def test_register_duplicate_email_is_rejected_case_insensitively(client):
    assert client.post("/api/auth/register", json=resident_payload()).status_code == 201
    res = client.post("/api/auth/register", json=volunteer_payload(email="ASHA@Example.com"))
    assert res.status_code == 409
    assert res.json()["detail"] == "An account with this email already exists"


# ---------- password hashing ----------


def test_password_is_stored_as_argon2_hash(client, db):
    client.post("/api/auth/register", json=resident_payload())
    user = db.scalar(select(User).where(User.email == "asha@example.com"))
    assert user.password_hash != PASSWORD
    assert user.password_hash.startswith("$argon2id$")
    assert verify_password(PASSWORD, user.password_hash)[0] is True
    assert verify_password("WrongPass1", user.password_hash)[0] is False


# ---------- login & JWT ----------


def test_login_returns_valid_jwt_and_user(client):
    client.post("/api/auth/register", json=resident_payload())
    res = client.post("/api/auth/login", json={"email": "Asha@example.com", "password": PASSWORD})
    assert res.status_code == 200
    body = res.json()
    assert body["token_type"] == "bearer"
    assert body["role"] == "RESIDENT"
    assert body["user"]["email"] == "asha@example.com"
    assert body["expires_in"] == settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

    claims = jwt.decode(body["access_token"], settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    assert claims["sub"] == str(body["user"]["id"])
    assert claims["role"] == "RESIDENT"
    assert claims["type"] == "access"
    assert claims["exp"] > claims["iat"]


def test_login_wrong_password_and_unknown_email_look_identical(client):
    client.post("/api/auth/register", json=resident_payload())
    wrong = client.post("/api/auth/login", json={"email": "asha@example.com", "password": "WrongPass1"})
    unknown = client.post("/api/auth/login", json={"email": "nobody@example.com", "password": PASSWORD})
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json() == {"detail": "Invalid email or password"}


def test_login_missing_fields(client):
    assert client.post("/api/auth/login", json={"email": "asha@example.com"}).status_code == 422
    assert client.post("/api/auth/login", json={"email": "asha@example.com", "password": ""}).status_code == 422


def test_login_disabled_account(client, db):
    client.post("/api/auth/register", json=resident_payload())
    user = db.scalar(select(User).where(User.email == "asha@example.com"))
    user.is_active = False
    db.commit()
    res = client.post("/api/auth/login", json={"email": "asha@example.com", "password": PASSWORD})
    assert res.status_code == 403


def test_registered_users_get_correct_roles(client):
    client.post("/api/auth/register", json=resident_payload())
    client.post("/api/auth/register", json=volunteer_payload())
    for email, role in [("asha@example.com", UserRole.RESIDENT), ("ravi@example.com", UserRole.VOLUNTEER)]:
        token = login(client, email)
        assert client.get("/api/users/me", headers={"Authorization": f"Bearer {token}"}).json()["role"] == role
