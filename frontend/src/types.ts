export interface Room {
  id: number
  name: string
  seats: number
  amenities: string[]
}

export interface Booking {
  id: number
  room_id: number
  booked_by: string
  title: string
  start: string
  end: string
}

export interface ApiErrorBody {
  error: {
    code: string
    message: string
    fields: Record<string, string>
  }
}
