"""Room routes.

This module declares the full room contract so it appears in the OpenAPI
document. Room CRUD itself is implemented by its own slice; until then every
route answers 501 in the unified error body.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_session
from app.errors import AppError
from app.schemas import RoomCreate, RoomOut

router = APIRouter(prefix="/api/rooms", tags=["rooms"])


@router.get("", response_model=list[RoomOut])
def list_rooms(session: Session = Depends(get_session)) -> list[RoomOut]:
    """Return every room."""
    raise AppError("not_implemented", "Die Raumliste wird von einem anderen Ticket implementiert.")


@router.post("", response_model=RoomOut, status_code=201)
def create_room(payload: RoomCreate, session: Session = Depends(get_session)) -> RoomOut:
    """Create a room."""
    raise AppError(
        "not_implemented", "Das Anlegen von Räumen wird von einem anderen Ticket implementiert."
    )


@router.get("/{room_id}", response_model=RoomOut)
def get_room(room_id: int, session: Session = Depends(get_session)) -> RoomOut:
    """Return a single room."""
    raise AppError(
        "not_implemented", "Das Abrufen eines Raums wird von einem anderen Ticket implementiert."
    )


@router.put("/{room_id}", response_model=RoomOut)
def update_room(
    room_id: int, payload: RoomCreate, session: Session = Depends(get_session)
) -> RoomOut:
    """Update a room."""
    raise AppError(
        "not_implemented", "Das Ändern eines Raums wird von einem anderen Ticket implementiert."
    )


@router.delete("/{room_id}", status_code=204)
def delete_room(room_id: int, session: Session = Depends(get_session)) -> None:
    """Delete a room and, by cascade, its bookings."""
    raise AppError(
        "not_implemented", "Das Löschen eines Raums wird von einem anderen Ticket implementiert."
    )
