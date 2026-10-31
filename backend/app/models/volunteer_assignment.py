from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.enums import AssignmentStatus, enum_type

if TYPE_CHECKING:
    from app.models.alert import Alert
    from app.models.user import User


class VolunteerAssignment(Base):
    __tablename__ = "volunteer_assignments"
    __table_args__ = (
        CheckConstraint("resident_id <> volunteer_id", name="distinct_people"),
        # A volunteer's open tasks
        Index("ix_volunteer_assignments_volunteer_id_status", "volunteer_id", "status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    alert_id: Mapped[int] = mapped_column(
        ForeignKey("alerts.id", ondelete="CASCADE"), index=True, nullable=False
    )
    # Both reference users.id; roles (RESIDENT / VOLUNTEER) are enforced in the service layer.
    resident_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    volunteer_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[AssignmentStatus] = mapped_column(
        enum_type(AssignmentStatus, "assignment_status"),
        default=AssignmentStatus.PENDING,
        server_default=AssignmentStatus.PENDING.value,
        nullable=False,
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    alert: Mapped["Alert"] = relationship(back_populates="assignments")
    resident: Mapped["User"] = relationship(foreign_keys=[resident_id])
    volunteer: Mapped["User"] = relationship(foreign_keys=[volunteer_id])
