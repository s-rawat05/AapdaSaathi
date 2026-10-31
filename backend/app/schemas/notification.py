from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import NotificationType
from app.schemas.alert import AlertSummary


class NotificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    message: str
    notification_type: NotificationType
    is_read: bool
    created_at: datetime
    alert: AlertSummary | None


class MarkAllReadResult(BaseModel):
    updated: int


class ResidentUpdates(BaseModel):
    """Cheap payload for polling: the client re-fetches lists only when these change."""

    active_alert_ids: list[int]
    unread_notifications: int
    latest_notification_id: int | None
