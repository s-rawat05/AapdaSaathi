from fastapi import APIRouter, Query

from app.api.deps import DbSession, ResidentUser
from app.schemas.alert import MyResponse, ResidentAlertRead
from app.schemas.notification import MarkAllReadResult, NotificationRead, ResidentUpdates
from app.schemas.profile import ResidentProfileRead, ResidentProfileUpdate
from app.services import alert_service, notification_service, profile_service, response_service

router = APIRouter(prefix="/residents", tags=["Residents"])


@router.get("/profile", response_model=ResidentProfileRead)
def read_resident_profile(user: ResidentUser):
    return profile_service.get_resident_profile(user)


@router.put(
    "/profile",
    response_model=ResidentProfileRead,
    responses={409: {"description": "Email already in use"}, 422: {"description": "Validation error"}},
)
def update_resident_profile(data: ResidentProfileUpdate, user: ResidentUser, db: DbSession):
    """Partial update: only fields present in the body are changed. Also updates full_name, email and phone."""
    return profile_service.update_resident_profile(db, user, data)


@router.get("/alerts", response_model=list[ResidentAlertRead])
def read_my_alerts(user: ResidentUser, db: DbSession):
    """Active alerts that apply to this resident, newest first, with their own response status."""
    profile = profile_service.get_resident_profile(user)
    alerts = alert_service.relevant_active_alerts(db, profile)
    responses = response_service.responses_by_alert(db, user.id, [a.id for a in alerts])
    result = []
    for alert in alerts:
        item = ResidentAlertRead.model_validate(alert)
        response = responses.get(alert.id)
        if response is not None:
            item.my_response = MyResponse.model_validate(response)
        result.append(item)
    return result


@router.get("/notifications", response_model=list[NotificationRead])
def read_my_notifications(
    user: ResidentUser,
    db: DbSession,
    unread_only: bool = False,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    return notification_service.list_notifications(db, user, unread_only=unread_only, skip=skip, limit=limit)


@router.patch("/notifications/read-all", response_model=MarkAllReadResult)
def mark_all_my_notifications_read(user: ResidentUser, db: DbSession):
    return MarkAllReadResult(updated=notification_service.mark_all_read(db, user))


@router.patch("/notifications/{notification_id}/read", response_model=NotificationRead)
def mark_notification_read(notification_id: int, user: ResidentUser, db: DbSession):
    return notification_service.mark_read(db, user, notification_id)


@router.get("/updates", response_model=ResidentUpdates)
def read_updates(user: ResidentUser, db: DbSession):
    """Small payload for polling; clients re-fetch alerts/notifications only when it changes."""
    profile = profile_service.get_resident_profile(user)
    return ResidentUpdates(
        active_alert_ids=[a.id for a in alert_service.relevant_active_alerts(db, profile)],
        unread_notifications=notification_service.unread_count(db, user),
        latest_notification_id=notification_service.latest_notification_id(db, user),
    )
