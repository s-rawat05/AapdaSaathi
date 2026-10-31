from datetime import datetime
from typing import ClassVar

from pydantic import BaseModel, ConfigDict, computed_field, model_validator

from app.models.enums import AssistanceType, AvailabilityStatus
from app.schemas.fields import (
    Age,
    Email,
    FullName,
    Latitude,
    LocationText,
    Longitude,
    OptionalAddress,
    OptionalLongText,
    OptionalPersonName,
    OptionalPhone,
    OptionalRegionName,
    OptionalRelationship,
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
    emergency_contact_name: OptionalPersonName = None
    emergency_contact_relationship: OptionalRelationship = None
    accessibility_preferences: OptionalLongText = None
    voice_alerts_enabled: bool = True
    visual_alerts_enabled: bool = True
    vibration_enabled: bool = True
    simple_language_enabled: bool = False

    @model_validator(mode="after")
    def _contact_needs_phone(self):
        if (self.emergency_contact_name or self.emergency_contact_relationship) and not self.emergency_contact:
            raise ValueError("emergency_contact (phone number) is required when a contact name or relationship is given")
        return self


class ResidentProfileUpdate(_NonNullableOnUpdateMixin, _CoordinatesMixin):
    """Partial update of the resident's account details and profile. Send null to clear optional fields."""

    _non_nullable: ClassVar[tuple[str, ...]] = (
        "full_name", "email", "phone", "state", "district", "assistance_type",
        "voice_alerts_enabled", "visual_alerts_enabled", "vibration_enabled", "simple_language_enabled",
    )

    # Account (users table)
    full_name: FullName | None = None
    email: Email | None = None
    phone: Phone | None = None
    # Profile
    age: Age | None = None
    address: OptionalAddress = None
    state: RegionName | None = None
    district: RegionName | None = None
    city: OptionalRegionName = None
    village: OptionalRegionName = None
    assistance_type: AssistanceType | None = None
    emergency_contact: OptionalPhone = None
    emergency_contact_name: OptionalPersonName = None
    emergency_contact_relationship: OptionalRelationship = None
    accessibility_preferences: OptionalLongText = None
    voice_alerts_enabled: bool | None = None
    visual_alerts_enabled: bool | None = None
    vibration_enabled: bool | None = None
    simple_language_enabled: bool | None = None

    ACCOUNT_FIELDS: ClassVar[frozenset[str]] = frozenset({"full_name", "email", "phone"})


class ResidentAccountRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    full_name: str
    email: str
    phone: str


class ProfileCompletion(BaseModel):
    percent: int
    missing: list[str]


class ResidentProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    user: ResidentAccountRead
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
    emergency_contact_name: str | None
    emergency_contact_relationship: str | None
    accessibility_preferences: str | None
    voice_alerts_enabled: bool
    visual_alerts_enabled: bool
    vibration_enabled: bool
    simple_language_enabled: bool
    created_at: datetime
    updated_at: datetime

    @computed_field
    @property
    def completion(self) -> ProfileCompletion:
        # state and district are always present (required), so they count as done
        checks = {
            "state": True,
            "district": True,
            "age": self.age is not None,
            "address": bool(self.address),
            "city or village": bool(self.city or self.village),
            "map location": self.latitude is not None,
            "emergency contact phone": bool(self.emergency_contact),
            "emergency contact name": bool(self.emergency_contact_name),
        }
        missing = [label for label, done in checks.items() if not done]
        return ProfileCompletion(percent=round(100 * (len(checks) - len(missing)) / len(checks)), missing=missing)


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
