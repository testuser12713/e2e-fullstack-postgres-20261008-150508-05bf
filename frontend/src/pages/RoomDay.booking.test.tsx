import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as client from '../api/client'
import type { Booking } from '../types'
import RoomDay from './RoomDay'

vi.mock('../api/client', () => {
  class MockApiError extends Error {
    code: string
    fields: Record<string, string>

    constructor(code: string, message: string, fields: Record<string, string> = {}) {
      super(message)
      this.name = 'ApiError'
      this.code = code
      this.fields = fields
    }
  }

  return {
    ApiError: MockApiError,
    listBookings: vi.fn(),
    getRoom: vi.fn(),
    createBooking: vi.fn(),
    updateBooking: vi.fn(),
    deleteBooking: vi.fn(),
  }
})

const listBookings = vi.mocked(client.listBookings)
const getRoom = vi.mocked(client.getRoom)
const createBooking = vi.mocked(client.createBooking)

const ROOM = {
  id: 1,
  name: 'Konferenzraum Alster',
  seats: 8,
  amenities: ['Beamer', 'Whiteboard'],
}

const DAY = '2030-01-15'

/** An ISO timestamp that renders back to the given local wall-clock time. */
function localIso(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): string {
  return new Date(year, month - 1, day, hour, minute).toISOString()
}

function booking(
  id: number,
  title: string,
  bookedBy: string,
  start: string,
  end: string,
): Booking {
  return { id, room_id: 1, title, booked_by: bookedBy, start, end }
}

function renderDay(path = `/rooms/1?date=${DAY}`) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/rooms/:id" element={<RoomDay />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function openCreateForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getAllByRole('button', { name: 'Buchung anlegen' })[0])
  expect(await screen.findByRole('heading', { name: 'Buchung anlegen' })).toBeInTheDocument()
}

beforeEach(() => {
  vi.clearAllMocks()
  getRoom.mockResolvedValue(ROOM)
})

describe('RoomDay booking form', () => {
  it('starts without error marks and validates required fields on submit', async () => {
    const user = userEvent.setup()
    listBookings.mockResolvedValue([])
    renderDay()

    await screen.findByText('An diesem Tag ist nichts gebucht.')
    await openCreateForm(user)

    // untouched, empty form: no error marks
    expect(screen.queryByText('Bitte gib einen Titel an.')).not.toBeInTheDocument()
    expect(screen.queryByText('Bitte gib an, wer bucht.')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Buchung anlegen' }))

    expect(await screen.findByText('Bitte gib einen Titel an.')).toBeInTheDocument()
    expect(screen.getByText('Bitte gib an, wer bucht.')).toBeInTheDocument()
    expect(screen.getByText('Bitte gib eine Beginnzeit an.')).toBeInTheDocument()
    expect(screen.getByText('Bitte gib eine Endzeit an.')).toBeInTheDocument()
    expect(createBooking).not.toHaveBeenCalled()
  })

  it('rejects an end before the start and a duration over 8 hours', async () => {
    const user = userEvent.setup()
    listBookings.mockResolvedValue([])
    renderDay()

    await screen.findByText('An diesem Tag ist nichts gebucht.')
    await openCreateForm(user)

    fireEvent.change(screen.getByLabelText('Beginn'), { target: { value: '10:00' } })
    fireEvent.change(screen.getByLabelText('Ende'), { target: { value: '09:00' } })

    expect(await screen.findByText('Das Ende muss nach dem Beginn liegen.')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Ende'), { target: { value: '19:00' } })

    expect(
      await screen.findByText('Die Dauer darf höchstens 8 Stunden betragen.'),
    ).toBeInTheDocument()
    expect(createBooking).not.toHaveBeenCalled()
  })

  it('shows the colliding booking and keeps the entered values on a 409', async () => {
    const user = userEvent.setup()
    const colliding = booking(
      5,
      'Team-Standup',
      'Lena Hoffmann',
      localIso(2030, 1, 15, 9, 0),
      localIso(2030, 1, 15, 10, 30),
    )
    listBookings.mockResolvedValue([colliding])
    createBooking.mockRejectedValue(
      new client.ApiError(
        'booking_overlap',
        'Die Buchung überschneidet sich mit einer bestehenden Buchung.',
        {
          start:
            'Überschneidung mit Buchung #5 „Team-Standup“ (2030-01-15T08:00:00+00:00 - 2030-01-15T09:30:00+00:00).',
        },
      ),
    )

    renderDay()
    await screen.findByText('Team-Standup')

    await openCreateForm(user)
    await user.type(screen.getByLabelText('Titel'), 'Projektbesprechung')
    await user.type(screen.getByLabelText('Gebucht von'), 'Max Mustermann')
    fireEvent.change(screen.getByLabelText('Beginn'), { target: { value: '09:00' } })
    fireEvent.change(screen.getByLabelText('Ende'), { target: { value: '10:00' } })

    await user.click(screen.getByRole('button', { name: 'Buchung anlegen' }))

    expect(
      await screen.findByText('Überschneidung mit bestehender Buchung'),
    ).toBeInTheDocument()
    expect(screen.getByText(/Team-Standup/)).toBeInTheDocument()
    expect(screen.getByText(/gebucht von Lena Hoffmann/)).toBeInTheDocument()

    // entered values stay in the fields while the banner is visible
    expect(screen.getByLabelText('Titel')).toHaveValue('Projektbesprechung')
    expect(screen.getByLabelText('Gebucht von')).toHaveValue('Max Mustermann')
  })

  it('refetches and shows the new booking in the day view after a successful create', async () => {
    const user = userEvent.setup()
    const created = booking(
      42,
      'Projektbesprechung',
      'Max Mustermann',
      localIso(2030, 1, 15, 9, 0),
      localIso(2030, 1, 15, 10, 0),
    )
    listBookings.mockResolvedValueOnce([]).mockResolvedValue([created])
    createBooking.mockResolvedValue(created)

    renderDay()
    await screen.findByText('An diesem Tag ist nichts gebucht.')

    await openCreateForm(user)
    await user.type(screen.getByLabelText('Titel'), 'Projektbesprechung')
    await user.type(screen.getByLabelText('Gebucht von'), 'Max Mustermann')
    fireEvent.change(screen.getByLabelText('Beginn'), { target: { value: '09:00' } })
    fireEvent.change(screen.getByLabelText('Ende'), { target: { value: '10:00' } })

    await user.click(screen.getByRole('button', { name: 'Buchung anlegen' }))

    expect(await screen.findByText('Buchung angelegt')).toBeInTheDocument()
    expect(await screen.findByTestId('booking-row')).toHaveTextContent('Projektbesprechung')

    expect(createBooking).toHaveBeenCalledTimes(1)
    const payload = createBooking.mock.calls[0][0]
    expect(payload).toMatchObject({
      room_id: 1,
      title: 'Projektbesprechung',
      booked_by: 'Max Mustermann',
    })
    expect(payload.start).toBeTruthy()
    expect(payload.end).toBeTruthy()
    expect(listBookings).toHaveBeenCalledTimes(2)
  })

  it('renders edit and delete controls visibly disabled for a booking that already started', async () => {
    listBookings.mockResolvedValue([
      booking(7, 'Altes Meeting', 'Anna Alt', localIso(2020, 1, 15, 9, 0), localIso(2020, 1, 15, 10, 0)),
    ])

    renderDay('/rooms/1?date=2020-01-15')

    expect(await screen.findByText('Altes Meeting')).toBeInTheDocument()
    expect(screen.getByText('Vergangenheit')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Buchung bearbeiten/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Buchung löschen/i })).toBeDisabled()
  })
})
