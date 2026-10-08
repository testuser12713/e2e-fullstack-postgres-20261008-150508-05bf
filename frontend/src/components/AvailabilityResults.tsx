import { Link } from 'react-router-dom'
import type { ApiError } from '../api/client'
import type { Room } from '../types'

export type SearchStatus = 'idle' | 'loading' | 'success' | 'error'

interface AvailabilityResultsProps {
  status: SearchStatus
  rooms: Room[]
  error: ApiError | null
  date: string | null
  onRetry: () => void
}

function seatsLabel(seats: number): string {
  return seats === 1 ? '1 Platz' : `${seats} Plätze`
}

function SeatIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 9v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9" />
      <path d="M4 9V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2" />
      <path d="M2 13h20" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg
      className="rs-empty-icon"
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

export default function AvailabilityResults({
  status,
  rooms,
  error,
  date,
  onRetry,
}: AvailabilityResultsProps) {
  if (status === 'loading') {
    return (
      <div
        className="rs-skeleton"
        aria-busy="true"
        aria-label="Suche läuft"
        data-testid="search-loading"
      >
        <div className="rs-skeleton-row" />
        <div className="rs-skeleton-row" />
        <div className="rs-skeleton-row" />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="rs-error" role="alert">
        <WarningIcon />
        <h2 className="rs-error-title">Daten konnten nicht geladen werden.</h2>
        <p className="rs-error-message">
          {error?.message ?? 'Die Anfrage ist fehlgeschlagen.'}
        </p>
        {error ? <p className="rs-error-code">{error.code}</p> : null}
        <button type="button" className="rs-btn rs-btn-secondary" onClick={onRetry}>
          Erneut versuchen
        </button>
      </div>
    )
  }

  if (status === 'success' && rooms.length === 0) {
    return (
      <div className="rs-empty">
        <SearchIcon />
        <h2 className="rs-empty-title">Kein freier Raum in diesem Zeitraum.</h2>
        <p className="rs-empty-body">
          Es gibt keinen Raum, der im gewählten Zeitraum frei ist und alle Kriterien erfüllt.
          Versuche einen größeren Zeitraum oder weniger Ausstattung.
        </p>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="rs-results-grid">
        {rooms.map((room) => (
          <Link
            key={room.id}
            className="rs-room-card"
            to={date ? `/rooms/${room.id}?date=${date}` : `/rooms/${room.id}`}
          >
            <div className="rs-room-card-head">
              <span className="rs-room-card-name">{room.name}</span>
              <span className="rs-room-card-seats">
                <SeatIcon /> {seatsLabel(room.seats)}
              </span>
            </div>
            {room.amenities.length > 0 ? (
              <div className="rs-chips">
                {room.amenities.map((amenity) => (
                  <span key={amenity} className="rs-chip rs-chip--readonly">
                    {amenity}
                  </span>
                ))}
              </div>
            ) : null}
            <span className="rs-pill rs-pill--free">frei</span>
          </Link>
        ))}
      </div>
    )
  }

  return null
}
