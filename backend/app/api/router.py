from fastapi import APIRouter

from app.api import admin, auth, residents, users, volunteers

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(residents.router)
api_router.include_router(volunteers.router)
api_router.include_router(admin.router)
