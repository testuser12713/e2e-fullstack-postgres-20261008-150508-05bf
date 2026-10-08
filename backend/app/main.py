"""Application entry point.

This is the single place where the app is assembled: every router is mounted and
the unified exception handlers are registered here. Later slices fill their own
router modules and must not need to touch this file.

On startup the configuration is validated once and the database schema is
created, so a freshly started server serves immediately against PostgreSQL.
"""

from __future__ import annotations

import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import db
from app.errors import register_exception_handlers
from app.routers import availability, bookings, rooms


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Validate configuration and prepare the schema before serving."""
    db.get_database_url()
    db.init_db()
    yield


app = FastAPI(title="Raumbuchung API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)


@app.get("/api/health", tags=["health"])
def health() -> dict[str, str]:
    """Liveness probe: the API is up and configured."""
    return {"status": "ok"}


app.include_router(rooms.router)
app.include_router(bookings.router)
app.include_router(availability.router)
