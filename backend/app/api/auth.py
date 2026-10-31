from fastapi import APIRouter, HTTPException, status

from app.api.deps import DbSession
from app.core.security import create_access_token
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.schemas.user import UserRead
from app.services import user_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    responses={409: {"description": "Email already registered"}},
)
def register(data: RegisterRequest, db: DbSession):
    """Public registration for RESIDENT and VOLUNTEER accounts. ADMIN cannot be registered here."""
    return user_service.register_user(db, data)


@router.post("/login", response_model=TokenResponse, responses={401: {"description": "Invalid credentials"}})
def login(data: LoginRequest, db: DbSession):
    user = user_service.authenticate_user(db, data.email, data.password)
    if user is None:
        # Same message for unknown email and wrong password
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account has been disabled")

    token, expires_in = create_access_token(user.id, user.role)
    return TokenResponse(access_token=token, expires_in=expires_in, role=user.role, user=user)
