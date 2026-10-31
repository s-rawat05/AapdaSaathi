"""Reusable, validated field types for request schemas."""

import re
from typing import Annotated

from pydantic import AfterValidator, BeforeValidator, EmailStr, Field, StringConstraints


def _blank_to_none(value):
    if isinstance(value, str) and not value.strip():
        return None
    return value


def _check_password_strength(value: str) -> str:
    if not re.search(r"[A-Za-z]", value) or not re.search(r"\d", value):
        raise ValueError("Password must contain at least one letter and one number")
    return value


Email = Annotated[EmailStr, AfterValidator(lambda v: v.lower())]

FullName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=120)]

# 10-15 digits with an optional leading +, e.g. 9876543210 or +919876543210
Phone = Annotated[str, StringConstraints(strip_whitespace=True, pattern=r"^\+?[0-9]{10,15}$")]
OptionalPhone = Annotated[Phone | None, BeforeValidator(_blank_to_none)]

Password = Annotated[str, Field(min_length=8, max_length=128), AfterValidator(_check_password_strength)]

RegionName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=100)]
OptionalRegionName = Annotated[RegionName | None, BeforeValidator(_blank_to_none)]

OptionalAddress = Annotated[
    Annotated[str, StringConstraints(strip_whitespace=True, max_length=255)] | None,
    BeforeValidator(_blank_to_none),
]
OptionalLongText = Annotated[
    Annotated[str, StringConstraints(strip_whitespace=True, max_length=1000)] | None,
    BeforeValidator(_blank_to_none),
]
LocationText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=255)]

OptionalPersonName = Annotated[FullName | None, BeforeValidator(_blank_to_none)]
OptionalRelationship = Annotated[
    Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=50)] | None,
    BeforeValidator(_blank_to_none),
]

Latitude = Annotated[float, Field(ge=-90, le=90)]
Longitude = Annotated[float, Field(ge=-180, le=180)]
Age = Annotated[int, Field(ge=0, le=120)]
