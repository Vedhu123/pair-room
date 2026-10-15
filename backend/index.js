import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import { attachCollab } from './collab/collab.js'
import { registerAccountRoutes } from './routes/account.js'
import { registerRoomRoutes } from './routes/rooms.js'

const app = express()
app.disable('x-powered-by')
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1)

if (process.env.NODE_ENV !== 'production') {
  app.use(cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true
  }))
}

app.use(cookieParser())
app.use(express.json({ limit: '20kb' }))

app.get('/api/health', (req, res) => {
  res.json({ ok: true })
})

registerAccountRoutes(app)
registerRoomRoutes(app)

const dist = path.resolve('dist')
const indexHtml = path.join(dist, 'index.html')
if (fs.existsSync(indexHtml)) {
  app.use(express.static(dist, {
    index: false,
    setHeaders(res, filePath) {
      if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache')
    }
  }))
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next()
    res.setHeader('Cache-Control', 'no-cache')
    res.sendFile(indexHtml)
  })
}

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found.' })
})

app.use((err, req, res, next) => {
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Invalid request.' })
    return
  }
  console.error(err)
  if (!res.headersSent) res.status(500).json({ error: 'Something went wrong.' })
})

const port = Number(process.env.PORT) || 8787
const server = http.createServer(app)
attachCollab(server)
server.listen(port, '0.0.0.0', () => {
  console.log(`Pair Room API on http://localhost:${port}`)
})
