import { useId, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'

export interface AvailabilitySearchInput {
  start: string
  end: string
  minSeats: number
  amenities: string[]
  date: string
}

export const AVAILABILITY_AMENITIES = [
  'Beamer',
  'Whiteboard',
  'Videokonferenz',
  'TV',
  'Monitor',
] as const

interface AvailabilityFormProps {
  onSearch: (input: AvailabilitySearchInput) => void
  busy?: boolean
}

interface FormValues {
  fromDate: string
  fromTime: string
  toDate: string
  toTime: string
  minSeats: string
}

interface FormErrors {
  start?: string
  end?: string
  seats?: string
}

type ValueKey = keyof FormValues

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function todayIso(): string {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function toIsoWithOffset(date: string, time: string): string {
  const [year, month, day] = date.split('-').map(Number)
  const [hours, minutes] = time.split(':').map(Number)
  const local = new Date(year, month - 1, day, hours, minutes, 0, 0)
  const offsetMinutes = -local.getTimezoneOffset()
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMinutes)
  return `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00${sign}${pad(
    Math.floor(abs / 60),
  )}:${pad(abs % 60)}`
}

export function validateAvailability(values: FormValues): FormErrors {
  const errors: FormErrors = {}
  if (!values.fromDate || !values.fromTime) {
    errors.start = 'Bitte gib Beginn und Ende an.'
  }
  if (!values.toDate || !values.toTime) {
    errors.end = 'Bitte gib Beginn und Ende an.'
  }
  if (!values.fromDate || !values.fromTime || !values.toDate || !values.toTime) {
    return errors
  }
  const start = new Date(toIsoWithOffset(values.fromDate, values.fromTime))
  const end = new Date(toIsoWithOffset(values.toDate, values.toTime))
  if (end.getTime() <= start.getTime()) {
    errors.end = 'Das Ende muss nach dem Beginn liegen.'
  } else if (end.getTime() - start.getTime() > 8 * 60 * 60 * 1000) {
    errors.end = 'Die Dauer darf höchstens 8 Stunden betragen.'
  }
  if (values.minSeats !== '') {
    const seats = Number(values.minSeats)
    if (!Number.isInteger(seats) || seats < 1) {
      errors.seats = 'Mindestens 1 Platz.'
    }
  }
  return errors
}

function AlertIcon() {
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
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

export default function AvailabilityForm({ onSearch, busy = false }: AvailabilityFormProps) {
  const uid = useId()
  const [values, setValues] = useState<FormValues>(() => ({
    fromDate: todayIso(),
    fromTime: '09:00',
    toDate: todayIso(),
    toTime: '10:00',
    minSeats: '1',
  }))
  const [amenities, setAmenities] = useState<string[]>([])
  const [touched, setTouched] = useState<Record<ValueKey, boolean>>({
    fromDate: false,
    fromTime: false,
    toDate: false,
    toTime: false,
    minSeats: false,
  })
  const [submitted, setSubmitted] = useState(false)

  const errors = validateAvailability(values)
  const show = (key: keyof FormErrors, fields: ValueKey[]): string | undefined => {
    const revealed = submitted || fields.some((field) => touched[field])
    return revealed ? errors[key] : undefined
  }

  const startError = show('start', ['fromDate', 'fromTime'])
  const endError = show('end', ['toDate', 'toTime'])
  const seatsError = show('seats', ['minSeats'])

  const update = (key: ValueKey) => (event: ChangeEvent<HTMLInputElement>) => {
    setValues((current) => ({ ...current, [key]: event.target.value }))
  }

  const markTouched = (key: ValueKey) => () => {
    setTouched((current) => ({ ...current, [key]: true }))
  }

  const toggleAmenity = (amenity: string) => {
    setAmenities((current) =>
      current.includes(amenity) ? current.filter((item) => item !== amenity) : [...current, amenity],
    )
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitted(true)
    if (Object.keys(validateAvailability(values)).length > 0) {
      return
    }
    onSearch({
      start: toIsoWithOffset(values.fromDate, values.fromTime),
      end: toIsoWithOffset(values.toDate, values.toTime),
      minSeats: values.minSeats === '' ? 1 : Number(values.minSeats),
      amenities,
      date: values.fromDate,
    })
  }

  return (
    <section aria-label="Suchkriterien">
      <div className="rs-card">
        <form noValidate onSubmit={handleSubmit}>
          <div className="rs-grid">
            <div className="rs-field">
              <label className="rs-label" htmlFor={`${uid}-from-date`}>
                Von (Datum)
              </label>
              <input
                id={`${uid}-from-date`}
                className="rs-input"
                type="date"
                value={values.fromDate}
                onChange={update('fromDate')}
                onBlur={markTouched('fromDate')}
                aria-invalid={startError ? true : undefined}
                aria-describedby={startError ? `${uid}-start-error` : undefined}
              />
            </div>

            <div className="rs-field">
              <label className="rs-label" htmlFor={`${uid}-from-time`}>
                Von (Zeit)
              </label>
              <input
                id={`${uid}-from-time`}
                className="rs-input"
                type="time"
                value={values.fromTime}
                onChange={update('fromTime')}
                onBlur={markTouched('fromTime')}
                aria-invalid={startError ? true : undefined}
                aria-describedby={startError ? `${uid}-start-error` : undefined}
              />
              {startError ? (
                <p className="rs-field-error" id={`${uid}-start-error`} role="alert">
                  <AlertIcon />
                  {startError}
                </p>
              ) : null}
            </div>

            <div className="rs-field">
              <label className="rs-label" htmlFor={`${uid}-to-date`}>
                Bis (Datum)
              </label>
              <input
                id={`${uid}-to-date`}
                className="rs-input"
                type="date"
                value={values.toDate}
                onChange={update('toDate')}
                onBlur={markTouched('toDate')}
                aria-invalid={endError ? true : undefined}
                aria-describedby={endError ? `${uid}-end-error` : undefined}
              />
            </div>

            <div className="rs-field">
              <label className="rs-label" htmlFor={`${uid}-to-time`}>
                Bis (Zeit)
              </label>
              <input
                id={`${uid}-to-time`}
                className="rs-input"
                type="time"
                value={values.toTime}
                onChange={update('toTime')}
                onBlur={markTouched('toTime')}
                aria-invalid={endError ? true : undefined}
                aria-describedby={endError ? `${uid}-end-error` : undefined}
              />
              {endError ? (
                <p className="rs-field-error" id={`${uid}-end-error`} role="alert">
                  <AlertIcon />
                  {endError}
                </p>
              ) : null}
            </div>

            <div className="rs-field">
              <label className="rs-label" htmlFor={`${uid}-min-seats`}>
                Mindestplätze
              </label>
              <input
                id={`${uid}-min-seats`}
                className="rs-input"
                type="number"
                min={1}
                step={1}
                value={values.minSeats}
                onChange={update('minSeats')}
                onBlur={markTouched('minSeats')}
                aria-invalid={seatsError ? true : undefined}
                aria-describedby={seatsError ? `${uid}-seats-error` : undefined}
              />
              {seatsError ? (
                <p className="rs-field-error" id={`${uid}-seats-error`} role="alert">
                  <AlertIcon />
                  {seatsError}
                </p>
              ) : null}
            </div>

            <div className="rs-field rs-field-span-2">
              <span className="rs-label" id={`${uid}-equipment-label`}>
                Ausstattung
              </span>
              <div className="rs-chips" role="group" aria-labelledby={`${uid}-equipment-label`}>
                {AVAILABILITY_AMENITIES.map((amenity) => {
                  const selected = amenities.includes(amenity)
                  return (
                    <button
                      key={amenity}
                      type="button"
                      className="rs-chip"
                      aria-pressed={selected}
                      onClick={() => toggleAmenity(amenity)}
                    >
                      <span className="rs-chip-check" aria-hidden="true">
                        ✓
                      </span>
                      {amenity}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="rs-field rs-field-submit">
              <span className="rs-label rs-label-spacer" aria-hidden="true">
                &nbsp;
              </span>
              <button
                type="submit"
                className="rs-btn rs-btn-primary"
                disabled={busy}
                aria-busy={busy ? true : undefined}
              >
                {busy ? <span className="rs-spinner" aria-hidden="true" /> : null}
                Freie Räume suchen
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  )
}
