import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AvailabilityForm from './AvailabilityForm'

describe('AvailabilityForm date and time display', () => {
  it('shows date and time values in the product format', () => {
    render(<AvailabilityForm onSearch={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Von (Datum)'), { target: { value: '2026-10-08' } })
    fireEvent.change(screen.getByLabelText('Bis (Datum)'), { target: { value: '2026-10-08' } })
    fireEvent.change(screen.getByLabelText('Bis (Zeit)'), { target: { value: '10:00' } })

    expect(screen.getByTestId('from-date-value')).toHaveTextContent('08.10.2026')
    expect(screen.getByTestId('from-time-value')).toHaveTextContent('09:00')
    expect(screen.getByTestId('to-date-value')).toHaveTextContent('08.10.2026')
    expect(screen.getByTestId('to-time-value')).toHaveTextContent('10:00')
  })

  it('summarises the period with weekday, date and 24h times', () => {
    render(<AvailabilityForm onSearch={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Von (Datum)'), { target: { value: '2026-10-08' } })
    fireEvent.change(screen.getByLabelText('Bis (Datum)'), { target: { value: '2026-10-08' } })
    fireEvent.change(screen.getByLabelText('Bis (Zeit)'), { target: { value: '10:00' } })

    const summary = screen.getByTestId('availability-period-summary')
    expect(summary).toHaveTextContent('08.10.2026, 09:00')
    expect(summary).toHaveTextContent('10:00')
    expect(summary).not.toHaveTextContent('AM')
    expect(summary).not.toHaveTextContent('PM')
  })
})
