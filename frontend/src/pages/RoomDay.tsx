import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ApiError, deleteBooking, getRoom } from '../api/client'
import BookingActions from '../components/BookingActions'
import BookingForm from '../components/BookingForm'
import { formatTimeRange } from '../components/BookingList'
import { useRoomDay } from '../hooks/useRoomDay'
import type { Booking, Room } from '../types'
import './RoomDay.css'

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value)
}

function parseDay(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) {
    return null
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const parsed = new Date(year, month - 1, day)
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null
  }
  return parsed
}

function toIsoDay(value: Date): string {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
}

function todayIso(): string {
  return toIsoDay(new Date())
}

function addDays(value: string, delta: number): string {
  const parsed = parseDay(value) ?? new Date()
  const next = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate() + delta)
  return toIsoDay(next)
}

function formatDayLabel(value: string): string {
  const parsed = parseDay(value)
  if (!parsed) {
    return value
  }
  return `${WEEKDAYS[parsed.getDay()]}, ${pad(parsed.getDate())}.${pad(
    parsed.getMonth() + 1,
  )}.${parsed.getFullYear()}`
}

/** The viewer's UTC offset for the chosen day, e.g. `+02:00`. */
function formatOffset(value: string): string {
  const parsed = parseDay(value) ?? new Date()
  const minutes = -parsed.getTimezoneOffset()
  const sign = minutes < 0 ? '-' : '+'
  const absolute = Math.abs(minutes)
  return `${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`
}

function formatSeats(seats: number): string {
  return seats === 1 ? '1 Platz' : `${seats} Plätze`
}

/** A booking whose start has been reached can no longer be changed (AC-09). */
function hasStarted(booking: Booking): boolean {
  const start = new Date(booking.start).getTime()
  return !Number.isNaN(start) && start <= Date.now()
}

type FormState = { mode: 'create' } | { mode: 'edit'; booking: Booking }

interface Notice {
  variant: 'success' | 'error'
  title: string
  body: string
}

