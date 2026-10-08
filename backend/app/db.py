"""Database wiring: engine, session factory and the FastAPI session dependency.

The address is read lazily from ``DATABASE_URL`` — never at import time — so the
process can start, log and report a missing configuration instead of dying with a
bare traceback. There is deliberately no fallback: this product runs on
PostgreSQL only.
"""

from __future__ import annotations

import os
from collections.abc import Iterator

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


class Base(DeclarativeBase):
    """Declarative base shared by every ORM model."""


_engine: Engine | None = None
_session_factory: sessionmaker[Session] | None = None


def get_database_url() -> str:
    """Return the configured PostgreSQL URL or fail naming the variable."""
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError(
            "DATABASE_URL ist nicht gesetzt. Siehe RUN.json (Eintrag 'api'), "
            "wo die Variable aus dem 'db'-Dienst befüllt wird."
        )
    return _with_psycopg3_driver(url)


def _with_psycopg3_driver(url: str) -> str:
    """Make a plain ``postgresql://`` URL resolve to the installed psycopg 3 driver.

    SQLAlchemy otherwise defaults ``postgresql://`` to psycopg2, which this
    project does not depend on.
    """
    if url.startswith("postgresql+"):
        return url
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url[len("postgresql://") :]
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url[len("postgres://") :]
    return url


def get_engine() -> Engine:
    """Return the process-wide engine, creating it on first use."""
    global _engine
    if _engine is None:
        _engine = create_engine(get_database_url(), pool_pre_ping=True, future=True)
    return _engine


def get_session_factory() -> sessionmaker[Session]:
    """Return the process-wide session factory, creating it on first use."""
    global _session_factory
    if _session_factory is None:
        _session_factory = sessionmaker(
            bind=get_engine(),
            autoflush=False,
            autocommit=False,
            expire_on_commit=False,
        )
    return _session_factory


def get_session() -> Iterator[Session]:
    """FastAPI dependency yielding a session and closing it afterwards."""
    session = get_session_factory()()
    try:
        yield session
    finally:
        session.close()


def init_db() -> None:
    """Create every table declared by the models.

    Called once on startup so a freshly started server works immediately,
    without a manual migration step.
    """
    from app import models  # noqa: F401  (registers the mappers with Base.metadata)

    Base.metadata.create_all(bind=get_engine())


def reset_state() -> None:
    """Drop cached engine/factory. Test helper when the URL changes at runtime."""
    global _engine, _session_factory
    if _engine is not None:
        _engine.dispose()
    _engine = None
    _session_factory = None
