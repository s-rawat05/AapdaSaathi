from datetime import UTC, datetime, timedelta

import jwt
from pwdlib import PasswordHash

from app.core.config import settings
from app.models.enums import UserRole

# Argon2id with pwdlib's recommended parameters
password_hasher = PasswordHash.recommended()

# Verified against when the email is unknown, so login takes the same time
# whether or not the account exists (prevents user enumeration by timing).
_DUMMY_HASH = password_hasher.hash("timing-equaliser-not-a-real-password")


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> tuple[bool, str | None]:
    """Returns (is_valid, new_hash). new_hash is set when the stored hash uses outdated parameters."""
    return password_hasher.verify_and_update(password, password_hash)


def burn_verification_time(password: str) -> None:
    password_hasher.verify(password, _DUMMY_HASH)


def create_access_token(user_id: int, role: UserRole) -> tuple[str, int]:
    """Returns (token, expires_in_seconds)."""
    expires_in = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "role": role.value,
        "type": "access",
        "iat": now,
        "exp": now + timedelta(seconds=expires_in),
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return token, expires_in


def decode_access_token(token: str) -> dict:
    """Raises jwt.ExpiredSignatureError or jwt.InvalidTokenError on failure."""
    payload = jwt.decode(
        token,
        settings.SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
        options={"require": ["sub", "exp", "iat", "type"]},
    )
    if payload.get("type") != "access":
        raise jwt.InvalidTokenError("Not an access token")
    return payload
