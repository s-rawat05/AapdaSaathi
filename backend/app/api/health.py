from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.database.connection import check_database_connection
from app.schemas.common import DatabaseHealthResponse, HealthResponse, RootResponse

router = APIRouter(tags=["System"])


@router.get("/", response_model=RootResponse)
def root() -> RootResponse:
    return RootResponse(message="Welcome to AapdaSaathi API", status="running")


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="healthy")


@router.get(
    "/health/db",
    response_model=DatabaseHealthResponse,
    responses={503: {"model": DatabaseHealthResponse, "description": "Database unreachable"}},
)
def database_health():
    ok, _ = check_database_connection()
    if not ok:
        return JSONResponse(status_code=503, content={"status": "unhealthy", "database": "unreachable"})
    return DatabaseHealthResponse(status="healthy", database="connected")
