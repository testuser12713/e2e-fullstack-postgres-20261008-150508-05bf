"""Booking routes.

The full booking contract is declared here so it appears in the OpenAPI
document. The booking rules and persistence are implemented by their own
slices; until then every route answers 501 in the unified error body.
"""

from __future__ import annotations

from datetime import date as date_type

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db import get_session
from app.errors import AppError
from app.schemas import BookingCreate, BookingOut

router = APIRouter(prefix="/api/bookings", tags=["bookings"])


@router.get("", response_model=list[BookingOut])
def list_bookings(
    room_id: int | None = Query(default=None),
    date: date_type | None = Query(default=None),
    utc_offset_minutes: int | None = Query(default=None),
    session: Session = Depends(get_session),
) -> list[BookingOut]:
    """List bookings, optionally filtered to one room's local calendar day."""
    raise AppError(
        "not_implemented", "Die Buchungsliste wird von einem anderen Ticket implementiert."
    )


@router.post("", response_model=BookingOut, status_code=201)
def create_booking(payload: BookingCreate, session: Session = Depends(get_session)) -> BookingOut:
    """Create a booking."""
    raise AppError(
        "not_implemented", "Das Anlegen von Buchungen wird von einem anderen Ticket implementiert."
    )


@router.get("/{booking_id}", response_model=BookingOut)
def get_booking(booking_id: int, session: Session = Depends(get_session)) -> BookingOut:
    """Return a single booking."""
    raise AppError(
        "not_implemented", "Das Abrufen einer Buchung wird von einem anderen Ticket implementiert."
    )


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
