from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import PermissionDeniedError
from app.models import Response, ResponseStatus, User, UserRole


def upsert_response(db: Session, *, alert_id: int, resident: User, status: ResponseStatus) -> Response:
    """Record a resident's response to an alert, updating it if one already exists.

    The (alert_id, resident_id) unique constraint guarantees at most one row; if two
    requests race to insert, the loser retries as an update.
    """
    if resident.role is not UserRole.RESIDENT:
        raise PermissionDeniedError("Only residents can respond to alerts")

    def _existing() -> Response | None:
        return db.scalar(
            select(Response).where(Response.alert_id == alert_id, Response.resident_id == resident.id)
        )

    response = _existing()
    if response is None:
        response = Response(alert_id=alert_id, resident_id=resident.id, status=status)
        db.add(response)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            response = _existing()
            if response is None:
                raise
            response.status = status
            db.commit()
    else:
        response.status = status
        db.commit()

    db.refresh(response)
    return response
