import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError

from app.api.health import router as health_router
from app.api.router import api_router
from app.core.config import settings
from app.core.exceptions import AppError
from app.database.connection import DatabaseNotConfiguredError, check_database_connection

logging.basicConfig(level=logging.DEBUG if settings.DEBUG else logging.INFO)
logger = logging.getLogger("aapdasaathi")


@asynccontextmanager
async def lifespan(_: FastAPI):
    ok, error = check_database_connection()
    if ok:
        logger.info("Database connection OK")
    else:
        # Keep serving: /health still works and DB endpoints return 503 until the database is back.
        logger.error("Database unavailable at startup: %s", error)
    yield


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(_: Request, exc: AppError):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    @app.exception_handler(OperationalError)
    @app.exception_handler(DatabaseNotConfiguredError)
    async def database_unavailable_handler(_: Request, exc: Exception):
        logger.error("Database error: %s", str(exc).splitlines()[0])
        return JSONResponse(
            status_code=503,
            content={"detail": "Database is temporarily unavailable. Please try again shortly."},
        )


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="Disaster management and emergency assistance platform.",
        debug=settings.DEBUG,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_exception_handlers(app)
    app.include_router(health_router)
    app.include_router(api_router)
    return app


app = create_app()
