"""Pytest configuration and async fixtures."""

import os
import uuid
import pytest
import pytest_asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.main import app
from app.core.config import settings
from app.db.base import Base
from app.db.session import get_db
from app.core.security import get_current_user, AuthenticatedUser

# Use in-memory SQLite for fast, isolated async testing
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_test_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with TestSessionLocal() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
def mock_user() -> AuthenticatedUser:
    return AuthenticatedUser(
        id=uuid.UUID("11111111-1111-1111-1111-111111111111"),
        auth_subject="test-user-1",
        email="user1@example.com",
    )


@pytest_asyncio.fixture
def mock_user_2() -> AuthenticatedUser:
    return AuthenticatedUser(
        id=uuid.UUID("22222222-2222-2222-2222-222222222222"),
        auth_subject="test-user-2",
        email="user2@example.com",
    )


@pytest_asyncio.fixture
async def client(db_session: AsyncSession, mock_user: AuthenticatedUser) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        yield db_session

    async def override_get_current_user():
        return mock_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
