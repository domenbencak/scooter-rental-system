from uuid import uuid4

import pytest

from domain.entities import User
from domain.exceptions import UserConflictError
from infrastructure.repository import SqlAlchemyUserRepository


def test_create_user(db_session):
    repo = SqlAlchemyUserRepository(db_session)
    user = User.create(email="test@example.com", full_name="Test User", phone="+38640111222")

    saved = repo.create(user)

    assert saved.user_id is not None
    assert saved.email == "test@example.com"
    assert saved.status == "ACTIVE"


def test_get_user_by_id(db_session):
    repo = SqlAlchemyUserRepository(db_session)
    user = repo.create(User.create(email="find@example.com", full_name="Find User", phone="+38640111333"))

    fetched = repo.get_by_id(user.user_id)

    assert fetched is not None
    assert fetched.user_id == user.user_id


def test_duplicate_email_conflict(db_session):
    repo = SqlAlchemyUserRepository(db_session)
    repo.create(User.create(email="dup@example.com", full_name="First", phone="+38640111444"))

    with pytest.raises(UserConflictError):
        repo.create(User.create(email="dup@example.com", full_name="Second", phone="+38640111555"))
