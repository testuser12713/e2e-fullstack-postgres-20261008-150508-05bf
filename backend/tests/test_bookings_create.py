"""Tests for booking creation, listing and the room day list.

The suite runs against the real PostgreSQL test database from ``conftest``
(AC-23). Rooms are provisioned directly through the ORM because room CRUD is a
sibling slice; this file only exercises the booking routes it owns.
"""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from fastapi.testclient import TestClient

from app.db import get_session_factory
from app.models import Room


def make_room(seats: int = 8) -> int:
    """Insert a room directly and return its id."""
    session = get_session_factory()()
    try:
        room = Room(name=f"Room-{uuid4().hex[:10]}", seats=seats, amenities=[])
        session.add(room)
        session.commit()
        session.refresh(room)
        return room.id
    finally:
        session.close()


def payload(
    room_id: int,
    start: str,
    end: str,
    *,
    title: str = "Standup",
    booked_by: str = "Ada",
) -> dict[str, object]:
    return {
        "room_id": room_id,
        "booked_by": booked_by,
        "title": title,
        "start": start,
        "end": end,
    }


def booking_count(client: TestClient, room_id: int) -> int:
    response = client.get("/api/bookings", params={"room_id": room_id})
    assert response.status_code == 200
    return len(response.json())


def test_create_returns_201_and_is_fetchable_and_listed(client: TestClient) -> None:
    room_id = make_room()

    created = client.post(
        "/api/bookings",
        json=payload(room_id, "2026-05-04T09:00:00+02:00", "2026-05-04T10:30:00+02:00"),
    )
    assert created.status_code == 201
    body = created.json()
    booking_id = body["id"]
    assert body["room_id"] == room_id
    assert body["booked_by"] == "Ada"
    assert body["title"] == "Standup"
    # Times are stored and returned in UTC.
    start = datetime.fromisoformat(body["start"]).astimezone(UTC)
    end = datetime.fromisoformat(body["end"]).astimezone(UTC)
    assert start == datetime(2026, 5, 4, 7, 0, tzinfo=UTC)
    assert end == datetime(2026, 5, 4, 8, 30, tzinfo=UTC)

    fetched = client.get(f"/api/bookings/{booking_id}")
    assert fetched.status_code == 200
    assert fetched.json()["id"] == booking_id

    listed = client.get("/api/bookings", params={"room_id": room_id})
    assert listed.status_code == 200
    assert [item["id"] for item in listed.json()] == [booking_id]


def test_end_equal_to_start_is_rejected_with_end_field(client: TestClient) -> None:
    room_id = make_room()

    response = client.post(
        "/api/bookings",
        json=payload(room_id, "2026-05-04T10:00:00+02:00", "2026-05-04T10:00:00+02:00"),
    )

    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "validation_error"
    assert "end" in error["fields"]
    assert booking_count(client, room_id) == 0


def test_end_before_start_is_rejected_with_end_field(client: TestClient) -> None:
    room_id = make_room()

    response = client.post(
        "/api/bookings",
        json=payload(room_id, "2026-05-04T11:00:00+02:00", "2026-05-04T09:00:00+02:00"),
    )

    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "validation_error"
    assert "end" in error["fields"]
    assert booking_count(client, room_id) == 0


def test_duration_longer_than_eight_hours_is_rejected(client: TestClient) -> None:
    room_id = make_room()

    response = client.post(
        "/api/bookings",
        json=payload(room_id, "2026-05-04T09:00:00+02:00", "2026-05-04T17:30:00+02:00"),
    )

    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "validation_error"
    assert "end" in error["fields"]
    assert booking_count(client, room_id) == 0


def test_exactly_eight_hours_is_accepted(client: TestClient) -> None:
    room_id = make_room()

    response = client.post(
        "/api/bookings",
        json=payload(room_id, "2026-05-04T09:00:00+02:00", "2026-05-04T17:00:00+02:00"),
    )

    assert response.status_code == 201


def test_overlapping_booking_is_rejected_with_conflict_details(client: TestClient) -> None:
    room_id = make_room()
    first = client.post(
        "/api/bookings",
        json=payload(
            room_id,
            "2026-05-04T09:00:00+02:00",
            "2026-05-04T11:00:00+02:00",
            title="Planung",
        ),
    )
    assert first.status_code == 201
    first_id = first.json()["id"]

    response = client.post(
        "/api/bookings",
        json=payload(
            room_id,
            "2026-05-04T10:00:00+02:00",
            "2026-05-04T12:00:00+02:00",
            title="Review",
        ),
    )

    assert response.status_code == 409
    error = response.json()["error"]
    assert error["code"] == "booking_overlap"
    hint = error["fields"]["start"]
    assert str(first_id) in hint
    assert "Planung" in hint
    assert booking_count(client, room_id) == 1


def test_directly_adjacent_bookings_are_accepted(client: TestClient) -> None:
    room_id = make_room()
    first = client.post(
        "/api/bookings",
        json=payload(room_id, "2026-05-04T09:00:00+02:00", "2026-05-04T10:00:00+02:00"),
    )
    assert first.status_code == 201

    second = client.post(
        "/api/bookings",
        json=payload(room_id, "2026-05-04T10:00:00+02:00", "2026-05-04T11:00:00+02:00"),
    )

    assert second.status_code == 201
    assert booking_count(client, room_id) == 2


def test_day_list_returns_booking_touching_local_day_sorted_by_start(
    client: TestClient,
) -> None:
    room_id = make_room()
    later = client.post(
        "/api/bookings",
        json=payload(
            room_id,
            "2026-05-04T13:00:00+02:00",
            "2026-05-04T14:00:00+02:00",
            title="Nachmittag",
        ),
    )
    assert later.status_code == 201
    earlier = client.post(
        "/api/bookings",
        json=payload(
            room_id,
            "2026-05-04T08:00:00+02:00",
            "2026-05-04T09:00:00+02:00",
            title="Morgen",
        ),
    )
    assert earlier.status_code == 201
    other_day = client.post(
        "/api/bookings",
        json=payload(
            room_id,
            "2026-05-05T09:00:00+02:00",
            "2026-05-05T10:00:00+02:00",
            title="Naechster Tag",
        ),
    )
    assert other_day.status_code == 201

    response = client.get(
        "/api/bookings",
        params={"room_id": room_id, "date": "2026-05-04", "utc_offset_minutes": 120},
    )

    assert response.status_code == 200
    titles = [item["title"] for item in response.json()]
    assert titles == ["Morgen", "Nachmittag"]
    assert other_day.json()["id"] not in [item["id"] for item in response.json()]


def test_create_rejects_unknown_room_without_server_error(client: TestClient) -> None:
    response = client.post(
        "/api/bookings",
        json=payload(999_999, "2026-05-04T09:00:00+02:00", "2026-05-04T10:00:00+02:00"),
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
