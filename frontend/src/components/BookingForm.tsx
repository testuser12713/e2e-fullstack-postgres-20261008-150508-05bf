import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, FormEvent, ReactNode } from 'react'
import { ApiError, createBooking, updateBooking } from '../api/client'
import { formatTimeRange } from './BookingList'
import type { Booking, Room } from '../types'
import './BookingForm.css'

export type BookingFormMode = 'create' | 'edit'

interface FieldValues {
  title: string
  booked_by: string
  date: string
  start: string
  end: string
}

type FieldName = keyof FieldValues
type FieldErrors = Partial<Record<FieldName, string>>

export interface BookingFormProps {
  room: Room
  date: string
  editing?: Booking | null
  existingBookings?: Booking[]
  onSaved: (booking: Booking, mode: BookingFormMode) => void
  onCancel: () => void
}

/** Maximum booking duration the API accepts (AC-07). */
const MAX_DURATION_MINUTES = 8 * 60
const TITLE_MAX_LENGTH = 80

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value)
}

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'] as const

/** The product's single DATE format `DD.MM.YYYY` (DESIGN.md layout_principles). */
function formatDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) {
    return value
  }
  return `${match[3]}.${match[2]}.${match[1]}`
}

/** The product's date-with-weekday format `Mo, 12.05.2025`. */
function formatDateWithWeekday(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) {
    return value
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const weekday = WEEKDAYS[new Date(year, month - 1, day).getDay()]
  return `${weekday}, ${match[3]}.${match[2]}.${match[1]}`
}

/** The product's single TIME format 24h `HH:MM`. */
function formatTimeValue(value: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  return match ? `${match[1]}:${match[2]}` : value
}

const FORMAT_HINT_STYLE: CSSProperties = {
  margin: 0,
  fontSize: '13px',
  lineHeight: '20px',
  color: 'var(--color-fg_muted)',
  fontVariantNumeric: 'tabular-nums',
}

const PERIOD_SUMMARY_STYLE: CSSProperties = {
  margin: 0,
  fontSize: '14px',
  lineHeight: '20px',
  fontWeight: 500,
  color: 'var(--color-fg)',
  fontVariantNumeric: 'tabular-nums',
}

function isValidDay(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) {
    return false
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const parsed = new Date(year, month - 1, day)
  return (
    parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day
  )
}

