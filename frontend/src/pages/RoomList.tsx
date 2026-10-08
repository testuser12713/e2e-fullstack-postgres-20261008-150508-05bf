import { useCallback, useEffect, useMemo, useState } from 'react'
import { listRooms } from '../api/client'
import AmenityFilter from '../components/AmenityFilter'
import RoomCard from '../components/RoomCard'
import type { Room } from '../types'
import './RoomList.css'

const PREFERRED_AMENITY_ORDER = [
  'Beamer',
  'Whiteboard',
  'Videokonferenz',
  'TV',
  'Monitor',
  'Telefonkonferenz',
]

type LoadStatus = 'loading' | 'error' | 'ready'

interface LoadError {
  code: string
  message: string
}

function LoadingSkeleton() {
  return (
    <div className="room-skeleton" role="status" aria-busy="true" aria-label="Raumliste wird geladen">
      {[0, 1, 2].map((row) => (
        <div key={row} className="room-skeleton__row" />
      ))}
    </div>
  )
}

interface ErrorStateProps {
  code: string
  message: string
  onRetry: () => void
}

function ErrorState({ code, message, onRetry }: ErrorStateProps) {
  return (
    <div className="error-state" role="alert">
      <p className="error-state__title">Daten konnten nicht geladen werden.</p>
      <p className="error-state__body">{message}</p>
      <p className="error-state__code">{code}</p>
      <div className="error-state__actions">
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
          Erneut versuchen
        </button>
      </div>
    </div>
  )
}

interface EmptyStateProps {
  onReset: () => void
}

function EmptyState({ onReset }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <svg
        className="empty-state__icon"
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
      <p className="empty-state__title">Kein Raum passt zu dieser Ausstattung.</p>
      <p className="empty-state__body">
        Die gewählten Schlagwörter müssen alle gleichzeitig vorhanden sein. Versuche es mit weniger
        Filtern.
      </p>
      <button type="button" className="btn btn-secondary" onClick={onReset}>
        Filter zurücksetzen
      </button>
    </div>
  )
}

export default function RoomList() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [error, setError] = useState<LoadError>({ code: '', message: '' })
  const [selected, setSelected] = useState<string[]>([])

  const load = useCallback(async () => {
    setStatus('loading')
    try {
      const data = await listRooms()
      setRooms(data)
      setStatus('ready')
    } catch (err) {
      const failure = err as { code?: string; message?: string }
      setError({
        code: failure.code ?? 'unknown_error',
        message: failure.message ?? 'Daten konnten nicht geladen werden.',
      })
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const availableAmenities = useMemo(() => {
    const present = new Set<string>()
    for (const room of rooms) {
      for (const amenity of room.amenities) {
        present.add(amenity)
      }
    }
    const preferred = PREFERRED_AMENITY_ORDER.filter((amenity) => present.has(amenity))
    const rest = [...present]
      .filter((amenity) => !PREFERRED_AMENITY_ORDER.includes(amenity))
      .sort((a, b) => a.localeCompare(b, 'de'))
    return [...preferred, ...rest]
  }, [rooms])

  const toggleAmenity = useCallback((amenity: string) => {
    setSelected((previous) =>
      previous.includes(amenity)
        ? previous.filter((entry) => entry !== amenity)
        : [...previous, amenity],
    )
  }, [])

  const resetFilter = useCallback(() => {
    setSelected([])
  }, [])

  const visibleRooms = useMemo(
    () => rooms.filter((room) => selected.every((amenity) => room.amenities.includes(amenity))),
    [rooms, selected],
  )

  return (
    <div className="room-list">
      <header className="room-list-header">
        <h1 className="room-list-title" aria-label="Raumliste">
          Räume
        </h1>
        <p className="room-list-subtitle">
          Alle buchbaren Räume des Büros. Tippe auf eine Karte, um die Tagesansicht zu öffnen.
        </p>
      </header>

      {status === 'loading' && <LoadingSkeleton />}

      {status === 'error' && (
        <ErrorState code={error.code} message={error.message} onRetry={() => void load()} />
      )}

      {status === 'ready' && (
        <>
          {availableAmenities.length > 0 && (
            <section className="room-list-filter" aria-label="Ausstattungsfilter">
              <AmenityFilter
                amenities={availableAmenities}
                selected={selected}
                onToggle={toggleAmenity}
              />
            </section>
          )}

          <section aria-live="polite">
            {visibleRooms.length === 0 ? (
              <EmptyState onReset={resetFilter} />
            ) : (
              <div className="room-grid">
                {visibleRooms.map((room) => (
                  <RoomCard key={room.id} room={room} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
