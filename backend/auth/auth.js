import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getUserById } from '../database/db.js'

const COOKIE = 'pair_token'
const WEEK = 7 * 24 * 60 * 60 * 1000

function loadSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET
  const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data')
  fs.mkdirSync(dataDir, { recursive: true })
  const file = path.join(dataDir, 'jwt.secret')
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').trim()
  const secret = crypto.randomBytes(32).toString('hex')
  fs.writeFileSync(file, secret)
  return secret
}

const secret = loadSecret()

export function hashPassword(password) {
  return bcrypt.hash(password, 10)
}

export function checkPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash)
}

export function signToken(user) {
  return jwt.sign({ sub: user.id }, secret, { expiresIn: '7d' })
}

export function tokenFromCookie(header) {
  if (!header) return null
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=')
    if (name === COOKIE) return decodeURIComponent(rest.join('='))
  }
  return null
}

export function userFromRequest(req) {
  const token = tokenFromCookie(req.headers.cookie || '')
  if (!token) return null
  try {
    const payload = jwt.verify(token, secret)
    return getUserById(payload.sub) || null
  } catch {
    return null
  }
}

export function requireAuth(req, res, next) {
  const user = userFromRequest(req)
  if (!user) {
    res.status(401).json({ error: 'Log in to continue.' })
    return
  }
  req.user = user
  next()
}

export function setAuthCookie(res, token) {
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: WEEK,
    path: '/'
  })
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE, { path: '/' })
}
