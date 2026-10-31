"""Database-level constraints and the response upsert service."""

import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.core.exceptions import PermissionDeniedError
from app.models import (
    Alert,
    AlertSeverity,
    AlertSource,
    ResidentProfile,
    Response,
    ResponseStatus,
    User,
    UserRole,
    VolunteerAssignment,
)
from app.services.response_service import upsert_response


def _user(db, email, role=UserRole.RESIDENT) -> User:
    user = User(full_name="Test", email=email, phone="9000000000", password_hash="x", role=role)
    db.add(user)
    db.commit()
    return user


def _alert(db, **overrides) -> Alert:
    values = dict(
        event_name="Flash flood warning",
        disaster_type="Flood",
        severity=AlertSeverity.SEVERE,
        description="Heavy rainfall expected",
        affected_location="Dehradun",
        source=AlertSource.DEMO,
    )
    values.update(overrides)
    alert = Alert(**values)
    db.add(alert)
    db.commit()
    return alert


def test_response_upsert_updates_instead_of_duplicating(db):
    resident = _user(db, "r@example.com")
    alert = _alert(db)

    first = upsert_response(db, alert_id=alert.id, resident=resident, status=ResponseStatus.NEEDS_HELP)
    second = upsert_response(db, alert_id=alert.id, resident=resident, status=ResponseStatus.SAFE)

    assert first.id == second.id
    assert second.status is ResponseStatus.SAFE
    assert db.scalar(select(func.count()).select_from(Response)) == 1


def test_duplicate_response_rows_are_blocked_by_the_database(db):
    resident = _user(db, "r@example.com")
    alert = _alert(db)
    db.add(Response(alert_id=alert.id, resident_id=resident.id, status=ResponseStatus.SAFE))
    db.commit()
    db.add(Response(alert_id=alert.id, resident_id=resident.id, status=ResponseStatus.NEEDS_HELP))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_only_residents_can_respond(db):
    volunteer = _user(db, "v@example.com", UserRole.VOLUNTEER)
    alert = _alert(db)
    with pytest.raises(PermissionDeniedError):
        upsert_response(db, alert_id=alert.id, resident=volunteer, status=ResponseStatus.SAFE)


def test_external_alert_id_unique_when_present(db):
    _alert(db, external_alert_id=None)
    _alert(db, external_alert_id=None)  # multiple NULLs are fine
    _alert(db, source=AlertSource.SACHET, external_alert_id="sachet-123")
    with pytest.raises(IntegrityError):
        _alert(db, source=AlertSource.SACHET, external_alert_id="sachet-123")
    db.rollback()


def test_sachet_alert_requires_external_id(db):
    with pytest.raises(IntegrityError):
        _alert(db, source=AlertSource.SACHET, external_alert_id=None)
    db.rollback()


def test_check_constraints_reject_bad_coordinates(db):
    with pytest.raises(IntegrityError):
        _alert(db, latitude=95.0, longitude=10.0)
    db.rollback()
    with pytest.raises(IntegrityError):
        _alert(db, latitude=30.0, longitude=None)
    db.rollback()


def test_assignment_cannot_pair_a_user_with_themselves(db):
    user = _user(db, "r@example.com")
    alert = _alert(db)
    db.add(VolunteerAssignment(alert_id=alert.id, resident_id=user.id, volunteer_id=user.id))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_deleting_user_cascades_to_profile(db):
    user = _user(db, "r@example.com")
    db.add(ResidentProfile(user_id=user.id, state="Uttarakhand", district="Dehradun"))
    db.commit()
    db.delete(user)
    db.commit()
    assert db.scalar(select(func.count()).select_from(ResidentProfile)) == 0