/** The local `YYYY-MM-DD` day of an ISO-8601 timestamp. */
function toLocalDay(iso: string): string {
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) {
    return ''
  }
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`
}

/** The local `HH:MM` time of an ISO-8601 timestamp. */
function toLocalTime(iso: string): string {
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) {
    return ''
  }
  return `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`
}

/** Combine a local date and time into a Date, or null when either is invalid. */
function combine(date: string, time: string): Date | null {
  const dayMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time)
  if (!dayMatch || !timeMatch) {
    return null
  }
  const year = Number(dayMatch[1])
  const month = Number(dayMatch[2])
  const day = Number(dayMatch[3])
  const hour = Number(timeMatch[1])
  const minute = Number(timeMatch[2])
  if (hour > 23 || minute > 59) {
    return null
  }
  const parsed = new Date(year, month - 1, day, hour, minute)
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null
  }
  return parsed
}

function initialValues(date: string, editing: Booking | null): FieldValues {
  if (editing) {
    return {
      title: editing.title,
      booked_by: editing.booked_by,
      date: toLocalDay(editing.start) || date,
      start: toLocalTime(editing.start),
      end: toLocalTime(editing.end),
    }
  }
  return { title: '', booked_by: '', date, start: '', end: '' }
}

function computeErrors(values: FieldValues): FieldErrors {
  const errors: FieldErrors = {}

  if (!values.title.trim()) {
    errors.title = 'Bitte gib einen Titel an.'
  }
  if (!values.booked_by.trim()) {
    errors.booked_by = 'Bitte gib an, wer bucht.'
  }
  if (!values.date) {
    errors.date = 'Bitte wähle ein Datum.'
  } else if (!isValidDay(values.date)) {
    errors.date = 'Bitte wähle ein gültiges Datum.'
  }
  if (!values.start) {
    errors.start = 'Bitte gib eine Beginnzeit an.'
  }
  if (!values.end) {
    errors.end = 'Bitte gib eine Endzeit an.'
  }

  if (!errors.date && !errors.start && !errors.end) {
    const start = combine(values.date, values.start)
    const end = combine(values.date, values.end)
    if (start && end) {
      const minutes = (end.getTime() - start.getTime()) / 60000
      if (minutes <= 0) {
        errors.end = 'Das Ende muss nach dem Beginn liegen.'
      } else if (minutes > MAX_DURATION_MINUTES) {
        errors.end = 'Die Dauer darf höchstens 8 Stunden betragen.'
      }
    }
  }

  return errors
}

/** The backend reports the colliding booking inside `fields.start`. */
const CONFLICT_PATTERN =
  /#\s*(\d+)\s*[„"']([^"“”']+)[“"']\s*\(([^)]+?)\s+[-\u2013]\s+([^)]+?)\)/

/**
 * Build the ConflictBanner body from the server's overlap hint.
 *
 * The hint names the colliding booking's id, title and time range; the day's
 * already-loaded bookings are used to add the person who booked it.
 */
function describeConflict(error: ApiError, existingBookings: Booking[]): string {
  const raw = error.fields?.start ?? ''
  const match = CONFLICT_PATTERN.exec(raw)
  if (!match) {
    return raw || error.message
  }
  const id = Number(match[1])
  const title = match[2]
  const range = formatTimeRange(match[3].trim(), match[4].trim())
  const colliding = existingBookings.find((booking) => booking.id === id)
  return colliding
    ? `${title} — ${range}, gebucht von ${colliding.booked_by}`
    : `${title} — ${range}`
}

function AlertGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  )
}

interface FieldProps {
  id: string
  label: string
  error: string | undefined
  className?: string
  children: ReactNode
}

function Field({ id, label, error, className, children }: FieldProps) {
  return (
    <div className={className ? `field ${className}` : 'field'}>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      {children}
      {error ? (
        <div className="field-error" id={`${id}-error`}>
          <AlertGlyph />
          <span>{error}</span>
        </div>
      ) : null}
    </div>
  )
}

function ariaFor(id: string, invalid: boolean): { 'aria-invalid'?: boolean; 'aria-describedby'?: string } {
  return invalid ? { 'aria-invalid': true, 'aria-describedby': `${id}-error` } : {}
}

export default function BookingForm({
  room,
  date,
  editing = null,
  existingBookings = [],
  onSaved,
  onCancel,
}: BookingFormProps) {
  const mode: BookingFormMode = editing ? 'edit' : 'create'

  const [values, setValues] = useState<FieldValues>(() => initialValues(date, editing))
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [conflict, setConflict] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)

  const conflictRef = useRef<HTMLDivElement>(null)
  const errorRef = useRef<HTMLDivElement>(null)
  const editingId = editing?.id

  useEffect(() => {
    setValues(initialValues(date, editing))
    setTouched({})
    setSubmitted(false)
    setConflict(null)
    setErrorMessage(null)
    setErrorCode(null)
  }, [date, editingId])

  const errors = useMemo(() => computeErrors(values), [values])

  const showError = (field: FieldName): string | undefined =>
    touched[field] || submitted ? errors[field] : undefined

  const updateValue = (field: FieldName, value: string): void => {
    setValues((previous) => ({ ...previous, [field]: value }))
    setTouched((previous) => ({ ...previous, [field]: true }))
    setConflict(null)
    setErrorMessage(null)
    setErrorCode(null)
  }

  const blurField = (field: FieldName): void => {
    setTouched((previous) => ({ ...previous, [field]: true }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setSubmitted(true)
    setConflict(null)
    setErrorMessage(null)
    setErrorCode(null)

    if (Object.keys(computeErrors(values)).length > 0) {
      return
    }

    const start = combine(values.date, values.start)
    const end = combine(values.date, values.end)
    if (!start || !end) {
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        room_id: room.id,
        booked_by: values.booked_by.trim(),
        title: values.title.trim(),
        start: start.toISOString(),
        end: end.toISOString(),
      }
      const saved = editing
        ? await updateBooking(editing.id, payload)
        : await createBooking(payload)
      onSaved(saved, mode)
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === 'booking_overlap') {
        setConflict(describeConflict(cause, existingBookings))
        setErrorCode(cause.code)
        window.setTimeout(() => conflictRef.current?.focus(), 0)
      } else if (cause instanceof ApiError) {
        setErrorMessage(cause.message)
        setErrorCode(cause.code)
        window.setTimeout(() => errorRef.current?.focus(), 0)
      } else {
        setErrorMessage('Die Buchung konnte nicht gespeichert werden.')
        setErrorCode('unknown_error')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const titleError = showError('title')
  const bookedByError = showError('booked_by')
  const dateError = showError('date')
  const startError = showError('start')
  const endError = showError('end')

  return (
    <section aria-label="Buchungsformular" className="booking-form">
      <div className="booking-room-context" data-testid="booking-room-context">
        <div className="booking-room-context-head">
          <span className="booking-room-context-name">{room.name}</span>
          <span className="booking-room-context-seats">
            {room.seats === 1 ? '1 Platz' : `${room.seats} Plätze`}
          </span>
        </div>
        {room.amenities.length > 0 ? (
          <div className="booking-room-context-chips">
            {room.amenities.map((amenity) => (
              <span key={amenity} className="booking-chip">
                {amenity}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {conflict ? (
        <div
          className="banner banner-error"
          role="alert"
          tabIndex={-1}
          ref={conflictRef}
          data-testid="conflict-banner"
        >
          <div className="banner-title">Überschneidung mit bestehender Buchung</div>
          <div className="banner-body">{conflict}</div>
          <div className="banner-code">{errorCode ?? 'booking_overlap'}</div>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="banner banner-error" role="alert" tabIndex={-1} ref={errorRef}>
          <div className="banner-title">Buchung konnte nicht gespeichert werden.</div>
          <div className="banner-body">{errorMessage}</div>
          {errorCode ? <div className="banner-code">{errorCode}</div> : null}
        </div>
      ) : null}

      <form className="booking-form-fields" noValidate onSubmit={handleSubmit}>
        <div className="form-grid">
          <Field id="booking-title" label="Titel" error={titleError} className="field-span-2">
            <input
              id="booking-title"
              className="input"
              type="text"
              value={values.title}
              maxLength={TITLE_MAX_LENGTH}
              placeholder="z. B. Projektbesprechung"
              onChange={(event) => updateValue('title', event.target.value)}
              onBlur={() => blurField('title')}
              {...ariaFor('booking-title', Boolean(titleError))}
            />
            {values.title.length >= TITLE_MAX_LENGTH * 0.8 ? (
              <div className="char-counter">
                {values.title.length}/{TITLE_MAX_LENGTH}
              </div>
            ) : null}
          </Field>

          <Field id="booking-booked-by" label="Gebucht von" error={bookedByError}>
            <input
              id="booking-booked-by"
              className="input"
              type="text"
              value={values.booked_by}
              placeholder="Vor- und Nachname"
              onChange={(event) => updateValue('booked_by', event.target.value)}
              onBlur={() => blurField('booked_by')}
              {...ariaFor('booking-booked-by', Boolean(bookedByError))}
            />
          </Field>

          <Field id="booking-date" label="Datum" error={dateError}>
            <input
              id="booking-date"
              className="input"
              type="date"
              value={values.date}
              onChange={(event) => updateValue('date', event.target.value)}
              onBlur={() => blurField('date')}
              {...ariaFor('booking-date', Boolean(dateError))}
            />
            <p className="format-value" style={FORMAT_HINT_STYLE} data-testid="booking-date-value">
              {formatDate(values.date)}
            </p>
          </Field>

          <Field id="booking-start" label="Beginn" error={startError}>
            <input
              id="booking-start"
              className="input"
              type="time"
              value={values.start}
              onChange={(event) => updateValue('start', event.target.value)}
              onBlur={() => blurField('start')}
              {...ariaFor('booking-start', Boolean(startError))}
            />
            <p className="format-value" style={FORMAT_HINT_STYLE} data-testid="booking-start-value">
              {formatTimeValue(values.start)}
            </p>
          </Field>

          <Field id="booking-end" label="Ende" error={endError}>
            <input
              id="booking-end"
              className="input"
              type="time"
              value={values.end}
              onChange={(event) => updateValue('end', event.target.value)}
              onBlur={() => blurField('end')}
              {...ariaFor('booking-end', Boolean(endError))}
            />
            <p className="format-value" style={FORMAT_HINT_STYLE} data-testid="booking-end-value">
              {formatTimeValue(values.end)}
            </p>
          </Field>
        </div>

        <p className="period-summary" style={PERIOD_SUMMARY_STYLE} data-testid="booking-period-summary">
          {formatDateWithWeekday(values.date)}
          {values.start ? `, ${formatTimeValue(values.start)}` : ''}
          {values.start && values.end ? ` – ${formatTimeValue(values.end)}` : ''}
        </p>

        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            aria-busy={submitting}
          >
            {submitting ? (
              <span className="spinner" aria-hidden="true" />
            ) : mode === 'edit' ? (
              'Buchung speichern'
            ) : (
              'Buchung anlegen'
            )}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Abbrechen
          </button>
        </div>
      </form>
    </section>
  )
}
