import crypto from 'node:crypto'
import {
  createRoom,
  getRoom,
  getRoomForMember,
  joinRoom,
  listRooms,
  mapRoom,
  updateLanguage
} from '../database/db.js'
import { requireAuth } from '../auth/auth.js'
import { cleanName, roomIdOk } from '../lib/http.js'

export function registerRoomRoutes(app) {
  app.get('/api/rooms', requireAuth, (req, res) => {
    res.json({ rooms: listRooms(req.user.id).map(mapRoom) })
  })

  app.post('/api/rooms', requireAuth, (req, res) => {
    const name = cleanName(req.body?.name, 60)
    const language = req.body?.language === 'python' ? 'python' : 'javascript'
    if (!name) {
      res.status(400).json({ error: 'Name the room.' })
      return
    }
    const room = createRoom({
      id: crypto.randomBytes(12).toString('base64url'),
      name,
      language,
      ownerId: req.user.id
    })
    res.status(201).json({ room: mapRoom(room) })
  })

  app.post('/api/rooms/:id/join', requireAuth, (req, res) => {
    if (!roomIdOk(req.params.id) || !getRoom(req.params.id)) {
      res.status(404).json({ error: 'Room not found.' })
      return
    }
    res.json({ room: mapRoom(joinRoom(req.params.id, req.user.id)) })
  })

  app.patch('/api/rooms/:id', requireAuth, (req, res) => {
    const language = req.body?.language
    if (language !== 'javascript' && language !== 'python') {
      res.status(400).json({ error: 'Choose JavaScript or Python.' })
      return
    }
    const existing = getRoomForMember(req.params.id, req.user.id)
    if (!existing) {
      res.status(404).json({ error: 'Room not found.' })
      return
    }
    updateLanguage(existing.id, language)
    res.json({ room: mapRoom(getRoomForMember(existing.id, req.user.id)) })
  })
}
