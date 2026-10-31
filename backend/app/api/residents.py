from fastapi import APIRouter

from app.api.deps import DbSession, ResidentUser
from app.schemas.profile import ResidentProfileRead, ResidentProfileUpdate
from app.services import profile_service

router = APIRouter(prefix="/residents", tags=["Residents"])


@router.get("/profile", response_model=ResidentProfileRead)
def read_resident_profile(user: ResidentUser):
    return profile_service.get_resident_profile(user)


@router.put("/profile", response_model=ResidentProfileRead)
def update_resident_profile(data: ResidentProfileUpdate, user: ResidentUser, db: DbSession):
    """Partial update: only fields present in the body are changed."""
    return profile_service.update_resident_profile(db, user, data)
