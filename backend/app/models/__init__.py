"""Import every model here so Base.metadata is complete for Alembic and create_all."""

from app.models.alert import Alert
from app.models.enums import (
    AlertSeverity,
    AlertSource,
    AlertStatus,
    AssignmentStatus,
    AssistanceType,
    AvailabilityStatus,
    NotificationType,
    ResponseStatus,
    UserRole,
)
from app.models.notification import Notification
from app.models.resident_profile import ResidentProfile
from app.models.response import Response
from app.models.user import User
from app.models.volunteer_assignment import VolunteerAssignment
from app.models.volunteer_profile import VolunteerProfile

__all__ = [
    "Alert",
    "AlertSeverity",
    "AlertSource",
    "AlertStatus",
    "AssignmentStatus",
    "AssistanceType",
    "AvailabilityStatus",
    "Notification",
    "NotificationType",
    "ResidentProfile",
    "Response",
    "ResponseStatus",
    "User",
    "UserRole",
    "VolunteerAssignment",
    "VolunteerProfile",
]
