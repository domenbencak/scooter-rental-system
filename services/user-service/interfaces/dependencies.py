from fastapi import Depends
from sqlalchemy.orm import Session

from application.use_cases import GetUserUseCase, RegisterUserUseCase
from infrastructure.db import get_session
from infrastructure.repository import SqlAlchemyUserRepository


def get_user_repository(session: Session = Depends(get_session)) -> SqlAlchemyUserRepository:
    return SqlAlchemyUserRepository(session)


def get_register_user_use_case(repository: SqlAlchemyUserRepository = Depends(get_user_repository)) -> RegisterUserUseCase:
    return RegisterUserUseCase(repository)


def get_get_user_use_case(repository: SqlAlchemyUserRepository = Depends(get_user_repository)) -> GetUserUseCase:
    return GetUserUseCase(repository)
