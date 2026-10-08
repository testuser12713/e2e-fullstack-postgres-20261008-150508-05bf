import { NavLink } from 'react-router-dom'

interface NavEntry {
  to: string
  label: string
  end?: boolean
}

const entries: NavEntry[] = [
  { to: '/', label: 'Räume', end: true },
  { to: '/rooms/1', label: 'Tagesansicht' },
  { to: '/search', label: 'Freie Räume' },
]

export default function Nav() {
  return (
    <nav className="app-nav" aria-label="Hauptnavigation">
      <div className="app-nav__inner">
        <NavLink to="/" className="app-nav__brand" end>
          Raumbuchung
        </NavLink>
        <div className="app-nav__links">
          {entries.map((entry) => (
            <NavLink
              key={entry.to}
              to={entry.to}
              end={entry.end}
              className={({ isActive }) =>
                isActive ? 'app-nav__link app-nav__link--active' : 'app-nav__link'
              }
            >
              {entry.label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}
