"""Phase 3: resident profile, alerts, notifications and safety responses."""

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import func, select

from app.models import Alert, AlertSeverity, AlertSource, Notification, NotificationType, Response, UserRole, User
from tests.conftest import auth, login, resident_payload

FLOOD = {
    "event_name": "Flash flood warning",
    "disaster_type": "Flood",
    "severity": "SEVERE",
    "description": "Heavy rainfall is causing rivers to rise quickly.",
    "instructions": "Move to higher ground. Avoid crossing flowing water.",
    "affected_location": "Dehradun district",
    "target_state": "Uttarakhand",
    "target_district": "Dehradun",
}


def create_alert(client, admin_token, **overrides) -> dict:
    res = client.post("/api/admin/alerts", headers=auth(admin_token), json={**FLOOD, **overrides})
    assert res.status_code == 201, res.text
    return res.json()


def register_resident(client, email, **profile) -> str:
    base = {"state": "Uttarakhand", "district": "Dehradun"}
    base.update(profile)
    assert client.post("/api/auth/register", json=resident_payload(email=email, resident_profile=base)).status_code == 201
    return login(client, email)


# ---------- profile ----------


def test_profile_includes_account_and_completion(client, resident_token):
    body = client.get("/api/residents/profile", headers=auth(resident_token)).json()
    assert body["user"] == {"full_name": "Asha Devi", "email": "asha@example.com", "phone": "9876543210"}
    assert body["voice_alerts_enabled"] is True and body["simple_language_enabled"] is False
    assert body["completion"]["percent"] < 100
    assert "emergency contact name" in body["completion"]["missing"]


