"""Tests for booking update and delete with the start-time lock (AC-09).

The suite runs against the real PostgreSQL test database from ``conftest``.
Rooms and bookings are provisioned directly through the ORM so the start time is
fully controlled: a future booking stays editable, a booking that already started
is refused by both PUT and DELETE.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import uuid4

from fastapi.testclient import TestClient

from app.db import get_session_factory
from app.models import Booking, Room


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


def make_booking(room_id: int, start: datetime, end: datetime, *, title: str = "Standup") -> int:
    """Insert a booking directly and return its id."""
    session = get_session_factory()()
    try:
        booking = Booking(
            room_id=room_id,
            booked_by="Ada",
            title=title,
            start=start,
            end=end,
        )
        session.add(booking)
        session.commit()
        session.refresh(booking)
        return booking.id
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


def future_window(hours_from_now: int = 48, length_hours: int = 1) -> tuple[datetime, datetime]:
    base = (datetime.now(UTC) + timedelta(hours=hours_from_now)).replace(
        minute=0, second=0, microsecond=0
    )
    return base, base + timedelta(hours=length_hours)


def past_window(hours_ago: int = 48, length_hours: int = 1) -> tuple[datetime, datetime]:
    base = (datetime.now(UTC) - timedelta(hours=hours_ago)).replace(
        minute=0, second=0, microsecond=0
    )
    return base, base + timedelta(hours=length_hours)


def test_update_future_booking_changes_its_values(client: TestClient) -> None:
    room_id = make_room()
    start, end = future_window()
    booking_id = make_booking(room_id, start, end)

    new_start, new_end = future_window(hours_from_now=72, length_hours=2)
    response = client.put(
        f"/api/bookings/{booking_id}",
        json=payload(
            room_id,
            new_start.isoformat(),
            new_end.isoformat(),
            title="Planung",
            booked_by="Grace",
        ),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == booking_id
    assert body["title"] == "Planung"
    assert body["booked_by"] == "Grace"
    assert datetime.fromisoformat(body["start"]).astimezone(UTC) == new_start
    assert datetime.fromisoformat(body["end"]).astimezone(UTC) == new_end

    fetched = client.get(f"/api/bookings/{booking_id}")
    assert fetched.status_code == 200
    assert fetched.json()["title"] == "Planung"


def test_update_future_booking_does_not_conflict_with_itself(client: TestClient) -> None:
    room_id = make_room()
    start, end = future_window()
    booking_id = make_booking(room_id, start, end)

    response = client.put(
        f"/api/bookings/{booking_id}",
        json=payload(room_id, start.isoformat(), end.isoformat(), title="Umbenannt"),
    )

    assert response.status_code == 200
    assert response.json()["title"] == "Umbenannt"


def test_update_overlapping_another_booking_is_rejected(client: TestClient) -> None:
    room_id = make_room()
    start, end = future_window(hours_from_now=48)
    first_id = make_booking(room_id, start, end, title="Planung")
    second_start = start + timedelta(minutes=30)
    second_end = end + timedelta(minutes=30)
    second_id = make_booking(room_id, second_start, second_end, title="Review")

    response = client.put(
        f"/api/bookings/{second_id}",
        json=payload(room_id, start.isoformat(), end.isoformat(), title="Review"),
    )

    assert response.status_code == 409
    error = response.json()["error"]
    assert error["code"] == "booking_overlap"
    hint = error["fields"]["start"]
    assert str(first_id) in hint
    assert "Planung" in hint

    unchanged = client.get(f"/api/bookings/{second_id}")
    assert unchanged.status_code == 200
    assert datetime.fromisoformat(unchanged.json()["start"]).astimezone(UTC) == second_start


def test_delete_future_booking_removes_it(client: TestClient) -> None:
    room_id = make_room()
    start, end = future_window()
    booking_id = make_booking(room_id, start, end)

    response = client.delete(f"/api/bookings/{booking_id}")

    assert response.status_code == 204
    assert client.get(f"/api/bookings/{booking_id}").status_code == 404
    listed = client.get("/api/bookings", params={"room_id": room_id})
    assert listed.status_code == 200
    assert listed.json() == []


def test_update_started_booking_is_refused_and_unchanged(client: TestClient) -> None:
    room_id = make_room()
    start, end = past_window()
    booking_id = make_booking(room_id, start, end, title="Vergangen")

    new_start, new_end = future_window()
    response = client.put(
        f"/api/bookings/{booking_id}",
        json=payload(room_id, new_start.isoformat(), new_end.isoformat(), title="Geaendert"),
    )

    assert response.status_code == 409
    error = response.json()["error"]
    assert error["code"] == "booking_already_started"

    unchanged = client.get(f"/api/bookings/{booking_id}")
    assert unchanged.status_code == 200
    assert unchanged.json()["title"] == "Vergangen"
    assert datetime.fromisoformat(unchanged.json()["start"]).astimezone(UTC) == start


def test_delete_started_booking_is_refused(client: TestClient) -> None:
    room_id = make_room()
    start, end = past_window()
    booking_id = make_booking(room_id, start, end)

    response = client.delete(f"/api/bookings/{booking_id}")

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "booking_already_started"
    assert client.get(f"/api/bookings/{booking_id}").status_code == 200


def test_update_unknown_booking_returns_404(client: TestClient) -> None:
    room_id = make_room()
    start, end = future_window()

    response = client.put(
        "/api/bookings/999999",
        json=payload(room_id, start.isoformat(), end.isoformat()),
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"


def test_delete_unknown_booking_returns_404(client: TestClient) -> None:
    response = client.delete("/api/bookings/999999")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"


def test_update_invalid_window_returns_422(client: TestClient) -> None:
    room_id = make_room()
    start, end = future_window()
    booking_id = make_booking(room_id, start, end)

    response = client.put(
        f"/api/bookings/{booking_id}",
        json=payload(room_id, end.isoformat(), start.isoformat()),
    )

    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "validation_error"
    assert "end" in error["fields"]
