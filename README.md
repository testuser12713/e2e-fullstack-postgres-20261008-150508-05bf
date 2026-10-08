# Raumbuchung

Eine kleine Web-Anwendung zur Buchung von Besprechungsräumen in einem Büro.
Das Backend stellt eine REST-API für Räume, Buchungen und die Suche nach freien
Räumen bereit; das Frontend (Vite + React + TypeScript) zeigt Raumliste,
Tagesansicht und Verfügbarkeitssuche. Alle Zeitangaben werden in UTC gespeichert
und mit Offset ausgeliefert.

Dieses Repository enthält den aktuellen Stand des Backend-Skeletts: Die API
startet, `GET /api/health` antwortet mit `200 {"status":"ok"}`, alle geplanten
Routen sind im OpenAPI-Dokument vorhanden. Noch nicht implementierte Routen
antworten mit Status `501` im einheitlichen Fehlerkörper.

## Tech-Stack

- **Sprache:** Python 3.12+
- **API:** FastAPI
- **Validierung:** Pydantic v2
- **ORM:** SQLAlchemy 2.0
- **Treiber:** psycopg 3
- **Datenbank:** PostgreSQL 18 (echte Datenbank, kein SQLite — auch nicht in Tests)
- **Tests:** pytest mit dem FastAPI-TestClient (`httpx`) gegen eine PostgreSQL-Testdatenbank

## Voraussetzungen

- Python 3.12 oder neuer
- Docker (für die mitgelieferte PostgreSQL über `compose.yaml`)
- Für das Frontend: Node.js 20 oder neuer

## Installation

```bash
cd backend
python -m pip install -e .
```

Für die Tests zusätzlich:

```bash
python -m pip install -e ".[test]"
```

## Datenbank starten

Die PostgreSQL-Instanz, die das Produkt im Betrieb erwartet, lässt sich mit
`compose.yaml` starten:

```bash
docker compose up -d db
```

Die Datenbank lauscht dann unter `localhost:5432` (Benutzer `app`, Passwort
`app`, Datenbank `app`).

## Konfiguration (Umgebungsvariablen)

| Variable             | Beschreibung                                                                 | Beispiel                                          |
| -------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------- |
| `DATABASE_URL`       | PostgreSQL-Verbindung der API. Wird beim Start geprüft; ohne sie startet die API nicht. | `postgresql://app:app@localhost:5432/app`         |
| `TEST_DATABASE_URL`  | Datenbank für die pytest-Suite. Fällt auf `DATABASE_URL` zurück, wenn nicht gesetzt. | `postgresql://app:app@localhost:5432/app`         |
| `FRONTEND_ORIGIN`    | Erlaubter CORS-Ursprung des Frontends (optional, Standard `http://localhost:5173`). | `http://localhost:5173`                           |
| `PORT`               | Port, auf dem die API lauscht (Standard `8000`).                              | `8000`                                            |

Die Variablen `DATABASE_URL` und `TEST_DATABASE_URL` werden im Startvertrag
(`RUN.json`) aus dem dort deklarierten Datenbank-Eintrag `db` befüllt.

## API starten (Entwicklung)

```bash
cd backend
export DATABASE_URL="postgresql://app:app@localhost:5432/app"
export TEST_DATABASE_URL="$DATABASE_URL"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Beim Start wird die Konfiguration geprüft und das Schema automatisch angelegt.
Die API ist danach unter `http://localhost:8000` erreichbar; die
interaktive Dokumentation liegt unter `/docs`.

## Tests

Die Tests laufen gegen eine echte PostgreSQL-Datenbank (kein SQLite, kein
In-Memory-Fallback):

```bash
cd backend
export DATABASE_URL="postgresql://app:app@localhost:5432/app"
PYTHONPATH=. python -m pytest
```

## API

Alle Endpunkte liegen unter `/api`. Nicht implementierte Routen antworten mit
Status `501` im einheitlichen Fehlerkörper.

### Fehlerformat