def test_profile_update_account_location_assistance_and_preferences(client, db, resident_token):
    res = client.put(
        "/api/residents/profile",
        headers=auth(resident_token),
        json={
            "full_name": "Asha Rawat",
            "phone": "+919876500000",
            "address": "45 Hill View",
            "village": "Raipur",
            "latitude": 30.29,
            "longitude": 78.07,
            "assistance_type": "VISUAL",
            "voice_alerts_enabled": False,
            "simple_language_enabled": True,
            "emergency_contact_name": "Mohan Devi",
            "emergency_contact_relationship": "Son",
        },
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["user"]["full_name"] == "Asha Rawat"
    assert body["user"]["phone"] == "+919876500000"
    assert (body["latitude"], body["longitude"]) == (30.29, 78.07)
    assert body["assistance_type"] == "VISUAL"
    assert body["voice_alerts_enabled"] is False and body["simple_language_enabled"] is True
    assert body["completion"] == {"percent": 100, "missing": []}

    user = db.scalar(select(User).where(User.email == "asha@example.com"))
    assert user.full_name == "Asha Rawat"
    assert user.resident_profile.village == "Raipur"


def test_profile_email_change_and_conflict(client, resident_token):
    register_resident(client, "taken@example.com")
    res = client.put("/api/residents/profile", headers=auth(resident_token), json={"email": "TAKEN@example.com"})
    assert res.status_code == 409

    res = client.put("/api/residents/profile", headers=auth(resident_token), json={"email": "asha.new@example.com"})
    assert res.status_code == 200
    assert login(client, "asha.new@example.com")


def test_profile_required_fields_cannot_be_cleared(client, resident_token):
    headers = auth(resident_token)
    for field in ("full_name", "email", "phone", "state", "district", "voice_alerts_enabled"):
        assert client.put("/api/residents/profile", headers=headers, json={field: None}).status_code == 422, field
    assert client.put("/api/residents/profile", headers=headers, json={"phone": "123"}).status_code == 422


def test_emergency_contact_add_edit_delete(client, resident_token):
    headers = auth(resident_token)
    # The fixture resident starts with a phone-only contact; delete it first
    clear = {"emergency_contact": None, "emergency_contact_name": None, "emergency_contact_relationship": None}
    assert client.put("/api/residents/profile", headers=headers, json=clear).json()["emergency_contact"] is None

    added = client.put(
        "/api/residents/profile", headers=headers,
        json={"emergency_contact": "9811122233", "emergency_contact_name": "Ravi Devi", "emergency_contact_relationship": "Brother"},
    ).json()
    assert (added["emergency_contact_name"], added["emergency_contact"]) == ("Ravi Devi", "9811122233")

    edited = client.put("/api/residents/profile", headers=headers, json={"emergency_contact": "9811122244"}).json()
    assert edited["emergency_contact"] == "9811122244" and edited["emergency_contact_name"] == "Ravi Devi"

    # Invalid mobile number
    assert client.put("/api/residents/profile", headers=headers, json={"emergency_contact": "98-11"}).status_code == 422
    # Removing only the phone would leave a contact nobody can call
    res = client.put("/api/residents/profile", headers=headers, json={"emergency_contact": None})
    assert res.status_code == 422
    assert "phone number" in res.json()["detail"]

    deleted = client.put("/api/residents/profile", headers=headers, json=clear).json()
    assert deleted["emergency_contact"] is None and deleted["emergency_contact_name"] is None


def test_registration_rejects_contact_name_without_phone(client):
    payload = resident_payload()
    payload["resident_profile"] |= {"emergency_contact": None, "emergency_contact_name": "Someone"}
    assert client.post("/api/auth/register", json=payload).status_code == 422


# ---------- alerts & targeting ----------


def test_admin_alert_is_always_simulated(client, admin_token):
    body = create_alert(client, admin_token, source="SACHET", external_alert_id="fake-official")
    assert body["alert"]["source"] == "DEMO"
    assert body["alert"]["is_official"] is False


def test_alert_targeting(client, db, admin_token, resident_token):
    other_state = register_resident(client, "assam@example.com", state="Assam", district="Kamrup")
    nearby = register_resident(client, "nearby@example.com", state="Himachal Pradesh", district="Shimla",
                               latitude=30.35, longitude=78.06)

    district = create_alert(client, admin_token)["alert"]["id"]
    radius = create_alert(client, admin_token, target_state=None, target_district=None,
                          latitude=30.3165, longitude=78.0322, radius_km=10)["alert"]["id"]
    everyone = create_alert(client, admin_token, target_state=None, target_district=None,
                            event_name="Nationwide heatwave advisory")["alert"]["id"]
    assam_only = create_alert(client, admin_token, target_state="assam", target_district=None)["alert"]["id"]

    def ids(token):
        return {a["id"] for a in client.get("/api/residents/alerts", headers=auth(token)).json()}

    assert ids(resident_token) == {district, radius, everyone}  # Dehradun resident at 30.3165, 78.0322
    assert ids(other_state) == {everyone, assam_only}  # case-insensitive state match
    assert ids(nearby) == {radius, everyone}  # ~4 km away, different state


def test_alerts_sorted_most_severe_first(client, admin_token, resident_token):
    create_alert(client, admin_token, event_name="Older extreme", severity="EXTREME")
    create_alert(client, admin_token, event_name="Newer moderate", severity="MODERATE")
    create_alert(client, admin_token, event_name="Newest extreme", severity="EXTREME")
    names = [a["event_name"] for a in client.get("/api/residents/alerts", headers=auth(resident_token)).json()]
    assert names == ["Newest extreme", "Older extreme", "Newer moderate"]


def test_alert_card_fields_and_no_response_default(client, admin_token, resident_token):
    create_alert(client, admin_token)
    [alert] = client.get("/api/residents/alerts", headers=auth(resident_token)).json()
    for field in ("disaster_type", "severity", "affected_location", "description", "instructions", "created_at", "source"):
        assert alert[field] is not None, field
    assert alert["my_response"] is None
    assert alert["response_status"] == "NO_RESPONSE"


def test_expired_and_cancelled_alerts_are_hidden(client, db, resident_token):
    from app.models import AlertStatus

    common = dict(disaster_type="Flood", severity=AlertSeverity.MODERATE, description="Old alert text",
                  affected_location="Dehradun", source=AlertSource.DEMO)
    db.add_all([
        Alert(event_name="Expired", expires_at=datetime.now(UTC) - timedelta(hours=1), **common),
        Alert(event_name="Cancelled", status=AlertStatus.CANCELLED, **common),
    ])
    db.commit()
    assert client.get("/api/residents/alerts", headers=auth(resident_token)).json() == []


def test_alert_validation(client, admin_token):
    headers = auth(admin_token)
    assert client.post("/api/admin/alerts", headers=headers, json={**FLOOD, "severity": "APOCALYPTIC"}).status_code == 422
    assert client.post("/api/admin/alerts", headers=headers, json={**FLOOD, "radius_km": 5}).status_code == 422
    past = (datetime.now(UTC) - timedelta(minutes=5)).isoformat()
    assert client.post("/api/admin/alerts", headers=headers, json={**FLOOD, "expires_at": past}).status_code == 422


# ---------- notifications ----------


def test_alert_creates_notifications_only_for_targeted_residents(client, db, admin_token, resident_token):
    other = register_resident(client, "assam@example.com", state="Assam", district="Kamrup")
    body = create_alert(client, admin_token)
    assert body["residents_notified"] == 1

    [note] = client.get("/api/residents/notifications", headers=auth(resident_token)).json()
    assert note["title"] == "High alert: Flash flood warning"
    assert "Move to higher ground" in note["message"]
    assert note["is_read"] is False
    assert note["alert"]["id"] == body["alert"]["id"]
    assert note["alert"]["is_official"] is False
    assert client.get("/api/residents/notifications", headers=auth(other)).json() == []


def test_mark_notification_read_and_read_all(client, admin_token, resident_token):
    create_alert(client, admin_token)
    create_alert(client, admin_token, event_name="Landslide warning", disaster_type="Landslide")
    headers = auth(resident_token)

    updates = client.get("/api/residents/updates", headers=headers).json()
    assert updates["unread_notifications"] == 2
    assert len(updates["active_alert_ids"]) == 2

    first = client.get("/api/residents/notifications", headers=headers).json()[0]
    res = client.patch(f"/api/residents/notifications/{first['id']}/read", headers=headers)
    assert res.status_code == 200 and res.json()["is_read"] is True

    unread = client.get("/api/residents/notifications?unread_only=true", headers=headers).json()
    assert len(unread) == 1
    assert client.patch("/api/residents/notifications/read-all", headers=headers).json() == {"updated": 1}
    assert client.get("/api/residents/updates", headers=headers).json()["unread_notifications"] == 0


def test_cannot_read_another_residents_notification(client, admin_token, resident_token):
    create_alert(client, admin_token)
    note_id = client.get("/api/residents/notifications", headers=auth(resident_token)).json()[0]["id"]
    other = register_resident(client, "other@example.com")
    assert client.patch(f"/api/residents/notifications/{note_id}/read", headers=auth(other)).status_code == 404
    assert client.patch("/api/residents/notifications/999999/read", headers=auth(other)).status_code == 404


# ---------- responses ----------


def test_safe_response_then_update_to_need_help(client, db, admin_token, resident_token):
    alert_id = create_alert(client, admin_token)["alert"]["id"]
    headers = auth(resident_token)

    created = client.post("/api/responses", headers=headers, json={"alert_id": alert_id, "status": "SAFE"})
    assert created.status_code == 201
    body = created.json()
    assert body["status"] == "SAFE" and body["alert"]["id"] == alert_id

    [alert] = client.get("/api/residents/alerts", headers=headers).json()
    assert alert["response_status"] == "SAFE" and alert["my_response"]["id"] == body["id"]

    # No admin is notified for SAFE
    admin_notes = select(func.count()).select_from(Notification).where(Notification.notification_type == NotificationType.RESPONSE)
    assert db.scalar(admin_notes) == 0

    updated = client.put(f"/api/responses/{body['id']}", headers=headers, json={"status": "NEEDS_HELP"})
    assert updated.status_code == 200
    assert updated.json()["status"] == "NEEDS_HELP"
    assert updated.json()["responded_at"] >= body["responded_at"]
    assert db.scalar(select(func.count()).select_from(Response)) == 1
    assert db.scalar(admin_notes) == 1


def test_need_help_notifies_admins_and_appears_in_help_requests(client, db, admin_token, resident_token):
    alert_id = create_alert(client, admin_token)["alert"]["id"]
    res = client.post("/api/responses", headers=auth(resident_token), json={"alert_id": alert_id, "status": "NEEDS_HELP"})
    assert res.status_code == 201

    admin = db.scalar(select(User).where(User.role == UserRole.ADMIN))
    note = db.scalar(select(Notification).where(Notification.user_id == admin.id))
    assert note.notification_type is NotificationType.RESPONSE
    assert note.title == "Help requested: Asha Devi"
    assert "9876543210" in note.message and "Dehradun" in note.message

    [request] = client.get("/api/admin/help-requests", headers=auth(admin_token)).json()
    assert request["resident_name"] == "Asha Devi"
    assert request["assistance_type"] == "ELDERLY"
    assert request["alert"]["id"] == alert_id

    # Marking safe removes them from the queue and tells admins
    client.put(f"/api/responses/{res.json()['id']}", headers=auth(resident_token), json={"status": "SAFE"})
    assert client.get("/api/admin/help-requests", headers=auth(admin_token)).json() == []
    titles = db.scalars(select(Notification.title).where(Notification.user_id == admin.id)).all()
    assert "Now safe: Asha Devi" in titles


def test_duplicate_response_is_rejected(client, admin_token, resident_token):
    alert_id = create_alert(client, admin_token)["alert"]["id"]
    headers = auth(resident_token)
    assert client.post("/api/responses", headers=headers, json={"alert_id": alert_id, "status": "SAFE"}).status_code == 201
    res = client.post("/api/responses", headers=headers, json={"alert_id": alert_id, "status": "NEEDS_HELP"})
    assert res.status_code == 409


def test_my_responses(client, admin_token, resident_token):
    a1 = create_alert(client, admin_token)["alert"]["id"]
    a2 = create_alert(client, admin_token, event_name="Landslide warning")["alert"]["id"]
    headers = auth(resident_token)
    client.post("/api/responses", headers=headers, json={"alert_id": a1, "status": "SAFE"})
    client.post("/api/responses", headers=headers, json={"alert_id": a2, "status": "NEEDS_HELP"})
    mine = client.get("/api/responses/my", headers=headers).json()
    assert {(r["alert_id"], r["status"]) for r in mine} == {(a1, "SAFE"), (a2, "NEEDS_HELP")}


def test_response_rules(client, db, admin_token, resident_token):
    headers = auth(resident_token)
    assam_alert = create_alert(client, admin_token, target_state="Assam", target_district=None)["alert"]["id"]
    # Not targeted at this resident: treated as not found
    assert client.post("/api/responses", headers=headers, json={"alert_id": assam_alert, "status": "SAFE"}).status_code == 404
    assert client.post("/api/responses", headers=headers, json={"alert_id": 999999, "status": "SAFE"}).status_code == 404
    assert client.post("/api/responses", headers=headers, json={"alert_id": 1, "status": "MAYBE"}).status_code == 422

    alert_id = create_alert(client, admin_token)["alert"]["id"]
    response_id = client.post("/api/responses", headers=headers, json={"alert_id": alert_id, "status": "SAFE"}).json()["id"]

    # Another resident cannot touch it
    other = register_resident(client, "other@example.com")
    assert client.put(f"/api/responses/{response_id}", headers=auth(other), json={"status": "NEEDS_HELP"}).status_code == 404

    # Once the alert ends, responses are frozen
    alert = db.get(Alert, alert_id)
    alert.expires_at = datetime.now(UTC) - timedelta(minutes=1)
    db.commit()
    assert client.put(f"/api/responses/{response_id}", headers=headers, json={"status": "NEEDS_HELP"}).status_code == 409


# ---------- access control ----------

RESIDENT_ONLY = [
    ("GET", "/api/residents/alerts"),
    ("GET", "/api/residents/notifications"),
    ("PATCH", "/api/residents/notifications/1/read"),
    ("PATCH", "/api/residents/notifications/read-all"),
    ("GET", "/api/residents/updates"),
    ("POST", "/api/responses"),
    ("GET", "/api/responses/my"),
    ("PUT", "/api/responses/1"),
]


@pytest.mark.parametrize(("method", "path"), RESIDENT_ONLY)
def test_resident_endpoints_require_resident_role(client, volunteer_token, admin_token, method, path):
    body = {"alert_id": 1, "status": "SAFE"} if method in ("POST", "PUT") else None
    assert client.request(method, path, json=body).status_code == 401
    assert client.request(method, path, json=body, headers=auth(volunteer_token)).status_code == 403
    assert client.request(method, path, json=body, headers=auth(admin_token)).status_code == 403


def test_residents_cannot_use_admin_alert_endpoints(client, resident_token):
    assert client.post("/api/admin/alerts", headers=auth(resident_token), json=FLOOD).status_code == 403
    assert client.get("/api/admin/help-requests", headers=auth(resident_token)).status_code == 403
