from datetime import UTC, datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, computed_field, field_validator, model_validator

from app.models.enums import AlertSeverity, AlertSource, AlertStatus, ResponseStatus
from app.schemas.fields import Latitude, LocationText, Longitude, OptionalLongText, OptionalRegionName

ShortTitle = Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=200)]
DisasterType = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=50)]
LongText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=5, max_length=5000)]


class AlertCreate(BaseModel):
    """Admin-created alert. The source is always DEMO: official SACHET alerts only arrive via integration."""

    event_name: ShortTitle
    disaster_type: DisasterType
    severity: AlertSeverity
    description: LongText
    instructions: OptionalLongText = None
    affected_location: LocationText
    target_state: OptionalRegionName = None
    target_district: OptionalRegionName = None
    latitude: Latitude | None = None
    longitude: Longitude | None = None
    radius_km: float | None = Field(default=None, gt=0, le=2000)
    expires_at: datetime | None = None

    @field_validator("expires_at")
    @classmethod
    def _future(cls, value: datetime | None) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            value = value.replace(tzinfo=UTC)
        if value <= datetime.now(UTC):
            raise ValueError("expires_at must be in the future")
        return value

    @model_validator(mode="after")
    def _geo_consistency(self):
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("latitude and longitude must be provided together")
        if self.radius_km is not None and self.latitude is None:
            raise ValueError("radius_km requires latitude and longitude")
        if self.target_district and not self.target_state:
            raise ValueError("target_district requires target_state")
        return self


class AlertSummary(BaseModel):
    """Compact alert reference embedded in notifications and responses."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    event_name: str
    disaster_type: str
    severity: AlertSeverity
    source: AlertSource
    status: AlertStatus

    @computed_field
    @property
    def is_official(self) -> bool:
        return self.source is AlertSource.SACHET


class AlertRead(AlertSummary):
    description: str
    instructions: str | None
    affected_location: str
    target_state: str | None
    target_district: str | None
    latitude: float | None
    longitude: float | None
    radius_km: float | None
    created_at: datetime
    expires_at: datetime | None


class MyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: ResponseStatus
    responded_at: datetime


class ResidentAlertRead(AlertRead):
    """An alert as seen by a resident, with their own response (if any)."""

    my_response: MyResponse | None = None

    @computed_field
    @property
    def response_status(self) -> str:
        # Never assume safety: no response means NO_RESPONSE, not SAFE
        return self.my_response.status.value if self.my_response else "NO_RESPONSE"
