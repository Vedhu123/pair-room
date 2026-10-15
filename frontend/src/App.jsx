import { Navigate, Route, Routes } from 'react-router-dom'
import { SessionProvider } from './services/session'
import { Auth } from './pages/Auth'
import { Lobby } from './pages/Lobby'
import { Room } from './pages/Room'

export function App() {
  return (
    <SessionProvider>
      <Routes>
        <Route path="/" element={<Auth />} />
        <Route path="/rooms" element={<Lobby />} />
        <Route path="/room/:id" element={<Room />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SessionProvider>
  )
}
