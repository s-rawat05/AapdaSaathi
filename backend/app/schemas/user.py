from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import UserRole
from app.schemas.fields import Email, FullName, Password, Phone


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: str
    phone: str
    role: UserRole
    is_active: bool
    created_at: datetime


class AdminCreateRequest(BaseModel):
    """Payload for an existing admin creating another administrator account."""

    full_name: FullName
    email: Email
    phone: Phone
    password: Password
