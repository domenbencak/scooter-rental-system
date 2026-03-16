from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from application.ports import UserRepositoryPort
from domain.entities import User
from domain.exceptions import UserConflictError
from infrastructure.models import UserModel


class SqlAlchemyUserRepository(UserRepositoryPort):
    def __init__(self, session: Session):
        self.session = session

    def create(self, user: User) -> User:
        model = UserModel(
            user_id=user.user_id,
            email=user.email,
            full_name=user.full_name,
            phone=user.phone,
            status=user.status,
            created_at=user.created_at,
        )
        self.session.add(model)
        try:
            self.session.commit()
        except IntegrityError as exc:
            self.session.rollback()
            raise UserConflictError("User with this email already exists") from exc
        self.session.refresh(model)
        return self._to_domain(model)

    def get_by_id(self, user_id: UUID) -> User | None:
        model = self.session.get(UserModel, user_id)
        return self._to_domain(model) if model else None

    def get_by_email(self, email: str) -> User | None:
        stmt = select(UserModel).where(UserModel.email == email)
        model = self.session.execute(stmt).scalar_one_or_none()
        return self._to_domain(model) if model else None

    @staticmethod
    def _to_domain(model: UserModel) -> User:
        return User(
            user_id=model.user_id,
            email=model.email,
            full_name=model.full_name,
            phone=model.phone,
            status=model.status,
            created_at=model.created_at,
        )
