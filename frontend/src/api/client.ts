import type { ApiErrorBody, Booking, Room } from '../types'

export class ApiError extends Error {
  code: string
  fields: Record<string, string>

  constructor(code: string, message: string, fields: Record<string, string> = {}) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.fields = fields
  }
}

export type BookingInput = Omit<Booking, 'id'>

export interface BookingListParams {
  roomId?: number
  date?: string
  utcOffsetMinutes?: number
}

export interface AvailabilitySearchParams {
  start: string
  end: string
  minSeats?: number
  amenities?: string[]
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
      ...init,
    })
  } catch {
    throw new ApiError(
      'network_error',
      'Der Server ist nicht erreichbar. Bitte spaeter erneut versuchen.',
    )
  }

  if (response.status === 204) {
    return undefined as T
  }

  const text = await response.text()
  let payload: unknown
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = undefined
    }
  }

  if (!response.ok) {
    const body = payload as ApiErrorBody | undefined
    throw new ApiError(
      body?.error?.code ?? 'unknown_error',
      body?.error?.message ?? `Die Anfrage ist fehlgeschlagen (HTTP ${response.status}).`,
      body?.error?.fields ?? {},
    )
  }

  return payload as T
}

export function listRooms(): Promise<Room[]> {
  return request<Room[]>('/api/rooms')
}

export function getRoom(id: number): Promise<Room> {
  return request<Room>(`/api/rooms/${id}`)
}

export function listBookings(params: BookingListParams = {}): Promise<Booking[]> {
  const query = new URLSearchParams()
  if (params.roomId !== undefined) query.set('room_id', String(params.roomId))
  if (params.date !== undefined) query.set('date', params.date)
  if (params.utcOffsetMinutes !== undefined) {
    query.set('utc_offset_minutes', String(params.utcOffsetMinutes))
  }
  const suffix = query.toString()
  return request<Booking[]>(`/api/bookings${suffix ? `?${suffix}` : ''}`)
}

export function createBooking(payload: BookingInput): Promise<Booking> {
  return request<Booking>('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateBooking(id: number, payload: BookingInput): Promise<Booking> {
  return request<Booking>(`/api/bookings/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteBooking(id: number): Promise<void> {
  return request<void>(`/api/bookings/${id}`, { method: 'DELETE' })
}

export function searchAvailableRooms(params: AvailabilitySearchParams): Promise<Room[]> {
  const query = new URLSearchParams()
  query.set('start', params.start)
  query.set('end', params.end)
  if (params.minSeats !== undefined) query.set('min_seats', String(params.minSeats))
  for (const amenity of params.amenities ?? []) {
    query.append('amenities', amenity)
  }
  return request<Room[]>(`/api/availability?${query.toString()}`)
}