function ChevronLeftIcon() {
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
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function ChevronRightIcon() {
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
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function BackIcon() {
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
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg
      className="empty-state-icon"
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
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
    </svg>
  )
}

function BookingSkeleton() {
  return (
    <div className="skeleton" aria-busy="true" data-testid="day-loading">
      <div className="skeleton-row booking" />
      <div className="skeleton-row booking" />
      <div className="skeleton-row booking" />
    </div>
  )
}

function ErrorState({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  return (
    <div className="banner banner-warning" role="alert">
      <p className="banner-title">Daten konnten nicht geladen werden.</p>
      <p className="banner-body">{error.message}</p>
      <p className="banner-code">{error.code}</p>
      <button type="button" className="btn btn-secondary" onClick={onRetry}>
        Erneut versuchen
      </button>
    </div>
  )
}

function NoticeBanner({ notice, onDismiss }: { notice: Notice; onDismiss: () => void }) {
  return (
    <div
      className={`banner banner-${notice.variant}`}
      role={notice.variant === 'success' ? 'status' : 'alert'}
      tabIndex={-1}
      data-testid="day-notice"
    >
      <p className="banner-title">{notice.title}</p>
      <p className="banner-body">{notice.body}</p>
      <button type="button" className="btn btn-ghost" onClick={onDismiss}>
        Ausblenden
      </button>
    </div>
  )
}

export default function RoomDay() {
  const { id } = useParams<{ id: string }>()
  const roomId = id === undefined ? undefined : Number(id)
  const [searchParams, setSearchParams] = useSearchParams()

  const dateParam = searchParams.get('date')
  const date = dateParam !== null && parseDay(dateParam) !== null ? dateParam : todayIso()

  const [room, setRoom] = useState<Room | null>(null)
  const [roomError, setRoomError] = useState<ApiError | null>(null)
  const [roomReloadToken, setRoomReloadToken] = useState(0)
  const [formState, setFormState] = useState<FormState | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const { bookings, loading, error, refetch } = useRoomDay(roomId, date)

  useEffect(() => {
    if (dateParam !== null) {
      return
    }
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        next.set('date', date)
        return next
      },
      { replace: true },
    )
  }, [dateParam, date, setSearchParams])

  useEffect(() => {
    if (roomId === undefined || Number.isNaN(roomId)) {
      return
    }
    let active = true
    getRoom(roomId)
      .then((result) => {
        if (active) {
          setRoom(result)
          setRoomError(null)
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setRoom(null)
          setRoomError(
            cause instanceof ApiError
              ? cause
              : new ApiError('unknown_error', 'Der Raum konnte nicht geladen werden.'),
          )
        }
      })
    return () => {
      active = false
    }
  }, [roomId, roomReloadToken])

  const goToDate = useCallback(
    (next: string) => {
      setSearchParams((previous) => {
        const params = new URLSearchParams(previous)
        params.set('date', next)
        return params
      })
    },
    [setSearchParams],
  )

  const retry = useCallback(() => {
    setRoomReloadToken((token) => token + 1)
    refetch()
  }, [refetch])

  const openCreate = useCallback(() => {
    setNotice(null)
    setFormState({ mode: 'create' })
  }, [])

  const openEdit = useCallback((booking: Booking) => {
    setNotice(null)
    setFormState({ mode: 'edit', booking })
  }, [])

  const handleSaved = useCallback(
    (_saved: Booking, mode: 'create' | 'edit') => {
      setFormState(null)
      setNotice({
        variant: 'success',
        title: mode === 'edit' ? 'Buchung geändert' : 'Buchung angelegt',
        body:
          mode === 'edit'
            ? 'Die Änderungen wurden gespeichert und erscheinen jetzt in der Tagesansicht des Raums.'
            : 'Die Buchung wurde gespeichert und erscheint jetzt in der Tagesansicht des Raums.',
      })
      refetch()
    },
    [refetch],
  )

  const handleDelete = useCallback(
    async (booking: Booking) => {
      setDeletingId(booking.id)
      try {
        await deleteBooking(booking.id)
        setNotice({
          variant: 'success',
          title: 'Buchung gelöscht',
          body: 'Die Buchung wurde entfernt und die Tagesansicht aktualisiert.',
        })
        refetch()
      } catch (cause) {
        setNotice({
          variant: 'error',
          title: 'Löschen fehlgeschlagen',
          body:
            cause instanceof ApiError
              ? cause.message
              : 'Die Buchung konnte nicht gelöscht werden.',
        })
      } finally {
        setDeletingId(null)
      }
    },
    [refetch],
  )

  if (formState && room) {
    const editing = formState.mode === 'edit' ? formState.booking : null
    return (
      <section className="room-day">
        <div className="back-row">
          <button type="button" className="btn btn-ghost" onClick={() => setFormState(null)}>
            <BackIcon />
            Zurück
          </button>
        </div>

        <header className="page-header">
          <h1 className="page-title">
            {formState.mode === 'edit' ? 'Buchung bearbeiten' : 'Buchung anlegen'}
          </h1>
          <p className="page-subtitle">
            Reserviere einen Raum. Die Dauer darf höchstens 8 Stunden betragen.
          </p>
        </header>

        <BookingForm
          room={room}
          date={date}
          editing={editing}
          existingBookings={bookings}
          onSaved={handleSaved}
          onCancel={() => setFormState(null)}
        />
      </section>
    )
  }

  const loadedError = roomError ?? error

  let content
  if (loadedError) {
    content = <ErrorState error={loadedError} onRetry={retry} />
  } else if (loading) {
    content = <BookingSkeleton />
  } else if (bookings.length === 0) {
    content = (
      <div className="empty-state" data-testid="day-empty">
        <CalendarIcon />
        <h2 className="empty-state-title">An diesem Tag ist nichts gebucht.</h2>
        <p className="empty-state-body">
          Der Raum ist an diesem Tag frei. Lege eine neue Buchung an, um den Raum zu reservieren.
        </p>
        <button type="button" className="btn btn-secondary" onClick={openCreate} disabled={!room}>
          Buchung anlegen
        </button>
      </div>
    )
  } else {
    content = (
      <div className="booking-list">
        {bookings.map((booking) => {
          const past = hasStarted(booking)
          return (
            <article
              key={booking.id}
              className={past ? 'booking-row is-past' : 'booking-row'}
              data-testid="booking-row"
            >
              <div className="booking-main">
                <div className="booking-time">{formatTimeRange(booking.start, booking.end)}</div>
                <div className="booking-title">{booking.title}</div>
                <div className="booking-by">gebucht von {booking.booked_by}</div>
              </div>
              <BookingActions
                booking={booking}
                disabled={past || deletingId === booking.id}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            </article>
          )
        })}
      </div>
    )
  }

  const subtitle = room
    ? room.amenities.length > 0
      ? `${formatSeats(room.seats)} · ${room.amenities.join(', ')}`
      : formatSeats(room.seats)
    : null

  return (
    <section className="room-day">
      <div className="back-row">
        <Link className="btn btn-ghost" to="/">
          <BackIcon />
          Zurück
        </Link>
      </div>

      <header className="page-header">
        <h1 className="page-title">{room?.name ?? 'Tagesansicht'}</h1>
        {subtitle !== null ? <p className="page-subtitle">{subtitle}</p> : null}
      </header>

      <section aria-label="Tag auswählen">
        <div className="day-switcher">
          <button
            type="button"
            className="btn btn-secondary btn-icon"
            aria-label="Vorheriger Tag"
            onClick={() => goToDate(addDays(date, -1))}
          >
            <ChevronLeftIcon />
          </button>
          <div className="day-switcher-date">
            {formatDayLabel(date)} <span className="tz">{formatOffset(date)}</span>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-icon"
            aria-label="Nächster Tag"
            onClick={() => goToDate(addDays(date, 1))}
          >
            <ChevronRightIcon />
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => goToDate(todayIso())}>
            Heute
          </button>
          <span className="create-booking">
            <button
              type="button"
              className="btn btn-primary"
              onClick={openCreate}
              disabled={!room}
            >
              Buchung anlegen
            </button>
          </span>
        </div>
      </section>

      {notice ? (
        <div className="section-gap">
          <NoticeBanner notice={notice} onDismiss={() => setNotice(null)} />
        </div>
      ) : null}

      <section className="section-gap" aria-live="polite">
        {content}
      </section>
    </section>
  )
}
