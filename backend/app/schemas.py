"""Pydantic models shared by the API contract.

``RoomCreate``/``RoomOut`` and ``BookingCreate``/``BookingOut`` are the request
and response shapes the whole product agrees on. The ``*Out`` models can be built
straight from ORM objects (``from_attributes``).
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class RoomCreate(BaseModel):
    """Payload to create or update a room."""

    name: str
    seats: int
    amenities: list[str] = []


class RoomOut(BaseModel):
    """A room as returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    seats: int
    amenities: list[str] = []


class BookingCreate(BaseModel):
    """Payload to create or update a booking.

    ``start`` and ``end`` are ISO-8601 strings carrying a UTC offset; the booking
    slices parse and validate them.
    """

    room_id: int
    booked_by: str
    title: str
    start: str
    end: str


class BookingOut(BaseModel):
    """A booking as returned by the API. Times are ISO-8601 with offset (UTC)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    room_id: int
    booked_by: str
    title: str
    start: datetime
    end: datetime


class ErrorDetail(BaseModel):
    """The inner object of every error response."""

    code: str
    message: str
    fields: dict[str, str] = {}


class ErrorResponse(BaseModel):
    """The one and only error body shape."""

    error: ErrorDetail
