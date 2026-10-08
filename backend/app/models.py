"""SQLAlchemy models for the room booking domain.

Timestamps are stored as timezone-aware ``TIMESTAMPTZ`` values in UTC. Deleting
a room cascades to its bookings at the database level.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Room(Base):
    """A bookable room with a unique name, a seat count and equipment tags."""

    __tablename__ = "rooms"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    seats: Mapped[int] = mapped_column(nullable=False)
    amenities: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False, default=list)

    bookings: Mapped[list[Booking]] = relationship(
        back_populates="room",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class Booking(Base):
    """A single reservation of a room for a time window."""

    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(primary_key=True)
    room_id: Mapped[int] = mapped_column(
        ForeignKey("rooms.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    booked_by: Mapped[str] = mapped_column(String(255), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    room: Mapped[Room] = relationship(back_populates="bookings")
