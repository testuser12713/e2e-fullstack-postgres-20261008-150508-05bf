import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Room } from '../types'
import BookingForm from './BookingForm'

const room: Room = { id: 1, name: 'Konferenzraum Alster', seats: 4, amenities: [] }

describe('BookingForm date and time display', () => {
  it('shows date and time values in the product format', () => {
    render(
      <BookingForm room={room} date="2026-10-08" onSaved={vi.fn()} onCancel={vi.fn()} />,
    )

    fireEvent.change(screen.getByLabelText('Beginn'), { target: { value: '09:00' } })
    fireEvent.change(screen.getByLabelText('Ende'), { target: { value: '10:00' } })

    expect(screen.getByTestId('booking-date-value')).toHaveTextContent('08.10.2026')
    expect(screen.getByTestId('booking-start-value')).toHaveTextContent('09:00')
    expect(screen.getByTestId('booking-end-value')).toHaveTextContent('10:00')

    const summary = screen.getByTestId('booking-period-summary')
    expect(summary).toHaveTextContent('08.10.2026')
    expect(summary).toHaveTextContent('09:00')
    expect(summary).toHaveTextContent('10:00')
    expect(summary).not.toHaveTextContent('AM')
    expect(summary).not.toHaveTextContent('PM')
  })
})
