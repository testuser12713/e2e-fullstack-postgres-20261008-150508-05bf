"""Reusable booking rules shared by the create, update and availability slices.

The checkers here are deliberately free of HTTP concerns: they raise
:class:`AppError` with the stable code and field hints the contract fixes, so any
router that persists a booking runs the exact same rules.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.errors import AppError
from app.models import Booking

#: A single booking may span at most this long; exactly this is accepted.
MAX_BOOKING_DURATION = timedelta(hours=8)

_END_MESSAGE = "Das Ende muss nach dem Beginn liegen."
_DURATION_MESSAGE = "Die Buchung darf höchstens 8 Stunden dauern."
_STARTED_MESSAGE = "Die Buchung hat bereits begonnen und kann nicht mehr geändert werden."


def validate_booking_window(start: datetime, end: datetime) -> None:
    """Reject a window whose end is not strictly after its start or too long.

    Both violations are reported as ``validation_error`` (HTTP 422) with a hint
    on the ``end`` field, matching AC-06 and AC-07.
    """
    if end <= start:
        raise AppError("validation_error", _END_MESSAGE, fields={"end": _END_MESSAGE})
    if end - start > MAX_BOOKING_DURATION:
        raise AppError("validation_error", _DURATION_MESSAGE, fields={"end": _DURATION_MESSAGE})


def ensure_booking_not_started(booking_start: datetime, now: datetime | None = None) -> None:
    """Reject a change to a booking whose start has been reached or passed.

    A booking is locked the moment its start time arrives, so both the update and
    the delete slices call this before touching persisted state (AC-09). The
    violation is reported as ``booking_already_started`` (HTTP 409) with a hint on
    the ``start`` field.
    """
    moment = now if now is not None else datetime.now(UTC)
    if booking_start <= moment:
        raise AppError(
            "booking_already_started",
            _STARTED_MESSAGE,
            fields={"start": _STARTED_MESSAGE},
        )


def find_booking_overlap(
    session: Session,
    room_id: int,
    start: datetime,
    end: datetime,
    exclude_id: int | None = None,
) -> Booking | None:
    """Return the first booking of ``room_id`` overlapping ``[start, end)``.

    Directly adjacent windows (one booking's end equals the other's start) do not
    overlap. ``exclude_id`` lets the update slice ignore the booking it edits.
    """
    statement = select(Booking).where(
        Booking.room_id == room_id,
        Booking.start < end,
        Booking.end > start,
    )
    if exclude_id is not None:
        statement = statement.where(Booking.id != exclude_id)
    statement = statement.order_by(Booking.start)
    return session.scalars(statement).first()
