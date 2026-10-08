import type { Booking } from '../types'

export interface BookingActionsProps {
  booking: Booking
  disabled: boolean
  onEdit: (booking: Booking) => void
  onDelete: (booking: Booking) => void
}

const PAST_TOOLTIP = 'Vergangene Buchungen lassen sich nicht aendern'

function EditIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

function DeleteIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  )
}

/**
 * Edit / delete controls for one day-view booking.
 *
 * A booking whose start has been reached is locked by the API (AC-09), so the
 * controls are rendered visibly disabled together with the 'Vergangenheit'
 * badge instead of silently failing on click.
 */
export default function BookingActions({
  booking,
  disabled,
  onEdit,
  onDelete,
}: BookingActionsProps) {
  const tooltip = disabled ? PAST_TOOLTIP : undefined

  return (
    <div className="booking-actions">
      {disabled ? <span className="pill pill-past">Vergangenheit</span> : null}
      <button
        type="button"
        className="btn btn-ghost btn-icon"
        aria-label={`Buchung bearbeiten: ${booking.title}`}
        title={tooltip}
        disabled={disabled}
        aria-disabled={disabled}
        onClick={() => onEdit(booking)}
      >
        <EditIcon />
      </button>
      <button
        type="button"
        className="btn btn-danger btn-icon"
        aria-label={`Buchung löschen: ${booking.title}`}
        title={tooltip}
        disabled={disabled}
        aria-disabled={disabled}
        onClick={() => onDelete(booking)}
      >
        <DeleteIcon />
      </button>
    </div>
  )
}
