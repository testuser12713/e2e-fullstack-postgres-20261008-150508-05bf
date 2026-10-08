"""Tests for the free-room availability search (AC-11).

The room and booking routes are owned by other slices, so the tests seed their
own rows directly through the ORM session instead of calling those endpoints.
Every test provisions exactly the rooms and bookings it needs.
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.db import get_session_factory
from app.models import Booking, Room
from app.timeutils import parse_iso

START = "2026-03-01T09:00:00+00:00"
END = "2026-03-01T10:00:00+00:00"


def _seed_room(name: str, seats: int, amenities: list[str]) -> int:
    """Insert a room and return its id."""
    with get_session_factory()() as session:
        room = Room(name=name, seats=seats, amenities=amenities)
        session.add(room)
        session.commit()
        return room.id


def _seed_booking(room_id: int, start: str, end: str) -> int:
    """Insert a booking for a room and return its id."""
    with get_session_factory()() as session:
        booking = Booking(
            room_id=room_id,
            booked_by="Test",
            title="Belegung",
            start=parse_iso(start),
            end=parse_iso(end),
        )
        session.add(booking)
        session.commit()
        return booking.id


def _search(
    client: TestClient,
    start: str,
    end: str,
    min_seats: int = 1,
    amenities: list[str] | None = None,
) -> list[dict]:
    params: list[tuple[str, str]] = [
        ("start", start),
        ("end", end),
        ("min_seats", str(min_seats)),
    ]
    for amenity in amenities or []:
        params.append(("amenities", amenity))
    response = client.get("/api/availability", params=params)
    assert response.status_code == 200, response.text
    return response.json()


def test_filters_by_minimum_seats(client: TestClient) -> None:
    _seed_room("Klein", 4, [])
    _seed_room("Gross", 10, [])

    names = {room["name"] for room in _search(client, START, END, min_seats=6)}
    assert names == {"Gross"}


def test_filters_by_a_single_amenity(client: TestClient) -> None:
    _seed_room("Mit Beamer", 6, ["Beamer", "Whiteboard"])
    _seed_room("Ohne Beamer", 6, ["Whiteboard"])

    names = {room["name"] for room in _search(client, START, END, amenities=["Beamer"])}
    assert names == {"Mit Beamer"}


def test_requires_every_requested_amenity(client: TestClient) -> None:
    _seed_room("Komplett", 6, ["Beamer", "Whiteboard"])
    _seed_room("Nur eins", 6, ["Beamer"])

    names = {
        room["name"] for room in _search(client, START, END, amenities=["Beamer", "Whiteboard"])
    }
    assert names == {"Komplett"}


def test_room_with_overlapping_booking_drops_out(client: TestClient) -> None:
    busy = _seed_room("Belegt", 6, [])
    _seed_room("Frei", 6, [])
    _seed_booking(busy, "2026-03-01T10:00:00+00:00", "2026-03-01T11:00:00+00:00")

    names = {
        room["name"]
        for room in _search(client, "2026-03-01T10:30:00+00:00", "2026-03-01T11:30:00+00:00")
    }
    assert names == {"Frei"}


def test_booking_ending_when_search_starts_is_not_an_overlap(client: TestClient) -> None:
    room_id = _seed_room("Angrenzend", 6, [])
    _seed_booking(room_id, "2026-03-01T10:00:00+00:00", "2026-03-01T11:00:00+00:00")

    names = {
        room["name"]
        for room in _search(client, "2026-03-01T11:00:00+00:00", "2026-03-01T12:00:00+00:00")
    }
    assert names == {"Angrenzend"}


def test_booking_starting_when_search_ends_is_not_an_overlap(client: TestClient) -> None:
    room_id = _seed_room("Angrenzend", 6, [])
    _seed_booking(room_id, "2026-03-01T12:00:00+00:00", "2026-03-01T13:00:00+00:00")

    names = {
        room["name"]
        for room in _search(client, "2026-03-01T11:00:00+00:00", "2026-03-01T12:00:00+00:00")
    }
    assert names == {"Angrenzend"}


def test_no_match_returns_empty_list(client: TestClient) -> None:
    _seed_room("Zu klein", 2, [])

    assert _search(client, START, END, min_seats=8) == []


def test_end_not_after_start_is_validation_error(client: TestClient) -> None:
    response = client.get(
        "/api/availability",
        params={"start": START, "end": START, "min_seats": "1"},
    )

    assert response.status_code == 422
    body = response.json()
    assert body["error"]["code"] == "validation_error"
    assert "end" in body["error"]["fields"]


def test_amenities_are_repeatable_query_parameters(client: TestClient) -> None:
    """The amenities filter must accept the name repeated, not a single blob."""
    _seed_room("Beides", 6, ["Beamer", "Whiteboard"])

    params: list[tuple[str, str]] = [
        ("start", START),
        ("end", END),
        ("min_seats", "1"),
        ("amenities", "Beamer"),
        ("amenities", "Whiteboard"),
    ]
    response = client.get("/api/availability", params=params)
    assert response.status_code == 200
    assert [room["name"] for room in response.json()] == ["Beides"]
