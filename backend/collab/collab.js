import { createRequire } from 'node:module'
import { WebSocketServer } from 'ws'

const require = createRequire(import.meta.url)
const Y = require('yjs')
import { setupWSConnection, setPersistence } from 'y-websocket/bin/utils'
import { getDocument, getRoom, isMember, saveDocument } from '../database/db.js'
import { userFromRequest } from '../auth/auth.js'
import { seedDoc } from './seed.js'

const pending = new Map()

function snapshot(ydoc) {
  return Buffer.from(Y.encodeStateAsUpdate(ydoc)).toString('base64')
}

function scheduleSave(roomId, ydoc) {
  const existing = pending.get(roomId)
  if (existing) clearTimeout(existing)
  pending.set(roomId, setTimeout(() => {
    pending.delete(roomId)
    try {
      saveDocument(roomId, snapshot(ydoc))
    } catch (error) {
      console.error('Could not save room', roomId, error)
    }
  }, 400))
}

function writeNow(roomId, ydoc) {
  const existing = pending.get(roomId)
  if (existing) clearTimeout(existing)
  pending.delete(roomId)
  saveDocument(roomId, snapshot(ydoc))
}

setPersistence({
  bindState: (roomId, ydoc) => {
    const row = getDocument(roomId)
    if (row?.state) {
      Y.applyUpdate(ydoc, Buffer.from(row.state, 'base64'))
    } else {
      seedDoc(ydoc, getRoom(roomId)?.language)
      writeNow(roomId, ydoc)
    }
    ydoc.on('update', () => scheduleSave(roomId, ydoc))
  },
  writeState: async (roomId, ydoc) => {
    writeNow(roomId, ydoc)
  }
})

export function attachCollab(server) {
  const wss = new WebSocketServer({ noServer: true })

  server.on('upgrade', (request, socket, head) => {
    let roomId = ''
    try {
      const url = new URL(request.url, 'http://localhost')
      const parts = url.pathname.split('/').filter(Boolean)
      if (parts[0] === 'yjs' && parts.length === 2) roomId = parts[1]
    } catch {
      roomId = ''
    }

    const user = userFromRequest(request)
    if (!roomId || !/^[A-Za-z0-9_-]{12,24}$/.test(roomId) || !user || !isMember(user.id, roomId)) {
      socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n')
      socket.destroy()
      return
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      setupWSConnection(ws, request, { docName: roomId, gc: false })
    })
  })
}
