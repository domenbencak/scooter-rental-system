import logging
from uuid import UUID

from application.ports import UserRepositoryPort
from domain.entities import User
from domain.exceptions import UserConflictError, UserNotFoundError

logger = logging.getLogger("user-service.use-cases")


class RegisterUserUseCase:
    def __init__(self, repository: UserRepositoryPort):
        self.repository = repository

    def execute(self, email: str, full_name: str, phone: str) -> User:
        existing = self.repository.get_by_email(email.strip().lower())
        if existing is not None:
            logger.info(
                "user_conflict_existing_email email=%s",
                email,
                extra={"trace_id": "-"},
            )
            raise UserConflictError("User with this email already exists")

        user = User.create(email=email, full_name=full_name, phone=phone)
        saved = self.repository.create(user)
        logger.info(
            "user_created userId=%s email=%s",
            saved.user_id,
            saved.email,
            extra={"trace_id": "-"},
        )
        return saved


class GetUserUseCase:
    def __init__(self, repository: UserRepositoryPort):
        self.repository = repository

    def execute(self, user_id: UUID) -> User:
        user = self.repository.get_by_id(user_id)
        if user is None:
            logger.info("user_not_found userId=%s", user_id, extra={"trace_id": "-"})
            raise UserNotFoundError("User not found")

        logger.info("user_fetched userId=%s", user.user_id, extra={"trace_id": "-"})
        return user
