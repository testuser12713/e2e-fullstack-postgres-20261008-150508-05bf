interface AmenityFilterProps {
  amenities: string[]
  selected: string[]
  onToggle: (amenity: string) => void
}

export default function AmenityFilter({ amenities, selected, onToggle }: AmenityFilterProps) {
  if (amenities.length === 0) {
    return null
  }

  return (
    <div className="chips" role="group" aria-label="Ausstattungsfilter">
      {amenities.map((amenity) => {
        const active = selected.includes(amenity)
        return (
          <button
            key={amenity}
            type="button"
            className="chip"
            aria-pressed={active}
            onClick={() => onToggle(amenity)}
          >
            <span className="chip-check" aria-hidden="true">
              ✓
            </span>
            {amenity}
          </button>
        )
      })}
    </div>
  )
}
