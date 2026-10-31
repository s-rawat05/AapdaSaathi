from fastapi import APIRouter, status

from app.api.deps import DbSession, ResidentUser
from app.schemas.response import ResponseCreate, ResponseRead, ResponseUpdate
from app.services import response_service

router = APIRouter(prefix="/responses", tags=["Responses"])


@router.post(
    "",
    response_model=ResponseRead,
    status_code=status.HTTP_201_CREATED,
    responses={
        404: {"description": "Alert not found or not relevant to this resident"},
        409: {"description": "Already responded (use PUT) or alert no longer active"},
    },
)
def create_response(data: ResponseCreate, user: ResidentUser, db: DbSession):
    """Record SAFE or NEEDS_HELP for an active alert. NEEDS_HELP notifies all administrators."""
    return response_service.create_response(db, user, data.alert_id, data.status)


@router.get("/my", response_model=list[ResponseRead])
def read_my_responses(user: ResidentUser, db: DbSession):
    return response_service.list_my_responses(db, user)


@router.put(
    "/{response_id}",
    response_model=ResponseRead,
    responses={404: {"description": "Response not found"}, 409: {"description": "Alert no longer active"}},
)
def update_response(response_id: int, data: ResponseUpdate, user: ResidentUser, db: DbSession):
    """Change your own response. The timestamp is refreshed on every update."""
    return response_service.update_response(db, user, response_id, data.status)
