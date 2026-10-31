from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError
from app.core.security import burn_verification_time, hash_password, verify_password
from app.models import ResidentProfile, User, UserRole, VolunteerProfile
from app.schemas.auth import PublicRole, RegisterRequest

EMAIL_TAKEN = "An account with this email already exists"


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(func.lower(User.email) == email.lower()))


def _new_user(*, full_name: str, email: str, phone: str, password: str, role: UserRole) -> User:
    return User(
        full_name=full_name,
        email=email.lower(),
        phone=phone,
        password_hash=hash_password(password),
        role=role,
        is_active=True,
    )


def _commit_new_user(db: Session, user: User) -> User:
    """Commit, translating a unique-email race into a ConflictError."""
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ConflictError(EMAIL_TAKEN) from exc
    db.refresh(user)
    return user


def register_user(db: Session, data: RegisterRequest) -> User:
    """Create a RESIDENT or VOLUNTEER account and its profile in a single transaction."""
    if get_user_by_email(db, data.email):
        raise ConflictError(EMAIL_TAKEN)

    role = UserRole(data.role.value)
    user = _new_user(
        full_name=data.full_name, email=data.email, phone=data.phone, password=data.password, role=role
    )

    if data.role is PublicRole.RESIDENT:
        user.resident_profile = ResidentProfile(**data.resident_profile.model_dump())
    else:
        profile = data.volunteer_profile.model_dump()
        profile["phone"] = profile["phone"] or data.phone
        user.volunteer_profile = VolunteerProfile(**profile)

    db.add(user)
    return _commit_new_user(db, user)


def create_admin(db: Session, *, full_name: str, email: str, phone: str, password: str) -> User:
    """Only callable from admin-protected endpoints and the seed script."""
    if get_user_by_email(db, email):
        raise ConflictError(EMAIL_TAKEN)
    user = _new_user(full_name=full_name, email=email, phone=phone, password=password, role=UserRole.ADMIN)
    db.add(user)
    return _commit_new_user(db, user)


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    """Return the user if the credentials are valid, else None. Does not check is_active."""
    user = get_user_by_email(db, email)
    if user is None:
        burn_verification_time(password)
        return None

    is_valid, new_hash = verify_password(password, user.password_hash)
    if not is_valid:
        return None
    if new_hash:
        # Transparently upgrade hashes created with older Argon2 parameters
        user.password_hash = new_hash
        db.commit()
    return user


def list_users(db: Session, *, role: UserRole | None, skip: int, limit: int) -> list[User]:
    query = select(User).order_by(User.id).offset(skip).limit(limit)
    if role is not None:
        query = query.where(User.role == role)
    return list(db.scalars(query))
