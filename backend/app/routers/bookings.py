"""Booking routes: create, list and fetch.

Creation enforces the shared booking rules (window, maximum duration and
overlap) through :mod:`app.services.booking_rules`. Update and delete belong to
their own slice and still answer 501 in the unified error body.
"""

from __future__ import annotations

from datetime import date as date_type
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_session
from app.errors import AppError
from app.models import Booking, Room
from app.schemas import BookingCreate, BookingOut
from app.services.booking_rules import find_booking_overlap, validate_booking_window
from app.timeutils import parse_iso, utc_day_bounds

router = APIRouter(prefix="/api/bookings", tags=["bookings"])


def _parse_time(value: str, field: str) -> datetime:
    """Parse an ISO-8601 string or raise a field-scoped validation error."""
    try:
        return parse_iso(value)
    except ValueError as exc:
        message = "Zeitangabe muss ein gültiges ISO-8601-Datum mit Offset sein."
        raise AppError("validation_error", message, fields={field: message}) from exc


def _overlap_message(booking: Booking) -> str:
    """Readable conflict hint naming the colliding booking's id, title and range."""
    return (
        f"Überschneidung mit Buchung #{booking.id} „{booking.title}“ "
        f"({booking.start.isoformat()} - {booking.end.isoformat()})."
    )


@router.get("", response_model=list[BookingOut])
def list_bookings(
    room_id: int | None = Query(default=None),
    date: date_type | None = Query(default=None),
    utc_offset_minutes: int | None = Query(default=None),
    session: Session = Depends(get_session),
) -> list[BookingOut]:
    """List bookings, optionally filtered to one room's local calendar day."""
    statement = select(Booking)
    if room_id is not None:
        statement = statement.where(Booking.room_id == room_id)
    if date is not None and utc_offset_minutes is not None:
        day_start, day_end = utc_day_bounds(date, utc_offset_minutes)
        statement = statement.where(Booking.start < day_end, Booking.end > day_start)
    statement = statement.order_by(Booking.start, Booking.id)
    return list(session.scalars(statement))


@router.post("", response_model=BookingOut, status_code=201)
def create_booking(payload: BookingCreate, session: Session = Depends(get_session)) -> BookingOut:
    """Create a booking after checking its window and room conflicts."""
    start = _parse_time(payload.start, "start")
    end = _parse_time(payload.end, "end")
    validate_booking_window(start, end)

    room = session.get(Room, payload.room_id)
    if room is None:
        message = "Der angegebene Raum existiert nicht."
        raise AppError("validation_error", message, fields={"room_id": message})

    overlap = find_booking_overlap(session, payload.room_id, start, end)
    if overlap is not None:
        message = _overlap_message(overlap)
        raise AppError("booking_overlap", fields={"start": message})

    booking = Booking(
        room_id=payload.room_id,
        booked_by=payload.booked_by,
        title=payload.title,
        start=start,
        end=end,
    )
    session.add(booking)
    session.commit()
    session.refresh(booking)
    return booking


@router.get("/{booking_id}", response_model=BookingOut)
def get_booking(booking_id: int, session: Session = Depends(get_session)) -> BookingOut:
    """Return a single booking."""
    booking = session.get(Booking, booking_id)
    if booking is None:
        raise AppError("not_found", "Die Buchung wurde nicht gefunden.")
    return booking


@router.put("/{booking_id}", response_model=BookingOut)
def update_booking(
    booking_id: int, payload: BookingCreate, session: Session = Depends(get_session)
) -> BookingOut:
    """Update a booking."""
    raise AppError(
        "not_implemented", "Das Ändern einer Buchung wird von einem anderen Ticket implementiert."
    )


@router.delete("/{booking_id}", status_code=204)
def delete_booking(booking_id: int, session: Session = Depends(get_session)) -> None:
    """Delete a booking."""
    raise AppError(
        "not_implemented", "Das Löschen einer Buchung wird von einem anderen Ticket implementiert."
    )
