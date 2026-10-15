import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { safeNext } from '../services/paths'
import { useSession } from '../services/session'

export function Auth() {
  const { user, setUser } = useSession()
  const navigate = useNavigate()
  const [mode, setMode] = useState('register')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user) return
    navigate(safeNext(sessionStorage.getItem('pair-next')), { replace: true })
  }, [user, navigate])

  useEffect(() => {
    document.title = 'Pair Room'
  }, [])

  async function onSubmit(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const body = mode === 'register' ? { name, email, password } : { email, password }
      const data = await api(mode === 'register' ? '/api/register' : '/api/login', {
        method: 'POST',
        body
      })
      setUser(data.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (user === undefined) return <p className="boot">Loading…</p>
  if (user) return <p className="boot">Opening your rooms…</p>

  return (
    <main className="auth-layout">
      <section className="auth-story">
        <p className="eyebrow">Collaborative editor</p>
        <h1>Pair Room</h1>
        <p>Two people edit one file. Cursors stay visible, and the code is still there after a refresh.</p>
        <ol>
          <li>Create a room and share the link.</li>
          <li>Type together without overwriting each other.</li>
          <li>Come back later. The document was saved.</li>
        </ol>
      </section>
      <section className="auth-card">
        <h2>{mode === 'register' ? 'Create an account' : 'Log in'}</h2>
        <form onSubmit={onSubmit}>
          {mode === 'register' && (
            <label>
              Name
              <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required maxLength={40} />
            </label>
          )}
          <label>
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              minLength={8}
              required
            />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary" type="submit" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Log in'}
          </button>
        </form>
        <button
          type="button"
          className="text-button"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login')
            setError('')
          }}
        >
          {mode === 'login' ? 'Need an account? Register' : 'Already registered? Log in'}
        </button>
      </section>
    </main>
  )
}
