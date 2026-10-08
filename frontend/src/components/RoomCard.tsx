import { Link } from 'react-router-dom'
import type { Room } from '../types'

interface RoomCardProps {
  room: Room
}

function seatLabel(seats: number): string {
  return `${seats} ${seats === 1 ? 'Platz' : 'Plätze'}`
}

export default function RoomCard({ room }: RoomCardProps) {
  return (
    <Link className="room-card" to={`/rooms/${room.id}`}>
      <span className="room-card-head">
        <span className="room-card-name">{room.name}</span>
        <span className="room-card-seats">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 9v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9" />
            <path d="M4 9V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2" />
            <path d="M2 13h20" />
          </svg>
          {seatLabel(room.seats)}
        </span>
      </span>
      {room.amenities.length > 0 && (
        <span className="chips">
          {room.amenities.map((amenity) => (
            <span key={amenity} className="chip is-readonly">
              {amenity}
            </span>
          ))}
        </span>
      )}
    </Link>
  )
}
