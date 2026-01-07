# tests/conftest.py
import os
import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine

from app.main import app
from app.database import get_session
from app.services.rate_limiter import rate_limiter

TEST_DB_URL = "sqlite:///./test.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})


def override_get_session():
    with Session(engine) as session:
        yield session


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    # fresh db file each run
    if os.path.exists("test.db"):
        os.remove("test.db")
    SQLModel.metadata.create_all(engine)
    yield
    if os.path.exists("test.db"):
        os.remove("test.db")


@pytest.fixture()
def client():
    # Clear rate limiter before each test
    rate_limiter._requests.clear()
    app.dependency_overrides[get_session] = override_get_session
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
