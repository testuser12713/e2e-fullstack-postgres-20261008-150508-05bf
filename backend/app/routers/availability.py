"""Availability search route.

Returns the rooms that are free in ``[start, end)``, offer at least ``min_seats``
seats and carry every requested amenity tag. A room counts as busy as soon as an
existing booking overlaps the window; bookings that merely touch it (one ends
exactly when the next starts) do not count as an overlap.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_session
from app.errors import AppError
from app.models import Booking, Room
from app.schemas import RoomOut
from app.timeutils import parse_iso

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
    try:
        start_dt = parse_iso(start)
    except ValueError:
        raise AppError(
            "validation_error",
            fields={"start": "Beginn ist kein gültiger ISO-8601-Zeitpunkt."},
        ) from None
    try:
        end_dt = parse_iso(end)
    except ValueError:
        raise AppError(
            "validation_error",
            fields={"end": "Ende ist kein gültiger ISO-8601-Zeitpunkt."},
        ) from None

    if end_dt <= start_dt:
        raise AppError(
            "validation_error",
            "Das Ende muss nach dem Beginn liegen.",
            fields={"end": "Das Ende muss nach dem Beginn liegen."},
        )

    busy_room_ids = select(Booking.room_id).where(
        Booking.start < end_dt,
        Booking.end > start_dt,
    )

    statement = (
        select(Room)
        .where(Room.seats >= min_seats)
        .where(~Room.id.in_(busy_room_ids))
        .order_by(Room.id)
    )
    rooms = session.execute(statement).scalars().all()

    if amenities:
        requested = set(amenities)
        rooms = [room for room in rooms if requested.issubset(set(room.amenities or []))]

    return [RoomOut.model_validate(room) for room in rooms]