Jede Fehlerantwort hat denselben Aufbau:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Die Anfrage ist ungültig.",
    "fields": { "start": "Feld erforderlich" }
  }
}
```

Stabile Codes: `validation_error` (422), `not_found` (404),
`room_name_taken` (409), `booking_overlap` (409), `booking_already_started`
(409), `not_implemented` (501).

### Endpunkte

| Methode | Pfad                  | Beschreibung                                        |
| ------- | --------------------- | --------------------------------------------------- |
| GET     | `/api/health`         | Gesundheitsprüfung                                  |
| GET     | `/api/rooms`          | Alle Räume                                           |
| POST    | `/api/rooms`          | Raum anlegen                                         |
| GET     | `/api/rooms/{id}`     | Einen Raum abrufen                                   |
| PUT     | `/api/rooms/{id}`     | Raum ändern                                          |
| DELETE  | `/api/rooms/{id}`     | Raum löschen (löscht seine Buchungen mit)            |
| GET     | `/api/bookings`       | Buchungen, optional `?room_id&date&utc_offset_minutes` als Tagesliste |
| POST    | `/api/bookings`       | Buchung anlegen                                      |
| GET     | `/api/bookings/{id}`  | Eine Buchung abrufen                                 |
| PUT     | `/api/bookings/{id}`  | Buchung ändern                                       |
| DELETE  | `/api/bookings/{id}`  | Buchung löschen                                      |
| GET     | `/api/availability`   | Freie Räume suchen (`?start&end&min_seats&amenities`) |

#### `GET /api/health`

Antwort `200`:

```json
{ "status": "ok" }
```

#### `RoomCreate` / `RoomOut`

Request (`RoomCreate`):

```json
{ "name": "Besprechungsraum Nord", "seats": 8, "amenities": ["Beamer", "Whiteboard"] }
```

Antwort (`RoomOut`):

```json
{ "id": 1, "name": "Besprechungsraum Nord", "seats": 8, "amenities": ["Beamer", "Whiteboard"] }
```

#### `BookingCreate` / `BookingOut`

Request (`BookingCreate`), `start`/`end` als ISO-8601 mit Offset:

```json
{
  "room_id": 1,
  "booked_by": "Anna",
  "title": "Sprint Planning",
  "start": "2026-05-12T09:00:00+02:00",
  "end": "2026-05-12T10:30:00+02:00"
}
```

Antwort (`BookingOut`), Zeiten in UTC:

```json
{
  "id": 1,
  "room_id": 1,
  "booked_by": "Anna",
  "title": "Sprint Planning",
  "start": "2026-05-12T07:00:00+00:00",
  "end": "2026-05-12T08:30:00+00:00"
}
```

## Feature-Liste

- Gesundheitsprüfung über `GET /api/health`
- Einheitlicher Fehlerkörper für Validierungs-, Nicht-gefunden- und Konfliktfehler
- Vollständige ORM-Modelle für Räume (eindeutiger Name) und Buchungen
  (Löschen eines Raums löscht seine Buchungen mit)
- Zeit-Hilfsfunktionen zum Parsen von ISO-8601 und für Tagesgrenzen in UTC
- Alle geplanten Routen im OpenAPI-Dokument; noch nicht gebaute antworten `501`

## Projektstruktur

```text
backend/
  app/
    main.py            # Entrypoint: bindet alle Router ein, registriert Handler
    errors.py          # AppError + einheitliche Fehler-Handler
    db.py              # Engine, Session-Factory, get_session, Schema-Anlage
    models.py          # SQLAlchemy-Modelle Room und Booking
    schemas.py         # Pydantic-Modelle der API
    timeutils.py       # parse_iso, utc_day_bounds
    routers/           # rooms, bookings, availability
  tests/               # pytest-Suite (TestClient gegen PostgreSQL)
RUN.json               # Startvertrag (API + Datenbank)
compose.yaml           # PostgreSQL für lokale Entwicklung
```
