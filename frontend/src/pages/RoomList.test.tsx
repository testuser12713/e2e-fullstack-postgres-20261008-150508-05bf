import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listRooms } from '../api/client'
import type { Room } from '../types'
import RoomList from './RoomList'

vi.mock('../api/client', () => ({
  listRooms: vi.fn(),
}))

const mockedListRooms = vi.mocked(listRooms)

const rooms: Room[] = [
  {
    id: 1,
    name: 'Konferenzraum Alster',
    seats: 8,
    amenities: ['Beamer', 'Whiteboard', 'Videokonferenz'],
  },
  {
    id: 2,
    name: 'Konferenzraum Elbe',
    seats: 12,
    amenities: ['Beamer', 'Whiteboard', 'Videokonferenz', 'TV'],
  },
  {
    id: 3,
    name: 'Besprechungsraum Binnen',
    seats: 6,
    amenities: ['Whiteboard', 'Telefonkonferenz'],
  },
  {
    id: 4,
    name: 'Fokusraum Nord',
    seats: 2,
    amenities: ['Monitor'],
  },
]

function renderRoomList() {
  return render(
    <MemoryRouter>
      <RoomList />
    </MemoryRouter>,
  )
}

describe('RoomList', () => {
  beforeEach(() => {
    mockedListRooms.mockReset()
    mockedListRooms.mockResolvedValue(rooms)
  })

  it('renders every room from the API with name, seats and amenities', async () => {
    renderRoomList()

    expect(await screen.findByText('Konferenzraum Alster')).toBeInTheDocument()
    expect(screen.getByText('Konferenzraum Elbe')).toBeInTheDocument()
    expect(screen.getByText('Besprechungsraum Binnen')).toBeInTheDocument()
    expect(screen.getByText('Fokusraum Nord')).toBeInTheDocument()

    expect(screen.getByText('8 Plätze')).toBeInTheDocument()
    expect(screen.getByText('12 Plätze')).toBeInTheDocument()
    expect(screen.queryByText('1 Platz')).not.toBeInTheDocument()

    const alster = screen.getByRole('link', { name: /Konferenzraum Alster/ })
    expect(within(alster).getByText('Beamer')).toBeInTheDocument()
    expect(within(alster).getByText('Whiteboard')).toBeInTheDocument()
    expect(within(alster).getByText('Videokonferenz')).toBeInTheDocument()
  })

  it('shows a room-list shaped loading skeleton while the rooms are being fetched', () => {
    mockedListRooms.mockReturnValue(new Promise(() => {}))
    renderRoomList()

    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true')
  })

  it('narrows the list immediately when a filter chip is toggled', async () => {
    const user = userEvent.setup()
    renderRoomList()

    expect(await screen.findByRole('link', { name: /Konferenzraum Alster/ })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'TV' }))

    expect(screen.queryByRole('link', { name: /Konferenzraum Alster/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Fokusraum Nord/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Konferenzraum Elbe/ })).toBeInTheDocument()
  })

  it('combines several chips as AND', async () => {
    const user = userEvent.setup()
    renderRoomList()

    await screen.findByRole('link', { name: /Konferenzraum Elbe/ })

    await user.click(screen.getByRole('button', { name: 'Whiteboard' }))
    await user.click(screen.getByRole('button', { name: 'TV' }))

    expect(screen.queryByRole('link', { name: /Konferenzraum Alster/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Besprechungsraum Binnen/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Konferenzraum Elbe/ })).toBeInTheDocument()
  })

  it('explains an empty filter result and offers a reset', async () => {
    const user = userEvent.setup()
    renderRoomList()

    await screen.findByRole('link', { name: /Konferenzraum Alster/ })

    await user.click(screen.getByRole('button', { name: 'Beamer' }))
    await user.click(screen.getByRole('button', { name: 'Monitor' }))

    expect(screen.getByText('Kein Raum passt zu dieser Ausstattung.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Konferenzraum Alster/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Filter zurücksetzen' }))

    expect(screen.getByRole('link', { name: /Konferenzraum Alster/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Fokusraum Nord/ })).toBeInTheDocument()
  })

  it('shows an explained error state with a retry when the fetch fails', async () => {
    const user = userEvent.setup()
    mockedListRooms.mockRejectedValueOnce({ code: 'network_error', message: 'Server nicht erreichbar.' })
    renderRoomList()

    expect(await screen.findByText('Daten konnten nicht geladen werden.')).toBeInTheDocument()
    expect(screen.getByText('network_error')).toBeInTheDocument()

    mockedListRooms.mockResolvedValueOnce(rooms)
    await user.click(screen.getByRole('button', { name: 'Erneut versuchen' }))

    expect(await screen.findByText('Konferenzraum Alster')).toBeInTheDocument()
  })
})
