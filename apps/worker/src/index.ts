import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { D1Database, R2Bucket } from '@cloudflare/workers-types'
import { authRoutes } from './auth.js'
import { mailboxRoutes } from './mailbox.js'
import { routes } from './routes.js'

export interface Env {
  DB: D1Database
  PHOTOS: R2Bucket
  GITHUB_CLIENT_ID: string
  GITHUB_CLIENT_SECRET: string
  GITHUB_REDIRECT_URI: string
}

const app = new Hono<{ Bindings: Env }>()

// CORS — allow the PWA (any origin, since it can be self-hosted)
app.use('*', cors({ origin: '*', allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'] }))

// Health check
app.get('/health', (c) => c.json({ ok: true, version: '0.1.0' }))

// Auth (GitHub OAuth — optional, only for cross-device sync)
app.route('/auth', authRoutes)

// Mailbox — the cross-device sync endpoint used by the phone <-> laptop pairing
app.route('/mailbox', mailboxRoutes)

// Other routes — completion stats, photo sync, account deletion
app.route('/', routes)

export default app
