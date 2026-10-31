from pydantic import BaseModel


class RootResponse(BaseModel):
    message: str
    status: str


class HealthResponse(BaseModel):
    status: str


class DatabaseHealthResponse(BaseModel):
    status: str
    database: str
