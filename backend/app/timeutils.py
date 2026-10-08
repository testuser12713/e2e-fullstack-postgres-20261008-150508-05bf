"""Time helpers shared by the booking and availability slices.

All timestamps entering the domain are normalized to timezone-aware UTC.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta, timezone
from datetime import date as date_type

UTC = UTC


def parse_iso(value: str) -> datetime:
    """Parse an ISO-8601 string into a timezone-aware UTC datetime.

    A trailing ``Z`` (Zulu / UTC) is accepted and a naive timestamp is assumed to
    be UTC. The result is always converted to UTC.
    """
    text = value.strip()
    if text.endswith(("Z", "z")):
        text = text[:-1] + "+00:00"
    parsed = datetime.fromisoformat(text)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC)


def utc_day_bounds(day: date_type, utc_offset_minutes: int) -> tuple[datetime, datetime]:
    """Return the UTC window covering one local calendar day.

    ``utc_offset_minutes`` is the viewer's offset from UTC (for example ``120``
    for UTC+02:00). The returned pair is ``[start, end)`` in UTC: the instant the
    local day begins and the instant the next local day begins.
    """
    local_tz = timezone(timedelta(minutes=utc_offset_minutes))
    start_local = datetime(day.year, day.month, day.day, tzinfo=local_tz)
    end_local = start_local + timedelta(days=1)
    return start_local.astimezone(UTC), end_local.astimezone(UTC)
