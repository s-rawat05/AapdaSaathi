from fastapi import APIRouter, Query, status

from app.api.deps import AdminUser, DbSession
from app.models import UserRole
from app.schemas.user import AdminCreateRequest, UserRead
from app.services import user_service

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
