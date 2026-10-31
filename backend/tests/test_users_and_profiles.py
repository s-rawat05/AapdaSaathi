from datetime import UTC, datetime, timedelta

import jwt
import pytest
from sqlalchemy import select

from app.core.config import settings
from app.models import User
from tests.conftest import auth

PROTECTED = [
    ("get", "/api/users/me"),
    ("get", "/api/residents/profile"),
    ("put", "/api/residents/profile"),
    ("get", "/api/volunteers/profile"),
    ("put", "/api/volunteers/profile"),
    ("get", "/api/admin/users"),
    ("post", "/api/admin/users"),
]


# ---------- current user & token handling ----------


def test_get_current_user(client, resident_token):
    res = client.get("/api/users/me", headers=auth(resident_token))
    assert res.status_code == 200
    body = res.json()
    assert body["email"] == "asha@example.com"
    assert body["role"] == "RESIDENT"
    assert "password_hash" not in body


@pytest.mark.parametrize(("method", "path"), PROTECTED)
def test_unauthenticated_requests_are_rejected(client, method, path):
    res = client.request(method.upper(), path, json={} if method != "get" else None)
    assert res.status_code == 401
    assert res.json()["detail"] == "Not authenticated"


def test_invalid_and_tampered_tokens_are_rejected(client, resident_token):
    assert client.get("/api/users/me", headers=auth("not-a-jwt")).status_code == 401

    forged = jwt.encode(
        {"sub": "1", "role": "ADMIN", "type": "access", "iat": datetime.now(UTC),
         "exp": datetime.now(UTC) + timedelta(hours=1)},
        "a-different-secret-key-of-sufficient-length-123",
        algorithm="HS256",
    )
    res = client.get("/api/users/me", headers=auth(forged))
    assert res.status_code == 401
    assert res.json()["detail"] == "Invalid authentication token"


def test_expired_token_is_rejected(client, resident_token):
    user_id = client.get("/api/users/me", headers=auth(resident_token)).json()["id"]
    past = datetime.now(UTC) - timedelta(hours=2)
    expired = jwt.encode(
        {"sub": str(user_id), "role": "RESIDENT", "type": "access", "iat": past, "exp": past + timedelta(minutes=1)},
        settings.SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    res = client.get("/api/users/me", headers=auth(expired))
    assert res.status_code == 401
    assert res.json()["detail"] == "Token has expired"


def test_token_of_deactivated_user_stops_working(client, db, resident_token):
    user = db.scalar(select(User).where(User.email == "asha@example.com"))
    user.is_active = False
    db.commit()
    assert client.get("/api/users/me", headers=auth(resident_token)).status_code == 401


# ---------- resident profile ----------


def test_resident_get_profile(client, resident_token):
    res = client.get("/api/residents/profile", headers=auth(resident_token))
    assert res.status_code == 200
    assert res.json()["district"] == "Dehradun"
    assert res.json()["assistance_type"] == "ELDERLY"


def test_resident_partial_profile_update(client, db, resident_token):
    res = client.put(
        "/api/residents/profile",
        headers=auth(resident_token),
        json={"city": "Rishikesh", "assistance_type": "MOBILITY", "latitude": 30.08, "longitude": 78.26},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["city"] == "Rishikesh"
    assert body["assistance_type"] == "MOBILITY"
    assert body["state"] == "Uttarakhand"  # untouched
    assert body["age"] == 67  # untouched

    user = db.scalar(select(User).where(User.email == "asha@example.com"))
    assert user.resident_profile.city == "Rishikesh"


def test_resident_profile_update_validation(client, resident_token):
    headers = auth(resident_token)
    assert client.put("/api/residents/profile", headers=headers, json={"state": None}).status_code == 422
    assert client.put("/api/residents/profile", headers=headers, json={"latitude": 30.1}).status_code == 422
    assert client.put("/api/residents/profile", headers=headers, json={"age": 500}).status_code == 422
    assert client.put("/api/residents/profile", headers=headers, json={"assistance_type": "FLYING"}).status_code == 422


# ---------- volunteer profile ----------


def test_volunteer_get_and_update_profile(client, volunteer_token):
    headers = auth(volunteer_token)
    assert client.get("/api/volunteers/profile", headers=headers).json()["availability_status"] == "AVAILABLE"

    res = client.put("/api/volunteers/profile", headers=headers, json={"availability_status": "BUSY"})
    assert res.status_code == 200
    assert res.json()["availability_status"] == "BUSY"
    assert res.json()["location"] == "Clement Town, Dehradun"

    assert client.put("/api/volunteers/profile", headers=headers, json={"location": None}).status_code == 422


# ---------- cross-role isolation ----------


def test_resident_cannot_use_volunteer_endpoints_and_vice_versa(client, resident_token, volunteer_token):
    assert client.get("/api/volunteers/profile", headers=auth(resident_token)).status_code == 403
    assert client.put("/api/volunteers/profile", headers=auth(resident_token), json={}).status_code == 403
    assert client.get("/api/residents/profile", headers=auth(volunteer_token)).status_code == 403
    assert client.put("/api/residents/profile", headers=auth(volunteer_token), json={}).status_code == 403


def test_each_user_only_sees_their_own_profile(client, resident_token):
    from tests.conftest import login, resident_payload

    client.post(
        "/api/auth/register",
        json=resident_payload(email="other@example.com", resident_profile={"state": "Assam", "district": "Kamrup"}),
    )
    other_token = login(client, "other@example.com")

    mine = client.get("/api/residents/profile", headers=auth(resident_token)).json()
    theirs = client.get("/api/residents/profile", headers=auth(other_token)).json()
    assert mine["state"] == "Uttarakhand"
    assert theirs["state"] == "Assam"
    assert mine["user_id"] != theirs["user_id"]
