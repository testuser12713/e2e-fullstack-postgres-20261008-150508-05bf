import type { Booking } from '../types'

const EN_DASH = '\u2013'

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value)
}

/**
 * Format an ISO-8601 timestamp as a local `HH:MM` 24h time.
 *
 * The API stores timestamps in UTC, so the value is converted to the viewer's
 * timezone — the same offset the day list was queried with.
 */
export function formatTime(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    const match = /[\sT](\d{2}):(\d{2})/.exec(value)
    return match ? `${match[1]}:${match[2]}` : value
  }
  return `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`
}

export function formatTimeRange(start: string, end: string): string {
  return `${formatTime(start)}${EN_DASH}${formatTime(end)}`
}

interface BookingListProps {
  bookings: Booking[]
}

export default function BookingList({ bookings }: BookingListProps) {
  return (
    <div className="booking-list">
      {bookings.map((booking) => (
        <article key={booking.id} className="booking-row" data-testid="booking-row">
          <div className="booking-main">
            <div className="booking-time">{formatTimeRange(booking.start, booking.end)}</div>
            <div className="booking-title">{booking.title}</div>
            <div className="booking-by">gebucht von {booking.booked_by}</div>
          </div>
        </article>
      ))}
    </div>
  )
}
