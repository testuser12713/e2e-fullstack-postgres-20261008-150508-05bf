"""Availability search route.

The contract is declared here so it appears in the OpenAPI document. The search
is implemented by its own slice; until then the route answers 501 in the unified
error body.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db import get_session
from app.errors import AppError
from app.schemas import RoomOut

router = APIRouter(prefix="/api/availability", tags=["availability"])


@router.get("", response_model=list[RoomOut])
def search_availability(
    start: str = Query(...),
    end: str = Query(...),
    min_seats: int = Query(...),
    amenities: list[str] = Query(default=[]),
    session: Session = Depends(get_session),
) -> list[RoomOut]:
    """Return rooms free in [start, end) with enough seats and all amenities."""
    raise AppError(
        "not_implemented", "Die Verfügbarkeitssuche wird von einem anderen Ticket implementiert."
    )
