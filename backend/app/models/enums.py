"""Domain enums shared by ORM models and Pydantic schemas.

Stored as VARCHAR + CHECK constraint (not native PostgreSQL ENUM types) so
adding a value later is a simple migration and tests can run on SQLite.
"""

import enum

from sqlalchemy import Enum as SAEnum


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    RESIDENT = "RESIDENT"
    VOLUNTEER = "VOLUNTEER"


class AssistanceType(str, enum.Enum):
    MOBILITY = "MOBILITY"
    VISUAL = "VISUAL"
    HEARING = "HEARING"
    ELDERLY = "ELDERLY"
    OTHER = "OTHER"
    NONE = "NONE"


class AvailabilityStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    BUSY = "BUSY"
    OFFLINE = "OFFLINE"


class AlertSeverity(str, enum.Enum):
    """Severity levels from the Common Alerting Protocol (CAP), used by NDMA SACHET."""

    MINOR = "MINOR"
    MODERATE = "MODERATE"
    SEVERE = "SEVERE"
    EXTREME = "EXTREME"


class AlertSource(str, enum.Enum):
    SACHET = "SACHET"
    DEMO = "DEMO"


class AlertStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"


class NotificationType(str, enum.Enum):
    ALERT = "ALERT"
    ASSIGNMENT = "ASSIGNMENT"
    RESPONSE = "RESPONSE"
    SYSTEM = "SYSTEM"


class ResponseStatus(str, enum.Enum):
    SAFE = "SAFE"
    NEEDS_HELP = "NEEDS_HELP"


class AssignmentStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REACHED = "REACHED"
    RESOLVED = "RESOLVED"


def enum_type(enum_cls: type[enum.Enum], name: str) -> SAEnum:
    """VARCHAR column restricted to the enum's values by a named CHECK constraint."""
    return SAEnum(
        enum_cls,
        name=name,
        native_enum=False,
        create_constraint=True,
        validate_strings=True,
        length=20,
        values_callable=lambda cls: [member.value for member in cls],
    )
