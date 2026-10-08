import { Route, Routes } from 'react-router-dom'
import Nav from './components/Nav'
import RoomList from './pages/RoomList'
import RoomDay from './pages/RoomDay'
import RoomSearch from './pages/RoomSearch'

export default function App() {
  return (
    <div className="app-shell">
      <Nav />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<RoomList />} />
          <Route path="/rooms/:id" element={<RoomDay />} />
          <Route path="/search" element={<RoomSearch />} />
        </Routes>
      </main>
    </div>
  )
}
