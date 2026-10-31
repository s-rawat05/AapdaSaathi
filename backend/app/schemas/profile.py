from datetime import datetime
from typing import ClassVar

from pydantic import BaseModel, ConfigDict, model_validator

from app.models.enums import AssistanceType, AvailabilityStatus
from app.schemas.fields import (
    Age,
    Latitude,
    LocationText,
    Longitude,
    OptionalAddress,
    OptionalLongText,
    OptionalPhone,
    OptionalRegionName,
    Phone,
    RegionName,
)


class _CoordinatesMixin(BaseModel):
    latitude: Latitude | None = None
    longitude: Longitude | None = None

    @model_validator(mode="after")
    def _coordinates_together(self):
        sent = {"latitude", "longitude"} & self.model_fields_set
        if sent and (self.latitude is None) != (self.longitude is None):
            raise ValueError("latitude and longitude must be provided together")
        return self


class _NonNullableOnUpdateMixin(BaseModel):
    """Partial-update schemas: omitted fields are left alone, but these may not be set to null."""

    _non_nullable: ClassVar[tuple[str, ...]] = ()

    @model_validator(mode="after")
    def _reject_explicit_nulls(self):
        for name in self._non_nullable:
            if name in self.model_fields_set and getattr(self, name) is None:
                raise ValueError(f"{name} cannot be null")
        return self


# ---------- Resident ----------


class ResidentProfileCreate(_CoordinatesMixin):
    age: Age | None = None
    address: OptionalAddress = None
    state: RegionName
    district: RegionName
    city: OptionalRegionName = None
    village: OptionalRegionName = None
    assistance_type: AssistanceType = AssistanceType.NONE
    emergency_contact: OptionalPhone = None
    accessibility_preferences: OptionalLongText = None


class ResidentProfileUpdate(_NonNullableOnUpdateMixin, _CoordinatesMixin):
    _non_nullable: ClassVar[tuple[str, ...]] = ("state", "district", "assistance_type")

    age: Age | None = None
    address: OptionalAddress = None
    state: RegionName | None = None
    district: RegionName | None = None
    city: OptionalRegionName = None
    village: OptionalRegionName = None
    assistance_type: AssistanceType | None = None
    emergency_contact: OptionalPhone = None
    accessibility_preferences: OptionalLongText = None


class ResidentProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    age: int | None
    address: str | None
    state: str
    district: str
    city: str | None
    village: str | None
    latitude: float | None
    longitude: float | None
    assistance_type: AssistanceType
    emergency_contact: str | None
    accessibility_preferences: str | None
    created_at: datetime
    updated_at: datetime


# ---------- Volunteer ----------


class VolunteerProfileCreate(_CoordinatesMixin):
    # Defaults to the account phone when omitted
    phone: OptionalPhone = None
    location: LocationText
    availability_status: AvailabilityStatus = AvailabilityStatus.AVAILABLE


class VolunteerProfileUpdate(_NonNullableOnUpdateMixin, _CoordinatesMixin):
    _non_nullable: ClassVar[tuple[str, ...]] = ("phone", "location", "availability_status")

    phone: Phone | None = None
    location: LocationText | None = None
    availability_status: AvailabilityStatus | None = None


class VolunteerProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    phone: str
    location: str
    latitude: float | None
    longitude: float | None
    availability_status: AvailabilityStatus
    created_at: datetime
    updated_at: datetime
