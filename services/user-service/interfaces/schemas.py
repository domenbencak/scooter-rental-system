from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ErrorResponse(BaseModel):
    error: str
    message: str
    traceId: str | None = None


class RegisterUserRequest(BaseModel):
    email: EmailStr
    fullName: str = Field(min_length=2, max_length=255)
    phone: str = Field(min_length=6, max_length=32)


class RegisterUserResponse(BaseModel):
    userId: UUID
    email: EmailStr
    fullName: str
    createdAt: datetime


class GetUserResponse(BaseModel):
    userId: UUID
    email: EmailStr
    fullName: str
    status: str


class UserView(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: UUID
    email: str
    full_name: str
    phone: str
    status: str
    created_at: datetime
