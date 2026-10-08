"""Skeleton tests: only what the bootstrap itself delivers.

The product features behind the room, booking and availability routes are built
by other slices, so these tests deliberately assert nothing about a stub's answer
(no 501). They check that the app starts, that health is real and that every
planned route of the contract is registered in the OpenAPI document.
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

PLANNED_ROUTES: set[tuple[str, str]] = {
    ("/api/health", "get"),
    ("/api/rooms", "get"),
    ("/api/rooms", "post"),
    ("/api/rooms/{room_id}", "get"),
    ("/api/rooms/{room_id}", "put"),
    ("/api/rooms/{room_id}", "delete"),
    ("/api/bookings", "get"),
    ("/api/bookings", "post"),
    ("/api/bookings/{booking_id}", "get"),
    ("/api/bookings/{booking_id}", "put"),
    ("/api/bookings/{booking_id}", "delete"),
    ("/api/availability", "get"),
}


def test_health_runs_lifespan_and_reports_ok() -> None:
    with TestClient(app) as client:
        response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_openapi_documents_every_planned_route() -> None:
    with TestClient(app) as client:
        document = client.get("/openapi.json").json()

    paths = document["paths"]
    missing = [
        f"{method.upper()} {path}"
        for path, method in sorted(PLANNED_ROUTES)
        if path not in paths or method not in paths[path]
    ]
    assert missing == [], f"Routen fehlen im OpenAPI-Dokument: {missing}"


def test_unknown_route_uses_unified_error_body() -> None:
    with TestClient(app) as client:
        response = client.get("/api/gibt-es-nicht")

    assert response.status_code == 404
    body = response.json()
    assert set(body) == {"error"}
    assert set(body["error"]) == {"code", "message", "fields"}
    assert body["error"]["code"] == "not_found"
    assert body["error"]["message"]
    assert body["error"]["fields"] == {}


def test_request_validation_uses_unified_error_body_with_fields() -> None:
    with TestClient(app) as client:
        response = client.post("/api/rooms", json={})

    assert response.status_code == 422
    body = response.json()
    assert body["error"]["code"] == "validation_error"
    assert isinstance(body["error"]["fields"], dict)
    assert body["error"]["fields"], "Validierungsfehler müssen betroffene Felder nennen"
