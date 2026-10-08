import { render, screen } from '@testing-library/react'
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
  }
})

const listBookings = vi.mocked(client.listBookings)
const getRoom = vi.mocked(client.getRoom)

const ROOM = {
  id: 1,
  name: 'Konferenzraum Alster',
  seats: 8,
  amenities: ['Beamer', 'Whiteboard'],
}

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

function renderDay(path = '/rooms/1?date=2025-05-12') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/rooms/:id" element={<RoomDay />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('RoomDay', () => {
  it('renders the chosen day in the URL and its bookings sorted by start', async () => {
    getRoom.mockResolvedValue(ROOM)
    listBookings.mockResolvedValue([
      booking(2, 'Kundengespräch', 'Markus Weber', localIso(2025, 5, 12, 11, 0), localIso(2025, 5, 12, 12, 0)),
      booking(1, 'Team-Standup', 'Lena Hoffmann', localIso(2025, 5, 12, 9, 0), localIso(2025, 5, 12, 10, 30)),
    ])

    renderDay()

    expect(await screen.findByRole('heading', { name: 'Konferenzraum Alster' })).toBeInTheDocument()
    expect(await screen.findByText('Team-Standup')).toBeInTheDocument()
    expect(screen.getByText('gebucht von Lena Hoffmann')).toBeInTheDocument()
    expect(screen.getByText('09:00\u201310:30')).toBeInTheDocument()
    expect(screen.getByText(/Mo, 12\.05\.2025/)).toBeInTheDocument()

    expect(listBookings).toHaveBeenCalledWith(
      expect.objectContaining({ roomId: 1, date: '2025-05-12' }),
    )

    const rows = screen.getAllByTestId('booking-row')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('Team-Standup')
    expect(rows[1]).toHaveTextContent('Kundengespräch')
  })

  it('loads another day when the next-day control is used', async () => {
    const user = userEvent.setup()
    getRoom.mockResolvedValue(ROOM)
    listBookings.mockImplementation((params) => {
      if (params?.date === '2025-05-13') {
        return Promise.resolve([
          booking(9, 'Onboarding 1:1', 'Tom Becker', localIso(2025, 5, 13, 16, 0), localIso(2025, 5, 13, 17, 0)),
        ])
      }
      return Promise.resolve([
        booking(1, 'Team-Standup', 'Lena Hoffmann', localIso(2025, 5, 12, 9, 0), localIso(2025, 5, 12, 10, 30)),
      ])
    })

    renderDay()

    expect(await screen.findByText('Team-Standup')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Nächster Tag' }))

    expect(await screen.findByText('Onboarding 1:1')).toBeInTheDocument()
    expect(screen.queryByText('Team-Standup')).not.toBeInTheDocument()
    expect(screen.getByText(/Di, 13\.05\.2025/)).toBeInTheDocument()
    expect(listBookings).toHaveBeenLastCalledWith(
      expect.objectContaining({ date: '2025-05-13' }),
    )
  })

  it('recognises a day without bookings as empty', async () => {
    getRoom.mockResolvedValue(ROOM)
    listBookings.mockResolvedValue([])

    renderDay('/rooms/1?date=2025-05-13')

    expect(await screen.findByText('An diesem Tag ist nichts gebucht.')).toBeInTheDocument()
    expect(listBookings).toHaveBeenCalledWith(
      expect.objectContaining({ roomId: 1, date: '2025-05-13' }),
    )
  })

  it('shows a booking-row skeleton while the day is loading', async () => {
    getRoom.mockResolvedValue(ROOM)
    let resolveBookings!: (value: Booking[]) => void
    listBookings.mockReturnValue(
      new Promise<Booking[]>((resolve) => {
        resolveBookings = resolve
      }),
    )

    renderDay()

    expect(screen.getByTestId('day-loading')).toBeInTheDocument()

    resolveBookings([])

    expect(await screen.findByText('An diesem Tag ist nichts gebucht.')).toBeInTheDocument()
  })

  it('shows the unified error state when the fetch fails', async () => {
    getRoom.mockResolvedValue(ROOM)
    listBookings.mockRejectedValue(
      new client.ApiError('network_error', 'Der Server ist nicht erreichbar.'),
    )

    renderDay()

    expect(await screen.findByText('Daten konnten nicht geladen werden.')).toBeInTheDocument()
    expect(screen.getByText('network_error')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Erneut versuchen' })).toBeInTheDocument()
  })

  it('renders the create-booking controls as working buttons', async () => {
    getRoom.mockResolvedValue(ROOM)
    listBookings.mockResolvedValue([])

    renderDay()

    await screen.findByText('An diesem Tag ist nichts gebucht.')
    const createButtons = screen.getAllByRole('button', { name: 'Buchung anlegen' })
    expect(createButtons.length).toBeGreaterThanOrEqual(1)
    for (const button of createButtons) {
      expect(button).toBeEnabled()
    }
  })
})
