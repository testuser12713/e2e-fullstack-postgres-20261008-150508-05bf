import { useCallback, useEffect, useState } from 'react'
import { ApiError, listBookings } from '../api/client'
import type { Booking } from '../types'

export interface UseRoomDayResult {
  bookings: Booking[]
  loading: boolean
  error: ApiError | null
  refetch: () => void
}

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error
  }
  return new ApiError(
    'unknown_error',
    'Die Buchungen konnten nicht geladen werden. Bitte spaeter erneut versuchen.',
  )
}

/**
 * Load the bookings of one room for one local calendar day.
 *
 * The day is expressed as an ISO date (`YYYY-MM-DD`) and translated against the
 * browser's current UTC offset, so the API returns exactly the bookings that
 * touch that local day. The result is sorted by start time ascending.
 */
export function useRoomDay(roomId: number | undefined, date: string): UseRoomDayResult {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(roomId !== undefined)
  const [error, setError] = useState<ApiError | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    if (roomId === undefined || Number.isNaN(roomId) || !date) {
      setBookings([])
      setLoading(false)
      setError(null)
      return
    }

    let active = true
    setLoading(true)
    setError(null)

    const utcOffsetMinutes = -new Date().getTimezoneOffset()

    listBookings({ roomId, date, utcOffsetMinutes })
      .then((result) => {
        if (!active) {
          return
        }
        const sorted = [...result].sort(
          (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
        )
        setBookings(sorted)
        setLoading(false)
      })
      .catch((cause: unknown) => {
        if (!active) {
          return
        }
        setBookings([])
        setError(toApiError(cause))
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [roomId, date, reloadToken])

  const refetch = useCallback(() => {
    setReloadToken((token) => token + 1)
  }, [])

  return { bookings, loading, error, refetch }
}

export default useRoomDay
