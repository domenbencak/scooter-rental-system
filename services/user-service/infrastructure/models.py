from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, String, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column

from infrastructure.db import Base


class UserModel(Base):
    __tablename__ = "users"

    user_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, server_default=text("'ACTIVE'"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
