from typing import TYPE_CHECKING

from sqlalchemy import Boolean, CheckConstraint, Float, ForeignKey, Index, SmallInteger, String, Text, false, true
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin
from app.models.enums import AssistanceType, enum_type

if TYPE_CHECKING:
    from app.models.user import User


class ResidentProfile(TimestampMixin, Base):
    __tablename__ = "resident_profiles"
    __table_args__ = (
        CheckConstraint("age IS NULL OR (age >= 0 AND age <= 120)", name="age_range"),
        CheckConstraint("latitude IS NULL OR (latitude >= -90 AND latitude <= 90)", name="latitude_range"),
        CheckConstraint("longitude IS NULL OR (longitude >= -180 AND longitude <= 180)", name="longitude_range"),
        CheckConstraint("(latitude IS NULL) = (longitude IS NULL)", name="coordinates_pair"),
        # A contact name/relationship without a phone number is useless in an emergency
        CheckConstraint(
            "emergency_contact IS NOT NULL OR "
            "(emergency_contact_name IS NULL AND emergency_contact_relationship IS NULL)",
            name="contact_requires_phone",
        ),
        # Alert targeting looks residents up by region
        Index("ix_resident_profiles_state_district", "state", "district"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    age: Mapped[int | None] = mapped_column(SmallInteger)
    address: Mapped[str | None] = mapped_column(String(255))
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    district: Mapped[str] = mapped_column(String(100), nullable=False)
    city: Mapped[str | None] = mapped_column(String(100))
    village: Mapped[str | None] = mapped_column(String(100))
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    assistance_type: Mapped[AssistanceType] = mapped_column(
        enum_type(AssistanceType, "assistance_type"),
        default=AssistanceType.NONE,
        server_default=AssistanceType.NONE.value,
        index=True,
        nullable=False,
    )
    # Primary emergency contact. `emergency_contact` holds the phone number (Phase 2 name kept for compatibility).
    emergency_contact: Mapped[str | None] = mapped_column(String(20))
    emergency_contact_name: Mapped[str | None] = mapped_column(String(120))
    emergency_contact_relationship: Mapped[str | None] = mapped_column(String(50))
    # Free-text notes for responders (e.g. "uses a wheelchair")
    accessibility_preferences: Mapped[str | None] = mapped_column(Text)

    # Alert delivery preferences. They only add or remove extra channels;
    # critical alert content is always shown on screen regardless.
    voice_alerts_enabled: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true(), nullable=False)
    visual_alerts_enabled: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true(), nullable=False)
    vibration_enabled: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true(), nullable=False)
    simple_language_enabled: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=false(), nullable=False
    )

    user: Mapped["User"] = relationship(back_populates="resident_profile")
