from abc import ABC, abstractmethod
from uuid import UUID

from domain.entities import User


class UserRepositoryPort(ABC):
    @abstractmethod
    def create(self, user: User) -> User:
        raise NotImplementedError

    @abstractmethod
    def get_by_id(self, user_id: UUID) -> User | None:
        raise NotImplementedError

    @abstractmethod
    def get_by_email(self, email: str) -> User | None:
        raise NotImplementedError
