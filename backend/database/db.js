import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data')
fs.mkdirSync(dataDir, { recursive: true })

export const db = new DatabaseSync(path.join(dataDir, 'pair-room.db'))
db.exec('PRAGMA journal_mode = WAL')
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  language TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS members (
  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  joined_at TEXT NOT NULL,
  PRIMARY KEY (room_id, user_id)
);
CREATE TABLE IF NOT EXISTS documents (
  room_id TEXT PRIMARY KEY,
  state TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS members_user ON members(user_id);
`)

export function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email }
}

export function mapRoom(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    language: row.language,
    ownerId: row.owner_id,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function createUser({ id, name, email, passwordHash }) {
  const now = new Date().toISOString()
  try {
    db.prepare(
      'INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(id, name, email, passwordHash, now)
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) return null
    throw error
  }
  return getUserById(id)
}

export function getUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id)
}

export function getUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email)
}

export function createRoom({ id, name, language, ownerId }) {
  const now = new Date().toISOString()
  db.exec('BEGIN')
  try {
    db.prepare(
      'INSERT INTO rooms (id, name, language, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, name, language, ownerId, now, now)
    db.prepare(
      'INSERT INTO members (room_id, user_id, joined_at) VALUES (?, ?, ?)'
    ).run(id, ownerId, now)
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
  return getRoomForMember(id, ownerId)
}

export function getRoom(id) {
  return db.prepare('SELECT * FROM rooms WHERE id = ?').get(id)
}

export function getRoomForMember(roomId, userId) {
  return db.prepare(`
    SELECT r.*, CASE WHEN r.owner_id = ? THEN 'owner' ELSE 'member' END AS role
    FROM rooms r
    JOIN members m ON m.room_id = r.id AND m.user_id = ?
    WHERE r.id = ?
  `).get(userId, userId, roomId)
}

export function listRooms(userId) {
  return db.prepare(`
    SELECT r.*, CASE WHEN r.owner_id = ? THEN 'owner' ELSE 'member' END AS role
    FROM rooms r
    JOIN members m ON m.room_id = r.id
    WHERE m.user_id = ?
    ORDER BY r.updated_at DESC
  `).all(userId, userId)
}

export function isMember(userId, roomId) {
  return Boolean(
    db.prepare('SELECT 1 AS ok FROM members WHERE user_id = ? AND room_id = ?').get(userId, roomId)
  )
}

export function joinRoom(roomId, userId) {
  const now = new Date().toISOString()
  db.prepare(
    'INSERT INTO members (room_id, user_id, joined_at) VALUES (?, ?, ?) ON CONFLICT(room_id, user_id) DO NOTHING'
  ).run(roomId, userId, now)
  return getRoomForMember(roomId, userId)
}

export function updateLanguage(roomId, language) {
  const now = new Date().toISOString()
  db.prepare('UPDATE rooms SET language = ?, updated_at = ? WHERE id = ?').run(language, now, roomId)
}

export function getDocument(roomId) {
  return db.prepare('SELECT state FROM documents WHERE room_id = ?').get(roomId)
}

export function saveDocument(roomId, state) {
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO documents (room_id, state, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(room_id) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at
  `).run(roomId, state, now)
  db.prepare('UPDATE rooms SET updated_at = ? WHERE id = ?').run(now, roomId)
}
