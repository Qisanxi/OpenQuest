/**
 * Misc routes — completion stats, photo sync, account deletion.
 *
 * Account deletion is required by GDPR and the App Store (if we ever
 * shipped to iOS). It purges all user rows, sessions, finds, and
 * photos for the authenticated user.
 */

import { Hono } from 'hono'
import type { Env } from './index.js'

export const routes = new Hono<{ Bindings: Env }>()

/**
 * Daily completion stats for the user. Returns the last 30 days.
 */
routes.get('/stats', async (c) => {
  const sessionId = getCookie(c.req.header('Cookie'), 'openquest_session')
  if (!sessionId) return c.json({ error: 'unauthorized' }, 401)

  const session = await c.env.DB.prepare(
    'SELECT github_id FROM sessions WHERE id = ? AND expires_at > ?',
  ).bind(sessionId, Date.now()).first<{ github_id: number }>()
  if (!session) return c.json({ error: 'unauthorized' }, 401)

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
  const rows = await c.env.DB.prepare(
    `SELECT date, count, categories FROM daily_completions
     WHERE github_id = ? AND date >= ?
     ORDER BY date DESC`,
  ).bind(session.github_id, new Date(thirtyDaysAgo).toISOString().slice(0, 10)).all()

  return c.json({ stats: rows.results })
})

/**
 * Account deletion — purges all user data.
 * Required by GDPR and App Store policies.
 */
routes.post('/account/delete', async (c) => {
  const sessionId = getCookie(c.req.header('Cookie'), 'openquest_session')
  if (!sessionId) return c.json({ error: 'unauthorized' }, 401)

  const session = await c.env.DB.prepare(
    'SELECT github_id FROM sessions WHERE id = ?',
  ).bind(sessionId).first<{ github_id: number }>()
  if (!session) return c.json({ error: 'unauthorized' }, 401)

  // Get all photo keys for this user's finds
  const finds = await c.env.DB.prepare(
    'SELECT photo_key FROM finds WHERE user_id = ?',
  ).bind(session.github_id).all<{ photo_key: string }>()

  // Delete photos from R2
  for (const f of finds.results) {
    await c.env.PHOTOS.delete(f.photo_key)
  }

  // Delete rows from D1
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM finds WHERE user_id = ?').bind(session.github_id),
    c.env.DB.prepare('DELETE FROM daily_completions WHERE github_id = ?').bind(session.github_id),
    c.env.DB.prepare('DELETE FROM sessions WHERE github_id = ?').bind(session.github_id),
    c.env.DB.prepare('DELETE FROM users WHERE github_id = ?').bind(session.github_id),
  ])

  c.header('Set-Cookie', 'openquest_session=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/')
  return c.json({ ok: true })
})

function getCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))
  return match ? match[1] : null
}
