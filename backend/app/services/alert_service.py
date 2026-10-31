"""Alert lifecycle, targeting and fan-out to residents."""

import math
from datetime import UTC, datetime

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.models import (
    Alert,
    AlertSeverity,
    AlertSource,
    AlertStatus,
    Notification,
    NotificationType,
    ResidentProfile,
    User,
    UserRole,
)
from app.schemas.alert import AlertCreate

# Resident-facing severity names (stored values follow CAP, as used by NDMA SACHET)
SEVERITY_LABELS = {
    AlertSeverity.MINOR: "Low",
    AlertSeverity.MODERATE: "Moderate",
    AlertSeverity.SEVERE: "High",
    AlertSeverity.EXTREME: "Extreme",
}


def _aware(value: datetime | None) -> datetime | None:
    # SQLite returns naive datetimes; treat them as UTC
    if value is not None and value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


def is_active(alert: Alert, now: datetime | None = None) -> bool:
    now = now or datetime.now(UTC)
    expires_at = _aware(alert.expires_at)
    return alert.status is AlertStatus.ACTIVE and (expires_at is None or expires_at > now)


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _same(a: str | None, b: str | None) -> bool:
    return a is not None and b is not None and a.strip().casefold() == b.strip().casefold()


def is_relevant(alert: Alert, profile: ResidentProfile) -> bool:
    """Does this alert apply to this resident?

    - region match: target_state equals the resident's state and, if set, target_district equals theirs
    - radius match: resident's coordinates are within radius_km of the alert's coordinates
    - an alert with neither kind of targeting applies to everyone
    """
    has_region = alert.target_state is not None
    has_radius = alert.latitude is not None and alert.radius_km is not None
    if not has_region and not has_radius:
        return True

    if has_region and _same(alert.target_state, profile.state):
        if alert.target_district is None or _same(alert.target_district, profile.district):
            return True

    if has_radius and profile.latitude is not None:
        distance = haversine_km(alert.latitude, alert.longitude, profile.latitude, profile.longitude)
        if distance <= alert.radius_km:
            return True
    return False


def active_alerts(db: Session) -> list[Alert]:
    now = datetime.now(UTC)
    query = (
        select(Alert)
        .where(Alert.status == AlertStatus.ACTIVE, or_(Alert.expires_at.is_(None), Alert.expires_at > now))
        .order_by(Alert.created_at.desc(), Alert.id.desc())
    )
    return list(db.scalars(query))


SEVERITY_RANK = {AlertSeverity.EXTREME: 0, AlertSeverity.SEVERE: 1, AlertSeverity.MODERATE: 2, AlertSeverity.MINOR: 3}


def relevant_active_alerts(db: Session, profile: ResidentProfile) -> list[Alert]:
    """Alerts for this resident, most severe first, then newest first."""
    # Filtering in Python keeps the targeting rules in one place; the number of
    # simultaneously active alerts is small. Move to SQL/PostGIS if that changes.
    alerts = [alert for alert in active_alerts(db) if is_relevant(alert, profile)]  # already newest first
    return sorted(alerts, key=lambda a: SEVERITY_RANK[a.severity])  # stable sort keeps time order within a level


def get_relevant_alert(db: Session, alert_id: int, profile: ResidentProfile, *, require_active: bool = True) -> Alert:
    alert = db.get(Alert, alert_id)
    if alert is None or not is_relevant(alert, profile):
        # Same answer for "does not exist" and "not for you"
        raise NotFoundError("Alert not found")
    if require_active and not is_active(alert):
        raise ConflictError("This alert is no longer active")
    return alert


def _notification_text(alert: Alert) -> tuple[str, str]:
    title = f"{SEVERITY_LABELS[alert.severity]} alert: {alert.event_name}"[:200]
    guidance = alert.instructions or alert.description
    message = f"{alert.disaster_type} alert for {alert.affected_location}. {guidance}"
    return title, message


def notify_residents(db: Session, alert: Alert) -> int:
    """Create an ALERT notification for every active resident the alert applies to. Does not commit."""
    rows = db.execute(
        select(User.id, ResidentProfile)
        .join(ResidentProfile, ResidentProfile.user_id == User.id)
        .where(User.role == UserRole.RESIDENT, User.is_active.is_(True))
    ).all()
    title, message = _notification_text(alert)
    recipients = [user_id for user_id, profile in rows if is_relevant(alert, profile)]
    db.add_all(
        Notification(
            user_id=user_id, alert_id=alert.id, title=title, message=message,
            notification_type=NotificationType.ALERT,
        )
        for user_id in recipients
    )
    return len(recipients)


def create_demo_alert(db: Session, data: AlertCreate, creator: User) -> tuple[Alert, int]:
    """Admin-created alerts are always DEMO (simulated); returns (alert, residents_notified)."""
    alert = Alert(**data.model_dump(), source=AlertSource.DEMO, created_by=creator.id)
    db.add(alert)
    db.flush()
    notified = notify_residents(db, alert)
    db.commit()
    db.refresh(alert)
    return alert, notified
