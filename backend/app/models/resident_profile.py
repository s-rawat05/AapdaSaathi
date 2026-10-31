from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, Float, ForeignKey, Index, SmallInteger, String, Text
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
    emergency_contact: Mapped[str | None] = mapped_column(String(20))
    accessibility_preferences: Mapped[str | None] = mapped_column(Text)

    user: Mapped["User"] = relationship(back_populates="resident_profile")
