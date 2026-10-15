import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import WebSocket from 'ws'

const base = 'http://localhost:8787'
const stamp = Date.now()

async function request(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { cookie: `pair_token=${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  })
  const data = await res.json().catch(() => ({}))
  const setCookie = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : []
  const cookie = setCookie.find((item) => item.startsWith('pair_token='))
  const nextToken = cookie ? cookie.split(';')[0].slice('pair_token='.length) : token
  if (!res.ok) throw new Error(`${method} ${path} failed: ${res.status} ${data.error || ''}`)
  return { data, token: nextToken }
}

function connect(token, roomId) {
  const doc = new Y.Doc()
  const provider = new WebsocketProvider(`${base.replace('http', 'ws')}/yjs`, roomId, doc, {
    disableBc: true,
    WebSocketPolyfill: class extends WebSocket {
      constructor(url, protocols) {
        super(url, protocols, { headers: { Cookie: `pair_token=${token}` } })
      }
    }
  })
  return { doc, provider }
}

function waitFor(check, label) {
  return new Promise((resolve, reject) => {
    const started = Date.now()
    const timer = setInterval(() => {
      if (check()) {
        clearInterval(timer)
        resolve()
      } else if (Date.now() - started > 8000) {
        clearInterval(timer)
        reject(new Error(label))
      }
    }, 50)
  })
}

const health = await fetch(`${base}/api/health`)
if (!health.ok) throw new Error('Server is not healthy')

const first = await request('/api/register', {
  method: 'POST',
  body: { name: 'Ada', email: `ada-${stamp}@example.com`, password: 'password1' }
})
const second = await request('/api/register', {
  method: 'POST',
  body: { name: 'Grace', email: `grace-${stamp}@example.com`, password: 'password2' }
})
const created = await request('/api/rooms', {
  method: 'POST',
  token: first.token,
  body: { name: 'Sync check', language: 'javascript' }
})
const roomId = created.data.room.id
await request(`/api/rooms/${roomId}/join`, { method: 'POST', token: second.token })

const left = connect(first.token, roomId)
const right = connect(second.token, roomId)
await waitFor(() => left.provider.synced && right.provider.synced, 'docs did not sync')

const leftText = left.doc.getText('codemirror')
const rightText = right.doc.getText('codemirror')
await waitFor(() => leftText.length > 0 && rightText.toString() === leftText.toString(), 'seed did not arrive')

const marker = ` marker-${stamp}`
leftText.insert(leftText.length, marker)
await waitFor(() => rightText.toString().includes(marker), 'remote insert did not arrive')

left.provider.destroy()
right.provider.destroy()
left.doc.destroy()
right.doc.destroy()
await new Promise((resolve) => setTimeout(resolve, 700))

const again = connect(first.token, roomId)
await waitFor(() => again.provider.synced && again.doc.getText('codemirror').toString().includes(marker), 'document was not saved')
again.provider.destroy()
again.doc.destroy()
console.log('sync check passed')
