import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useParams, useSearchParams } from 'react-router-dom'
import { ApiError, searchAvailableRooms } from '../api/client'
import type { Room } from '../types'
import RoomSearch from './RoomSearch'

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>()
  return { ...actual, searchAvailableRooms: vi.fn() }
})

const mockSearch = vi.mocked(searchAvailableRooms)

function DayViewProbe() {
  const params = useParams()
  const [searchParams] = useSearchParams()
  return (
    <div>
      Day view for room {params.id} on {searchParams.get('date')}
    </div>
  )
}

function renderSearch() {
  return render(
    <MemoryRouter initialEntries={['/search']}>
      <Routes>
        <Route path="/search" element={<RoomSearch />} />
        <Route path="/rooms/:id" element={<DayViewProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

function fillPeriod(from: string, to: string, startTime = '09:00', endTime = '10:00') {
  fireEvent.change(screen.getByLabelText('Von (Datum)'), { target: { value: from } })
  fireEvent.change(screen.getByLabelText('Von (Zeit)'), { target: { value: startTime } })
  fireEvent.change(screen.getByLabelText('Bis (Datum)'), { target: { value: to } })
  fireEvent.change(screen.getByLabelText('Bis (Zeit)'), { target: { value: endTime } })
}

const submitButton = () => screen.getByRole('button', { name: 'Freie Räume suchen' })

const alster: Room = {
  id: 1,
  name: 'Konferenzraum Alster',
  seats: 8,
  amenities: ['Beamer', 'Whiteboard'],
}

const elbe: Room = { id: 2, name: 'Konferenzraum Elbe', seats: 12, amenities: ['TV'] }

describe('RoomSearch', () => {
  beforeEach(() => {
    mockSearch.mockReset()
  })

  it('requests the chosen period, minimum seats and amenities', async () => {
    mockSearch.mockResolvedValue([])
    renderSearch()

    fillPeriod('2025-05-13', '2025-05-13', '09:00', '10:30')
    fireEvent.change(screen.getByLabelText('Mindestplätze'), { target: { value: '6' } })
    await userEvent.click(screen.getByRole('button', { name: 'Beamer' }))
    await userEvent.click(submitButton())

    await waitFor(() => expect(mockSearch).toHaveBeenCalledTimes(1))
    const call = mockSearch.mock.calls[0][0]
    expect(call.start).toContain('2025-05-13T09:00')
    expect(call.end).toContain('2025-05-13T10:30')
    expect(call.minSeats).toBe(6)
    expect(call.amenities).toEqual(['Beamer'])
  })

  it('shows a loading skeleton while the search is running', async () => {
    let resolveSearch: (rooms: Room[]) => void = () => {}
    mockSearch.mockReturnValue(
      new Promise<Room[]>((resolve) => {
        resolveSearch = resolve
      }),
    )
    renderSearch()

    await userEvent.click(submitButton())
    expect(screen.getByTestId('search-loading')).toBeInTheDocument()

    resolveSearch([])
    await waitFor(() =>
      expect(screen.queryByTestId('search-loading')).not.toBeInTheDocument(),
    )
  })

  it('renders the matching rooms as cards', async () => {
    mockSearch.mockResolvedValue([alster, elbe])
    renderSearch()

    await userEvent.click(submitButton())

    expect(await screen.findByText('Konferenzraum Alster')).toBeInTheDocument()
    expect(screen.getByText('Konferenzraum Elbe')).toBeInTheDocument()
    expect(screen.getByText('8 Plätze')).toBeInTheDocument()
    expect(screen.getByText('12 Plätze')).toBeInTheDocument()
  })

  it('explains an empty search result and suggests widening the period', async () => {
    mockSearch.mockResolvedValue([])
    renderSearch()

    await userEvent.click(submitButton())

    expect(await screen.findByText('Kein freier Raum in diesem Zeitraum.')).toBeInTheDocument()
    expect(screen.getByText(/größeren Zeitraum/)).toBeInTheDocument()
  })

  it('shows an error state with the error code and retries the search', async () => {
    mockSearch.mockRejectedValueOnce(
      new ApiError('validation_error', 'Start liegt nach Ende.', {}),
    )
    renderSearch()

    await userEvent.click(submitButton())

    expect(await screen.findByText('Daten konnten nicht geladen werden.')).toBeInTheDocument()
    expect(screen.getByText('Start liegt nach Ende.')).toBeInTheDocument()
    expect(screen.getByText('validation_error')).toBeInTheDocument()

    mockSearch.mockResolvedValueOnce([])
    await userEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }))

    await waitFor(() => expect(mockSearch).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('Kein freier Raum in diesem Zeitraum.')).toBeInTheDocument()
  })

  it('navigates to the day view of a result for the chosen day', async () => {
    mockSearch.mockResolvedValue([alster])
    renderSearch()

    fillPeriod('2025-05-13', '2025-05-13')
    await userEvent.click(submitButton())

    const link = await screen.findByRole('link', { name: /Konferenzraum Alster/ })
    expect(link).toHaveAttribute('href', '/rooms/1?date=2025-05-13')

    await userEvent.click(link)
    expect(await screen.findByText('Day view for room 1 on 2025-05-13')).toBeInTheDocument()
  })
})
