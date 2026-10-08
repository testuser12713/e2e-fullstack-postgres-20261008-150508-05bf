"""Unified error model and exception handlers for the Raumbuchung API.

Every error the API emits — application errors, request validation failures,
unknown routes and unhandled crashes — is rendered through exactly one body
shape::

    {"error": {"code": "...", "message": "...", "fields": {"<field>": "..."}}}

``code`` is a stable machine-readable identifier, ``message`` is a readable
sentence and ``fields`` maps individual request fields to a hint (empty when the
error is not tied to a specific field).
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("app.errors")

#: The stable error codes of the contract and the HTTP status each one carries.
STATUS_BY_CODE: dict[str, int] = {
    "validation_error": 422,
    "not_found": 404,
    "room_name_taken": 409,
    "booking_overlap": 409,
    "booking_already_started": 409,
    "not_implemented": 501,
    "method_not_allowed": 405,
    "internal_error": 500,
}

#: Readable default messages for the codes the contract fixes.
DEFAULT_MESSAGES: dict[str, str] = {
    "validation_error": "Die Anfrage ist ungültig.",
    "not_found": "Die angeforderte Ressource wurde nicht gefunden.",
    "room_name_taken": "Ein Raum mit diesem Namen existiert bereits.",
    "booking_overlap": "Die Buchung überschneidet sich mit einer bestehenden Buchung.",
    "booking_already_started": "Die Buchung hat bereits begonnen und kann nicht mehr geändert werden.",
    "not_implemented": "Diese Funktion ist noch nicht implementiert.",
    "method_not_allowed": "Diese Methode ist für diese Route nicht erlaubt.",
    "internal_error": "Interner Serverfehler.",
}

#: Fallback mapping from an HTTP status to a stable code.
_CODE_BY_STATUS: dict[int, str] = {
    404: "not_found",
    405: "method_not_allowed",
    422: "validation_error",
    501: "not_implemented",
}


class AppError(Exception):
    """An error the application raises on purpose.

    Carrying ``code``, ``message`` and ``fields`` in one object keeps the error
    body identical no matter which layer produced it.
    """

    def __init__(
        self,
        code: str,
        message: str | None = None,
        fields: dict[str, str] | None = None,
        status_code: int | None = None,
    ) -> None:
        self.code = code
        self.message = message or DEFAULT_MESSAGES.get(code, code)
        self.fields: dict[str, str] = dict(fields or {})
        self.status_code = status_code or STATUS_BY_CODE.get(code, 400)
        super().__init__(self.message)

    def to_body(self) -> dict[str, Any]:
        """Render the error in the unified response body shape."""
        return {
            "error": {
                "code": self.code,
                "message": self.message,
                "fields": self.fields,
            }
        }


def _body(code: str, message: str, fields: dict[str, str] | None = None) -> dict[str, Any]:
    return {"error": {"code": code, "message": message, "fields": fields or {}}}


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    """Render an :class:`AppError` in the unified body with its own status."""
    return JSONResponse(status_code=exc.status_code, content=exc.to_body())


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Turn a request validation failure into the unified 422 body.

    The offending locations become ``fields`` so a client can highlight the
    exact input (``fields.start``, ``fields.name`` ...).
    """
    fields: dict[str, str] = {}
    for error in exc.errors():
        location = [str(part) for part in error.get("loc", []) if part != "body"]
        key = ".".join(location) or "request"
        fields[key] = str(error.get("msg", "ungültiger Wert"))
    return JSONResponse(
        status_code=422,
        content=_body("validation_error", DEFAULT_MESSAGES["validation_error"], fields),
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Render framework-raised HTTP errors (unknown route, bad method) uniformly."""
    code = _CODE_BY_STATUS.get(exc.status_code)
    if code is None:
        code = "validation_error" if 400 <= exc.status_code < 500 else "internal_error"
    detail = (
        exc.detail
        if isinstance(exc.detail, str) and exc.detail
        else DEFAULT_MESSAGES.get(code, code)
    )
    return JSONResponse(status_code=exc.status_code, content=_body(code, detail))


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all so no request ever leaves the API without the unified body.

    It is registered as a handler *inside* the exception layer so the response
    still carries the CORS headers the browser needs to read a real 500.
    """
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content=_body("internal_error", DEFAULT_MESSAGES["internal_error"]),
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Attach every handler so all error answers share one body shape."""
    app.add_exception_handler(AppError, app_error_handler)  # type: ignore[arg-type]
    app.add_exception_handler(RequestValidationError, validation_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(Exception, unhandled_exception_handler)
