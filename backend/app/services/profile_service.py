from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models import ResidentProfile, User, VolunteerProfile
from app.schemas.profile import ResidentProfileUpdate, VolunteerProfileUpdate


def get_resident_profile(user: User) -> ResidentProfile:
    if user.resident_profile is None:
        raise NotFoundError("Resident profile not found")
    return user.resident_profile


def update_resident_profile(db: Session, user: User, data: ResidentProfileUpdate) -> ResidentProfile:
    profile = get_resident_profile(user)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return profile


def get_volunteer_profile(user: User) -> VolunteerProfile:
    if user.volunteer_profile is None:
        raise NotFoundError("Volunteer profile not found")
    return user.volunteer_profile


def update_volunteer_profile(db: Session, user: User, data: VolunteerProfileUpdate) -> VolunteerProfile:
    profile = get_volunteer_profile(user)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return profile
