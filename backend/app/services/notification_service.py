from sqlalchemy import func, select, update
from sqlalchemy.orm import Session, selectinload

from app.core.exceptions import NotFoundError
from app.models import Notification, User


def list_notifications(db: Session, user: User, *, unread_only: bool, skip: int, limit: int) -> list[Notification]:
    query = (
        select(Notification)
        .options(selectinload(Notification.alert))
        .where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc(), Notification.id.desc())
        .offset(skip)
        .limit(limit)
    )
    if unread_only:
        query = query.where(Notification.is_read.is_(False))
    return list(db.scalars(query))


def mark_read(db: Session, user: User, notification_id: int) -> Notification:
    notification = db.get(Notification, notification_id)
    if notification is None or notification.user_id != user.id:
        raise NotFoundError("Notification not found")
    if not notification.is_read:
        notification.is_read = True
        db.commit()
        db.refresh(notification)
    return notification


def mark_all_read(db: Session, user: User) -> int:
    result = db.execute(
        update(Notification)
        .where(Notification.user_id == user.id, Notification.is_read.is_(False))
        .values(is_read=True)
    )
    db.commit()
    return result.rowcount


def unread_count(db: Session, user: User) -> int:
    return db.scalar(
        select(func.count()).select_from(Notification).where(
            Notification.user_id == user.id, Notification.is_read.is_(False)
        )
    )


def latest_notification_id(db: Session, user: User) -> int | None:
    return db.scalar(select(func.max(Notification.id)).where(Notification.user_id == user.id))
