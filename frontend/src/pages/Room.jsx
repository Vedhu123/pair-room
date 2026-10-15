import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../services/api'
import { useCollabEditor } from '../editor/useCollabEditor'
import { useSession } from '../services/session'

export function Room() {
  const { id } = useParams()
  const { user } = useSession()
  const navigate = useNavigate()
  const [room, setRoom] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user === undefined) return
    if (!user) {
      sessionStorage.setItem('pair-next', `/room/${id}`)
      navigate('/', { replace: true })
      return
    }
    let cancelled = false
    api(`/api/rooms/${id}/join`, { method: 'POST' })
      .then((data) => {
        if (!cancelled) setRoom(data.room)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [user, id, navigate])

  useEffect(() => {
    if (room) {
      document.title = `${room.name} · Pair Room`
      sessionStorage.removeItem('pair-next')
    }
  }, [room])

  if (!user || (!room && !error)) return <p className="boot">Loading…</p>
  if (error) {
    return (
      <main className="missing">
        <h1>{error}</h1>
        <button type="button" className="primary" onClick={() => navigate('/rooms')}>Back to rooms</button>
      </main>
    )
  }

  return <RoomEditor room={room} user={user} />
}

function RoomEditor({ room, user }) {
  const navigate = useNavigate()
  const { parentRef, status, peers, language, setLanguage, ready } = useCollabEditor({
    roomId: room.id,
    user,
    initialLanguage: room.language
  })
  const [copied, setCopied] = useState(false)

  async function onLanguage(event) {
    const next = event.target.value
    setLanguage(next)
    try {
      await api(`/api/rooms/${room.id}`, { method: 'PATCH', body: { language: next } })
    } catch {
      /* The shared document still switches language for people in the room. */
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/room/${room.id}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const statusLabel = status === 'connected' ? 'Live' : status === 'disconnected' ? 'Reconnecting' : 'Connecting'

  return (
    <main className="room-shell">
      <header className="topbar room-bar">
        <button type="button" onClick={() => navigate('/rooms')}>Rooms</button>
        <h1>{room.name}</h1>
        <label className="language-pick">
          <span className="sr">Language</span>
          <select value={language} onChange={onLanguage} disabled={!ready}>
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
          </select>
        </label>
        <p className={`status status-${status}`}>{statusLabel}</p>
        <ul className="peers">
          {peers.map((peer) => (
            <li key={peer.clientId} style={{ '--peer': peer.color }}>
              <span className="dot" />
              {peer.name}{peer.self ? ' (you)' : ''}
            </li>
          ))}
        </ul>
        <button type="button" className="primary" onClick={copyLink}>{copied ? 'Copied' : 'Copy link'}</button>
      </header>
      <div className="editor-frame">
        <div ref={parentRef} className="editor-mount" />
        {!ready && <div className="editor-wait">Connecting to the room…</div>}
      </div>
      <footer className="room-foot">
        {status === 'connected'
          ? 'Changes are stored on the server.'
          : 'Reconnecting. Typing catches up when the link is back.'}
      </footer>
    </main>
  )
}
