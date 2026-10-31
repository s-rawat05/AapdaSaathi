from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.enums import ResponseStatus, enum_type

if TYPE_CHECKING:
    from app.models.alert import Alert
    from app.models.user import User


class Response(Base):
    """A resident's safety check-in for an alert. One row per (alert, resident); updates overwrite it."""

    __tablename__ = "responses"
    __table_args__ = (
        UniqueConstraint("alert_id", "resident_id"),
        # "Who needs help for this alert?"
        Index("ix_responses_alert_id_status", "alert_id", "status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    alert_id: Mapped[int] = mapped_column(ForeignKey("alerts.id", ondelete="CASCADE"), nullable=False)
    # References users.id (role RESIDENT); role is enforced in the service layer.
    resident_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    status: Mapped[ResponseStatus] = mapped_column(enum_type(ResponseStatus, "response_status"), nullable=False)
    responded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    alert: Mapped["Alert"] = relationship(back_populates="responses")
    resident: Mapped["User"] = relationship()
