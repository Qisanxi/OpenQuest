/**
 * Optional GitHub OAuth flow for cross-device sync.
 *
 * Why GitHub OAuth?
 *   - Free, no rate limits for low-volume apps
 *   - Users already have GitHub accounts (Hacktoberfest audience)
 *   - The token gives us read access to user identity only — no repos
 *
 * The flow:
 *   1. PWA redirects user to https://github.com/login/oauth/authorize?...
 *   2. GitHub redirects back to /auth/callback?code=...
 *   3. Worker exchanges code for access token
 *   4. Worker creates a session row in D1, returns a session cookie
 *
 * Sessions are stored in the `sessions` table, keyed by a random 32-byte
 * session ID. The cookie is httpOnly + Secure + SameSite=Strict.
 *
 * If you don't want cross-device sync, you can skip this entirely — the
 * PWA works fully offline in solo mode.
 */

import { Hono } from 'hono'
import type { Env } from './index.js'

export const authRoutes = new Hono<{ Bindings: Env }>()

const STATE_COOKIE = 'openquest_oauth_state'

authRoutes.get('/login', (c) => {
  const state = crypto.randomUUID()
  const params = new URLSearchParams({
    client_id: c.env.GITHUB_CLIENT_ID,
    redirect_uri: c.env.GITHUB_REDIRECT_URI,
    scope: 'read:user',
    state,
  })
  // Bind the OAuth round-trip to this browser (CSRF protection). Lax, not
  // Strict: the cookie must be sent on the top-level redirect back from GitHub.
  c.header('Set-Cookie', `${STATE_COOKIE}=${state}; HttpOnly; Secure; SameSite=Lax; Max-Age=600; Path=/auth`)
  return c.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`)
})

authRoutes.get('/callback', async (c) => {
  const code = c.req.query('code')
  if (!code) return c.json({ error: 'missing code' }, 400)

  const state = c.req.query('state')
  const expected = getCookie(c.req.header('Cookie'), STATE_COOKIE)
  if (!state || !expected || state !== expected) {
    return c.json({ error: 'bad_state' }, 400)
  }

  // Exchange code for access token
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: c.env.GITHUB_CLIENT_ID,
      client_secret: c.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  })
  const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string }
  if (tokenData.error || !tokenData.access_token) {
    return c.json({ error: tokenData.error ?? 'no_token' }, 400)
  }

  // Fetch user identity
  const userRes = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })
  const user = (await userRes.json()) as { id: number; login: string; name?: string }
  if (!user.id) return c.json({ error: 'no_user' }, 400)

  // Upsert user row
  await c.env.DB.prepare(
    'INSERT INTO users (github_id, github_login, display_name, created_at) VALUES (?, ?, ?, ?) ' +
      'ON CONFLICT(github_id) DO UPDATE SET github_login = excluded.github_login, display_name = excluded.display_name',
  )
    .bind(user.id, user.login, user.name ?? user.login, Date.now())
    .run()

  // Create a session
  const sessionId = crypto.randomUUID()
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
  await c.env.DB.prepare(
    'INSERT INTO sessions (id, github_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
  )
    .bind(sessionId, user.id, Date.now(), expiresAt)
    .run()

  // Set cookie
  c.header('Set-Cookie', `openquest_session=${sessionId}; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000; Path=/`)
  return c.redirect('/')
})

authRoutes.post('/logout', async (c) => {
  const sessionId = getCookie(c.req.header('Cookie'), 'openquest_session')
  if (sessionId) {
    await c.env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run()
  }
  c.header('Set-Cookie', 'openquest_session=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/')
  return c.json({ ok: true })
})

authRoutes.get('/me', async (c) => {
  const sessionId = getCookie(c.req.header('Cookie'), 'openquest_session')
  if (!sessionId) return c.json({ user: null })

  const session = await c.env.DB.prepare(
    'SELECT github_id FROM sessions WHERE id = ? AND expires_at > ?',
  ).bind(sessionId, Date.now()).first<{ github_id: number }>()
  if (!session) return c.json({ user: null })

  const user = await c.env.DB.prepare(
    'SELECT github_login, display_name FROM users WHERE github_id = ?',
  ).bind(session.github_id).first<{ github_login: string; display_name: string }>()

  return c.json({ user })
})

function getCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))
  return match ? match[1] : null
}
