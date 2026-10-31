from fastapi import APIRouter, Query, status
from pydantic import BaseModel

from app.api.deps import AdminUser, DbSession
from app.models import UserRole
from app.schemas.alert import AlertCreate, AlertRead, AlertSummary
from app.schemas.response import HelpRequestRead
from app.schemas.user import AdminCreateRequest, UserRead
from app.services import alert_service, response_service, user_service

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/users", response_model=list[UserRead])
def list_users(
    _: AdminUser,
    db: DbSession,
    role: UserRole | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    return user_service.list_users(db, role=role, skip=skip, limit=limit)


@router.post(
    "/users",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    responses={409: {"description": "Email already registered"}},
)
def create_admin_user(data: AdminCreateRequest, _: AdminUser, db: DbSession):
    """Create another administrator. Only existing admins can do this."""
    return user_service.create_admin(
        db, full_name=data.full_name, email=data.email, phone=data.phone, password=data.password
    )


class AlertCreated(BaseModel):
    alert: AlertRead
    residents_notified: int


@router.post("/alerts", response_model=AlertCreated, status_code=status.HTTP_201_CREATED)
def create_alert(data: AlertCreate, admin: AdminUser, db: DbSession):
    """Create a SIMULATED (DEMO) alert and notify every resident it targets.

    Official alerts (source SACHET) can only come from the SACHET integration, never from this endpoint.
    """
    alert, notified = alert_service.create_demo_alert(db, data, admin)
    return AlertCreated(alert=AlertRead.model_validate(alert), residents_notified=notified)


@router.get("/help-requests", response_model=list[HelpRequestRead])
def list_help_requests(_: AdminUser, db: DbSession):
    """Residents who answered I NEED HELP to a still-active alert, newest first."""
    return [
        HelpRequestRead(
            response_id=response.id,
            responded_at=response.responded_at,
            alert=AlertSummary.model_validate(response.alert),
            resident_id=user.id,
            resident_name=user.full_name,
            resident_phone=user.phone,
            state=profile.state if profile else None,
            district=profile.district if profile else None,
            city=profile.city if profile else None,
            village=profile.village if profile else None,
            address=profile.address if profile else None,
            latitude=profile.latitude if profile else None,
            longitude=profile.longitude if profile else None,
            assistance_type=profile.assistance_type.value if profile else None,
            accessibility_preferences=profile.accessibility_preferences if profile else None,
        )
        for response, user, profile in response_service.list_help_requests(db)
    ]
