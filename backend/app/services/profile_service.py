from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.models import ResidentProfile, User, VolunteerProfile
from app.schemas.profile import ResidentProfileUpdate, VolunteerProfileUpdate
from app.services.user_service import EMAIL_TAKEN, get_user_by_email


def get_resident_profile(user: User) -> ResidentProfile:
    if user.resident_profile is None:
        raise NotFoundError("Resident profile not found")
    return user.resident_profile


def update_resident_profile(db: Session, user: User, data: ResidentProfileUpdate) -> ResidentProfile:
    """Partial update of the resident's account fields (name, email, phone) and profile."""
    profile = get_resident_profile(user)
    changes = data.model_dump(exclude_unset=True)

    new_email = changes.get("email")
    if new_email and new_email != user.email:
        other = get_user_by_email(db, new_email)
        if other is not None and other.id != user.id:
            raise ConflictError(EMAIL_TAKEN)

    for field, value in changes.items():
        setattr(user if field in ResidentProfileUpdate.ACCOUNT_FIELDS else profile, field, value)

    if profile.emergency_contact is None and (profile.emergency_contact_name or profile.emergency_contact_relationship):
        db.rollback()
        raise ValidationError(
            "An emergency contact needs a phone number. To remove the contact, clear the name, "
            "relationship and phone together."
        )

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ConflictError(EMAIL_TAKEN) from exc
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
