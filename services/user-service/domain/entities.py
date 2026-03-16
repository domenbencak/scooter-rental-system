from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import UUID, uuid4


@dataclass(frozen=True)
class User:
    user_id: UUID
    email: str
    full_name: str
    phone: str
    status: str
    created_at: datetime

    @staticmethod
    def create(email: str, full_name: str, phone: str) -> "User":
        return User(
            user_id=uuid4(),
            email=email.strip().lower(),
            full_name=full_name.strip(),
            phone=phone.strip(),
            status="ACTIVE",
            created_at=datetime.now(timezone.utc),
        )
