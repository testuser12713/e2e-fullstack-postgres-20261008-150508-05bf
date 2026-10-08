import { useMemo } from 'react'

// The mockup (design/mockups/raeume.html, region filter-chips) fixes this chip set.
// Additional amenities found in the loaded rooms are appended after these.
export const DEFAULT_AMENITIES: string[] = [
  'Beamer',
  'Whiteboard',
  'Videokonferenz',
  'TV',
  'Monitor',
  'Telefonkonferenz',
  'Sofa',
  'Kaffeemaschine',
]

interface AmenityFilterProps {
  amenities: string[]
  selected: string[]
  onToggle: (amenity: string) => void
}

export default function AmenityFilter({ amenities, selected, onToggle }: AmenityFilterProps) {
  const chips = useMemo(() => {
    const seen = new Set(DEFAULT_AMENITIES)
    const extra: string[] = []
    for (const amenity of amenities) {
      if (amenity.length > 0 && !seen.has(amenity)) {
        seen.add(amenity)
        extra.push(amenity)
      }
    }
    return [...DEFAULT_AMENITIES, ...extra]
  }, [amenities])

  return (
    <div className="chips" role="group" aria-label="Ausstattungsfilter">
      {chips.map((amenity) => {
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
