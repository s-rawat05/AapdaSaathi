from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, Float, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, CreatedAtMixin
from app.models.enums import AlertSeverity, AlertSource, AlertStatus, enum_type

if TYPE_CHECKING:
    from app.models.notification import Notification
    from app.models.response import Response
    from app.models.user import User
    from app.models.volunteer_assignment import VolunteerAssignment


class Alert(CreatedAtMixin, Base):
    __tablename__ = "alerts"
    __table_args__ = (
        CheckConstraint("latitude IS NULL OR (latitude >= -90 AND latitude <= 90)", name="latitude_range"),
        CheckConstraint("longitude IS NULL OR (longitude >= -180 AND longitude <= 180)", name="longitude_range"),
        CheckConstraint("(latitude IS NULL) = (longitude IS NULL)", name="coordinates_pair"),
        CheckConstraint("radius_km IS NULL OR radius_km > 0", name="radius_positive"),
        CheckConstraint(
            "source <> 'SACHET' OR external_alert_id IS NOT NULL", name="sachet_requires_external_id"
        ),
        # "Active alerts that have not expired yet" is the hot query
        Index("ix_alerts_status_expires_at", "status", "expires_at"),
        Index("ix_alerts_target_state_target_district", "target_state", "target_district"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    event_name: Mapped[str] = mapped_column(String(200), nullable=False)
    # Free text rather than an enum: SACHET publishes many event types (Flood, Cyclone, Heat Wave, ...)
    disaster_type: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    severity: Mapped[AlertSeverity] = mapped_column(
        enum_type(AlertSeverity, "alert_severity"), index=True, nullable=False
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    instructions: Mapped[str | None] = mapped_column(Text)
    affected_location: Mapped[str] = mapped_column(String(255), nullable=False)
    # Structured targeting. An alert reaches a resident if their state/district match, or they are
    # within radius_km of (latitude, longitude). An alert with no targeting at all reaches everyone.
    target_state: Mapped[str | None] = mapped_column(String(100))
    target_district: Mapped[str | None] = mapped_column(String(100))
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    radius_km: Mapped[float | None] = mapped_column(Float)
    source: Mapped[AlertSource] = mapped_column(enum_type(AlertSource, "alert_source"), nullable=False)
    # Unique when present; PostgreSQL allows multiple NULLs under a UNIQUE constraint.
    external_alert_id: Mapped[str | None] = mapped_column(String(255), unique=True)
    status: Mapped[AlertStatus] = mapped_column(
        enum_type(AlertStatus, "alert_status"),
        default=AlertStatus.ACTIVE,
        server_default=AlertStatus.ACTIVE.value,
        nullable=False,
    )
    created_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    creator: Mapped["User | None"] = relationship()
    notifications: Mapped[list["Notification"]] = relationship(
        back_populates="alert", cascade="all, delete-orphan", passive_deletes=True
    )
    responses: Mapped[list["Response"]] = relationship(
        back_populates="alert", cascade="all, delete-orphan", passive_deletes=True
    )
    assignments: Mapped[list["VolunteerAssignment"]] = relationship(
        back_populates="alert", cascade="all, delete-orphan", passive_deletes=True
    )
