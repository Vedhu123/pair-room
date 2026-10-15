import crypto from 'node:crypto'
import { createUser, getUserByEmail, publicUser } from '../database/db.js'
import {
  checkPassword,
  clearAuthCookie,
  hashPassword,
  setAuthCookie,
  signToken,
  userFromRequest
} from '../auth/auth.js'
import { asyncRoute, cleanName, validEmail } from '../lib/http.js'

export function registerAccountRoutes(app) {
  app.get('/api/me', (req, res) => {
    const user = userFromRequest(req)
    if (!user) {
      res.status(401).json({ error: 'Log in to continue.' })
      return
    }
    res.json({ user: publicUser(user) })
  })

  app.post('/api/register', asyncRoute(async (req, res) => {
    const name = cleanName(req.body?.name, 40)
    const email = String(req.body?.email || '').trim().toLowerCase()
    const password = String(req.body?.password || '')
    if (!name) {
      res.status(400).json({ error: 'Enter your name.' })
      return
    }
    if (!validEmail(email)) {
      res.status(400).json({ error: 'Enter a valid email.' })
      return
    }
    if (password.length < 8 || password.length > 200) {
      res.status(400).json({ error: 'Use a password of at least 8 characters.' })
      return
    }
    const user = createUser({
      id: crypto.randomUUID(),
      name,
      email,
      passwordHash: await hashPassword(password)
    })
    if (!user) {
      res.status(409).json({ error: 'An account with that email already exists.' })
      return
    }
    setAuthCookie(res, signToken(user))
    res.status(201).json({ user: publicUser(user) })
  }))

  app.post('/api/login', asyncRoute(async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase()
    const password = String(req.body?.password || '')
    const found = validEmail(email) ? getUserByEmail(email) : null
    if (!found || !(await checkPassword(password, found.password_hash))) {
      res.status(401).json({ error: 'Email or password is wrong.' })
      return
    }
    setAuthCookie(res, signToken(found))
    res.json({ user: publicUser(found) })
  }))

  app.post('/api/logout', (req, res) => {
    clearAuthCookie(res)
    res.json({ ok: true })
  })
}
