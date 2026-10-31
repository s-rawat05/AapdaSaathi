import enum

from pydantic import BaseModel, Field, model_validator

from app.models.enums import UserRole
from app.schemas.fields import Email, FullName, Password, Phone
from app.schemas.profile import ResidentProfileCreate, VolunteerProfileCreate
from app.schemas.user import UserRead


class PublicRole(str, enum.Enum):
    """Roles allowed through public registration. ADMIN is deliberately absent."""

    RESIDENT = "RESIDENT"
    VOLUNTEER = "VOLUNTEER"


class RegisterRequest(BaseModel):
    full_name: FullName
    email: Email
    phone: Phone
    password: Password
    role: PublicRole
    resident_profile: ResidentProfileCreate | None = None
    volunteer_profile: VolunteerProfileCreate | None = None

    @model_validator(mode="after")
    def _profile_matches_role(self):
        if self.role is PublicRole.RESIDENT:
            if self.resident_profile is None:
                raise ValueError("resident_profile is required when role is RESIDENT")
            if self.volunteer_profile is not None:
                raise ValueError("volunteer_profile is not allowed when role is RESIDENT")
        else:
            if self.volunteer_profile is None:
                raise ValueError("volunteer_profile is required when role is VOLUNTEER")
            if self.resident_profile is not None:
                raise ValueError("resident_profile is not allowed when role is VOLUNTEER")
        return self


class LoginRequest(BaseModel):
    email: Email
    # No strength rules here: only check it against the stored hash
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    role: UserRole
    user: UserRead
