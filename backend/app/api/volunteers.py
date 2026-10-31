from fastapi import APIRouter

from app.api.deps import DbSession, VolunteerUser
from app.schemas.profile import VolunteerProfileRead, VolunteerProfileUpdate
from app.services import profile_service

router = APIRouter(prefix="/volunteers", tags=["Volunteers"])


@router.get("/profile", response_model=VolunteerProfileRead)
def read_volunteer_profile(user: VolunteerUser):
    return profile_service.get_volunteer_profile(user)


@router.put("/profile", response_model=VolunteerProfileRead)
def update_volunteer_profile(data: VolunteerProfileUpdate, user: VolunteerUser, db: DbSession):
    """Partial update: only fields present in the body are changed."""
    return profile_service.update_volunteer_profile(db, user, data)
