"""Tests for the room CRUD slice (AC-02, AC-03).

Runs against the real PostgreSQL test database through the FastAPI TestClient.
Every test asserts the response bodies and, where relevant, the unified error
body shape ``{"error": {"code", "message", "fields"}}``.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.db import get_session_factory
from app.models import Booking

ROOM = {"name": "Konferenzraum Nord", "seats": 12, "amenities": ["Beamer", "Whiteboard"]}


def _assert_unified_error(body: dict, code: str) -> None:
    assert set(body) == {"error"}
    assert set(body["error"]) == {"code", "message", "fields"}
    assert body["error"]["code"] == code
    assert body["error"]["message"]
    assert isinstance(body["error"]["fields"], dict)


def test_create_room_returns_201_and_full_body(client: TestClient) -> None:
    response = client.post("/api/rooms", json=ROOM)

    assert response.status_code == 201
    body = response.json()
    assert body["id"] > 0
    assert body["name"] == ROOM["name"]
    assert body["seats"] == ROOM["seats"]
    assert body["amenities"] == ROOM["amenities"]


def test_created_room_appears_in_list_and_is_fetchable(client: TestClient) -> None:
    created = client.post("/api/rooms", json=ROOM).json()

    listed = client.get("/api/rooms")
    assert listed.status_code == 200
    assert [room["id"] for room in listed.json()] == [created["id"]]
    assert listed.json()[0] == created

    fetched = client.get(f"/api/rooms/{created['id']}")
    assert fetched.status_code == 200
    assert fetched.json() == created


def test_second_room_with_same_name_is_rejected_and_not_created(client: TestClient) -> None:
    first = client.post("/api/rooms", json=ROOM)
    assert first.status_code == 201

    duplicate = client.post("/api/rooms", json={**ROOM, "seats": 4})
    assert duplicate.status_code == 409
    _assert_unified_error(duplicate.json(), "room_name_taken")

    listed = client.get("/api/rooms").json()
    assert len(listed) == 1
    assert listed[0]["id"] == first.json()["id"]


def test_get_unknown_room_returns_404_not_found(client: TestClient) -> None:
    response = client.get("/api/rooms/99999")

    assert response.status_code == 404
    _assert_unified_error(response.json(), "not_found")


def test_update_room_changes_fields(client: TestClient) -> None:
    created = client.post("/api/rooms", json=ROOM).json()

    update = {
        "name": "Konferenzraum Sued",
        "seats": 20,
        "amenities": ["Beamer", "Whiteboard", "Telefon"],
    }
    response = client.put(f"/api/rooms/{created['id']}", json=update)

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == created["id"]
    assert body == {"id": created["id"], **update}


def test_update_unknown_room_returns_404(client: TestClient) -> None:
    response = client.put("/api/rooms/99999", json=ROOM)

    assert response.status_code == 404
    _assert_unified_error(response.json(), "not_found")


def test_update_to_existing_name_returns_409_and_keeps_room(client: TestClient) -> None:
    first = client.post("/api/rooms", json={"name": "Raum A", "seats": 4, "amenities": []}).json()
    second = client.post("/api/rooms", json={"name": "Raum B", "seats": 6, "amenities": []}).json()

    response = client.put(
        f"/api/rooms/{second['id']}",
        json={"name": "Raum A", "seats": 6, "amenities": []},
    )
    assert response.status_code == 409
    _assert_unified_error(response.json(), "room_name_taken")

    unchanged = client.get(f"/api/rooms/{second['id']}").json()
    assert unchanged["name"] == "Raum B"
    assert first["name"] == "Raum A"


def test_update_to_own_name_is_allowed(client: TestClient) -> None:
    created = client.post("/api/rooms", json=ROOM).json()

    response = client.put(
        f"/api/rooms/{created['id']}",
        json={**ROOM, "seats": 15},
    )

    assert response.status_code == 200
    assert response.json()["seats"] == 15


def test_delete_room_returns_204_then_404(client: TestClient) -> None:
    created = client.post("/api/rooms", json=ROOM).json()

    deleted = client.delete(f"/api/rooms/{created['id']}")
    assert deleted.status_code == 204
    assert deleted.content == b""

    assert client.get(f"/api/rooms/{created['id']}").status_code == 404
    assert client.get("/api/rooms").json() == []


def test_delete_unknown_room_returns_404(client: TestClient) -> None:
    response = client.delete("/api/rooms/99999")

    assert response.status_code == 404
    _assert_unified_error(response.json(), "not_found")


def test_deleting_room_cascades_to_its_bookings(client: TestClient) -> None:
    created = client.post("/api/rooms", json=ROOM).json()

    session = get_session_factory()()
    try:
        start = datetime.now(UTC) + timedelta(hours=1)
        session.add(
            Booking(
                room_id=created["id"],
                booked_by="Ada",
                title="Daily",
                start=start,
                end=start + timedelta(hours=1),
            )
        )
        session.commit()
    finally:
        session.close()

    assert client.delete(f"/api/rooms/{created['id']}").status_code == 204

    session = get_session_factory()()
    try:
        remaining = session.execute(
            select(func.count()).select_from(Booking).where(Booking.room_id == created["id"])
        ).scalar_one()
    finally:
        session.close()
    assert remaining == 0
