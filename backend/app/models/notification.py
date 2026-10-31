from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Index, String, Text, false
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, CreatedAtMixin
from app.models.enums import NotificationType, enum_type

if TYPE_CHECKING:
    from app.models.alert import Alert
    from app.models.user import User


class Notification(CreatedAtMixin, Base):
    __tablename__ = "notifications"
    __table_args__ = (
        # Unread-count / inbox query per user
        Index("ix_notifications_user_id_is_read", "user_id", "is_read"),
        # Newest-first history per user
        Index("ix_notifications_user_id_created_at", "user_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    # Nullable: SYSTEM notifications are not tied to an alert
    alert_id: Mapped[int | None] = mapped_column(ForeignKey("alerts.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    notification_type: Mapped[NotificationType] = mapped_column(
        enum_type(NotificationType, "notification_type"), nullable=False
    )
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false(), nullable=False)

    user: Mapped["User"] = relationship(back_populates="notifications")
    alert: Mapped["Alert | None"] = relationship(back_populates="notifications")
