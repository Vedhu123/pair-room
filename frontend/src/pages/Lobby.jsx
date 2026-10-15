import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { useSession } from '../services/session'

function formatTime(iso) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

export function Lobby() {
  const { user, logout } = useSession()
  const navigate = useNavigate()
  const [rooms, setRooms] = useState([])
  const [name, setName] = useState('')
  const [language, setLanguage] = useState('javascript')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState('')

  useEffect(() => {
    document.title = 'Rooms · Pair Room'
    sessionStorage.removeItem('pair-next')
  }, [])

  useEffect(() => {
    if (user === undefined) return
    if (!user) {
      navigate('/', { replace: true })
      return
    }
    api('/api/rooms').then((data) => setRooms(data.rooms)).catch((err) => setError(err.message))
  }, [user, navigate])

  async function onCreate(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const data = await api('/api/rooms', { method: 'POST', body: { name, language } })
      navigate(`/room/${data.room.id}`)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  async function copyLink(id) {
    await navigator.clipboard.writeText(`${window.location.origin}/room/${id}`)
    setCopied(id)
    setTimeout(() => setCopied(''), 2000)
  }

  async function onLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  if (!user) return <p className="boot">Loading…</p>

  return (
    <main className="lobby">
      <header className="topbar">
        <strong>Pair Room</strong>
        <div className="topbar-actions">
          <span>{user.name}</span>
          <button type="button" onClick={onLogout}>Log out</button>
        </div>
      </header>
      <section className="lobby-body">
        <div className="section-head">
          <h1>Your rooms</h1>
          <p>Open a room in two windows to see both cursors.</p>
        </div>
        <form className="create-room" onSubmit={onCreate}>
          <label>
            Room name
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={60} required placeholder="Interview practice" />
          </label>
          <label>
            Language
            <select value={language} onChange={(event) => setLanguage(event.target.value)}>
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
            </select>
          </label>
          <button className="primary" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create room'}</button>
        </form>
        {error && <p className="form-error" role="alert">{error}</p>}
        {rooms.length === 0 ? (
          <p className="empty">No rooms yet. Create one, then send the link to the other person.</p>
        ) : (
          <ul className="room-list">
            {rooms.map((room) => (
              <li key={room.id}>
                <div>
                  <h2>{room.name}</h2>
                  <p>{room.language === 'python' ? 'Python' : 'JavaScript'} · {room.role === 'owner' ? 'Owner' : 'Joined'} · {formatTime(room.updatedAt)}</p>
                </div>
                <div className="row-actions">
                  <button type="button" onClick={() => copyLink(room.id)}>{copied === room.id ? 'Copied' : 'Copy link'}</button>
                  <button type="button" className="primary" onClick={() => navigate(`/room/${room.id}`)}>Open</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
