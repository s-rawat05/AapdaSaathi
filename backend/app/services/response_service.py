"""Resident safety responses (SAFE / NEEDS_HELP) to alerts.

A resident who has not responded has no row at all and is reported as
NO_RESPONSE; nobody is ever marked safe implicitly.
"""

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.exceptions import ConflictError, NotFoundError, PermissionDeniedError
from app.models import (
    Alert,
    AlertStatus,
    Notification,
    NotificationType,
    ResidentProfile,
    Response,
    ResponseStatus,
    User,
    UserRole,
)
from app.services import alert_service


def _profile(resident: User) -> ResidentProfile:
    if resident.role is not UserRole.RESIDENT:
        raise PermissionDeniedError("Only residents can respond to alerts")
    if resident.resident_profile is None:
        raise NotFoundError("Resident profile not found")
    return resident.resident_profile


def _notify_admins(db: Session, resident: User, alert: Alert, previous: ResponseStatus | None, new: ResponseStatus):
    """Tell every active admin when someone starts or stops needing help. Does not commit."""
    if new is ResponseStatus.NEEDS_HELP and previous is not ResponseStatus.NEEDS_HELP:
        title = f"Help requested: {resident.full_name}"
        verb = "needs help"
    elif previous is ResponseStatus.NEEDS_HELP and new is ResponseStatus.SAFE:
        title = f"Now safe: {resident.full_name}"
        verb = "is now marked safe"
    else:
        return

    profile = resident.resident_profile
    place = ", ".join(p for p in (profile.village, profile.city, profile.district, profile.state) if p)
    message = f"{resident.full_name} ({resident.phone}) {verb} during '{alert.event_name}'. Location: {place}."
    admin_ids = db.scalars(select(User.id).where(User.role == UserRole.ADMIN, User.is_active.is_(True))).all()
    db.add_all(
        Notification(
            user_id=admin_id, alert_id=alert.id, title=title[:200], message=message,
            notification_type=NotificationType.RESPONSE,
        )
        for admin_id in admin_ids
    )


def create_response(db: Session, resident: User, alert_id: int, status: ResponseStatus) -> Response:
    profile = _profile(resident)
    alert = alert_service.get_relevant_alert(db, alert_id, profile)

    existing = db.scalar(select(Response).where(Response.alert_id == alert.id, Response.resident_id == resident.id))
    if existing is not None:
        raise ConflictError("You have already responded to this alert. Update your existing response instead.")

    response = Response(alert_id=alert.id, resident_id=resident.id, status=status)
    db.add(response)
    _notify_admins(db, resident, alert, None, status)
    try:
        db.commit()
    except IntegrityError as exc:
        # Two simultaneous submissions: the unique (alert_id, resident_id) constraint stops the duplicate
        db.rollback()
        raise ConflictError("You have already responded to this alert. Update your existing response instead.") from exc
    db.refresh(response)
    return response


def update_response(db: Session, resident: User, response_id: int, status: ResponseStatus) -> Response:
    _profile(resident)
    response = db.get(Response, response_id)
    if response is None or response.resident_id != resident.id:
        raise NotFoundError("Response not found")
    if not alert_service.is_active(response.alert):
        raise ConflictError("This alert is no longer active, so the response can no longer be changed")

    previous = response.status
    response.status = status
    response.responded_at = func.now()  # refresh the timestamp even if the status is unchanged
    _notify_admins(db, resident, response.alert, previous, status)
    db.commit()
    db.refresh(response)
    return response


def list_my_responses(db: Session, resident: User) -> list[Response]:
    _profile(resident)
    query = (
        select(Response)
        .options(selectinload(Response.alert))
        .where(Response.resident_id == resident.id)
        .order_by(Response.responded_at.desc())
    )
    return list(db.scalars(query))


def responses_by_alert(db: Session, resident_id: int, alert_ids: list[int]) -> dict[int, Response]:
    if not alert_ids:
        return {}
    rows = db.scalars(select(Response).where(Response.resident_id == resident_id, Response.alert_id.in_(alert_ids)))
    return {r.alert_id: r for r in rows}


def list_help_requests(db: Session) -> list[tuple[Response, User, ResidentProfile]]:
    """Residents currently answering NEEDS_HELP to an active alert, newest first (admin view)."""
    rows = db.execute(
        select(Response, User, ResidentProfile)
        .join(User, User.id == Response.resident_id)
        .outerjoin(ResidentProfile, ResidentProfile.user_id == User.id)
        .join(Alert, Alert.id == Response.alert_id)
        .options(selectinload(Response.alert))
        .where(Response.status == ResponseStatus.NEEDS_HELP, Alert.status == AlertStatus.ACTIVE)
        .order_by(Response.responded_at.desc())
    ).all()
    return [(r, u, p) for r, u, p in rows if alert_service.is_active(r.alert)]


def upsert_response(db: Session, *, alert_id: int, resident: User, status: ResponseStatus) -> Response:
    """Record a resident's response to an alert, updating it if one already exists.

    The (alert_id, resident_id) unique constraint guarantees at most one row; if two
    requests race to insert, the loser retries as an update.
    """
    if resident.role is not UserRole.RESIDENT:
        raise PermissionDeniedError("Only residents can respond to alerts")

    def _existing() -> Response | None:
        return db.scalar(
            select(Response).where(Response.alert_id == alert_id, Response.resident_id == resident.id)
        )

    response = _existing()
    if response is None:
        response = Response(alert_id=alert_id, resident_id=resident.id, status=status)
        db.add(response)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            response = _existing()
            if response is None:
                raise
            response.status = status
            db.commit()
    else:
        response.status = status
        db.commit()

    db.refresh(response)
    return response
