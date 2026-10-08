"""Shared pytest fixtures.

The suite runs against a real PostgreSQL database (AC-23): there is no SQLite or
in-memory fallback. The address comes from ``TEST_DATABASE_URL`` or, when that is
unset, from ``DATABASE_URL`` (both declared in RUN.json). The schema is created
once per session and every test starts from a clean state.
"""

from __future__ import annotations

import os
from collections.abc import Iterator

import pytest
from sqlalchemy import text

_test_url = os.environ.get("TEST_DATABASE_URL") or os.environ.get("DATABASE_URL")
if not _test_url:
    raise RuntimeError(
        "AC-23 verlangt eine echte PostgreSQL-Testdatenbank: TEST_DATABASE_URL oder "
        "DATABASE_URL muss gesetzt sein (siehe RUN.json). Es gibt keinen SQLite- oder "
        "In-Memory-Fallback."
    )

os.environ["DATABASE_URL"] = _test_url
os.environ.setdefault("TEST_DATABASE_URL", _test_url)

from fastapi.testclient import TestClient  # noqa: E402

from app import models  # noqa: E402,F401  (registers the mappers)
from app.db import Base, get_engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _create_schema() -> Iterator[None]:
    """Create every table once for the session and drop them afterwards."""
    engine = get_engine()
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def _isolate() -> Iterator[None]:
    """Reset only this ticket's tables before each test."""
    engine = get_engine()
    with engine.begin() as connection:
        connection.execute(text("TRUNCATE TABLE bookings, rooms RESTART IDENTITY CASCADE"))
    yield


@pytest.fixture()
def client() -> Iterator[TestClient]:
    """A TestClient that runs the app's lifespan (configuration + schema)."""
    with TestClient(app) as test_client:
        yield test_client
