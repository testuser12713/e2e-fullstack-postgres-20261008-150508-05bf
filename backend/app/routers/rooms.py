"""Room routes: create, list, read, update and delete rooms.

A room has a unique name. Creating or renaming a room onto a name that already
exists is rejected with ``409 room_name_taken`` and leaves no room behind.
Deleting a room deletes its bookings with it — the cascade is declared on the
``Room.bookings`` relationship and the ``bookings.room_id`` foreign key.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_session
from app.errors import AppError
from app.models import Room
from app.schemas import RoomCreate, RoomOut

router = APIRouter(prefix="/api/rooms", tags=["rooms"])


def _get_room_or_404(session: Session, room_id: int) -> Room:
    """Return the room or raise the unified 404 for an unknown id."""
    room = session.get(Room, room_id)
    if room is None:
        raise AppError("not_found", "Der Raum wurde nicht gefunden.")
    return room


def _ensure_name_available(session: Session, name: str, exclude_id: int | None = None) -> None:
    """Reject a name that another room already uses with ``room_name_taken``."""
    statement = select(Room.id).where(Room.name == name)
    if exclude_id is not None:
        statement = statement.where(Room.id != exclude_id)
    if session.execute(statement).first() is not None:
        raise AppError(
            "room_name_taken",
            "Ein Raum mit diesem Namen existiert bereits.",
            fields={"name": "Dieser Raumname ist bereits vergeben."},
        )


@router.get("", response_model=list[RoomOut])
def list_rooms(session: Session = Depends(get_session)) -> list[Room]:
    """Return every room ordered by id."""
    return list(session.execute(select(Room).order_by(Room.id)).scalars().all())


@router.post("", response_model=RoomOut, status_code=201)
def create_room(payload: RoomCreate, session: Session = Depends(get_session)) -> Room:
    """Create a room; a duplicate name is rejected with 409 and not created."""
    _ensure_name_available(session, payload.name)
    room = Room(name=payload.name, seats=payload.seats, amenities=list(payload.amenities))
    session.add(room)
    session.commit()
    session.refresh(room)
    return room


@router.get("/{room_id}", response_model=RoomOut)
def get_room(room_id: int, session: Session = Depends(get_session)) -> Room:
    """Return a single room or 404 for an unknown id."""
    return _get_room_or_404(session, room_id)


@router.put("/{room_id}", response_model=RoomOut)
def update_room(room_id: int, payload: RoomCreate, session: Session = Depends(get_session)) -> Room:
    """Update a room; unknown id is 404, a duplicate name is 409."""
    room = _get_room_or_404(session, room_id)
    _ensure_name_available(session, payload.name, exclude_id=room_id)
    room.name = payload.name
    room.seats = payload.seats
    room.amenities = list(payload.amenities)
    session.commit()
    session.refresh(room)
    return room


@router.delete("/{room_id}", status_code=204)
def delete_room(room_id: int, session: Session = Depends(get_session)) -> None:
    """Delete a room and, by cascade, its bookings; unknown id is 404."""
    room = _get_room_or_404(session, room_id)
    session.delete(room)
    session.commit()
