from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ResponseStatus
from app.schemas.alert import AlertSummary


class ResponseCreate(BaseModel):
    alert_id: int = Field(gt=0)
    status: ResponseStatus


class ResponseUpdate(BaseModel):
    status: ResponseStatus


class ResponseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    alert_id: int
    resident_id: int
    status: ResponseStatus
    responded_at: datetime
    alert: AlertSummary


class HelpRequestRead(BaseModel):
    """A resident who answered NEEDS_HELP to an active alert (admin view)."""

    response_id: int
    responded_at: datetime
    alert: AlertSummary
    resident_id: int
    resident_name: str
    resident_phone: str
    state: str | None
    district: str | None
    city: str | None
    village: str | None
    address: str | None
    latitude: float | None
    longitude: float | None
    assistance_type: str | None
    accessibility_preferences: str | None
