/**
 * Mailbox — the cross-device sync endpoint.
 *
 * The phone <-> laptop pairing pattern:
 *
 *   1. Laptop (running the PWA in "base" mode) starts polling the mailbox
 *      every 4-20s: GET /mailbox/pending
 *   2. Phone takes a photo, POSTs it to /mailbox/find with the quest context
 *   3. Laptop polls, picks up the pending find, runs Gemma locally
 *   4. Laptop POSTs the judgement to /mailbox/result
 *   5. Phone polls /mailbox/result?questId=X, gets the verdict
 *
 * Why a mailbox instead of a websocket:
 *   - Cloudflare Workers don't support websockets on the free tier cleanly
 *   - Long-polling is simpler and just as good for our volume
 *   - A 4s poll interval is plenty fast for the UX (photo judging takes ~10s)
 *
 * If you don't want cross-device sync, you don't need this worker — solo
 * mode runs the entire pipeline on one device.
 */

import { Hono } from 'hono'
import type { Env } from './index.js'

export const mailboxRoutes = new Hono<{ Bindings: Env }>()

interface PendingFind {
  id: string
  questId: string
  userId: string | null
  photoKey: string    // R2 object key
  questPrompt: string
  verificationHint: string
  placeName: string
  category: string
  createdAt: number
}

interface FindResult {
  id: string           // same as PendingFind.id
  questId: string
  passed: boolean
  reason: string
  observations: string  // JSON array
  judgedAt: number
}

/**
 * Phone submits a find. Stores the photo in R2, the metadata in D1.
 * Returns the find ID so the phone can poll for the result.
 */
mailboxRoutes.post('/find', async (c) => {
  const formData = await c.req.formData()
  const questId = formData.get('questId') as string
  // Typed as unknown: the Workers FormData typings say string|null, but a file part is a File.
  const photo: unknown = formData.get('photo')
  const questPrompt = formData.get('questPrompt') as string
  const verificationHint = formData.get('verificationHint') as string
  const placeName = formData.get('placeName') as string
  const category = formData.get('category') as string

  if (!questId || !(photo instanceof File)) return c.json({ error: 'missing_fields' }, 400)

  const findId = crypto.randomUUID()
  const photoKey = `finds/${findId}.jpg`

  // Upload photo to R2
  await c.env.PHOTOS.put(photoKey, photo.stream(), {
    httpMetadata: { contentType: 'image/jpeg' },
  })

  // Insert pending find row
  await c.env.DB.prepare(
    `INSERT INTO finds (id, quest_id, photo_key, quest_prompt, verification_hint, place_name, category, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
  ).bind(findId, questId, photoKey, questPrompt, verificationHint, placeName, category, Date.now()).run()

  return c.json({ findId })
})

/**
 * Laptop polls for pending finds. Returns the oldest pending find, if any.
 * Marks it as 'in_progress' so other laptops don't pick it up.
 */
mailboxRoutes.get('/pending', async (c) => {
  // Atomically claim the oldest pending find
  const find = await c.env.DB.prepare(
    `UPDATE finds SET status = 'in_progress', claimed_at = ?
     WHERE id = (SELECT id FROM finds WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1)
     RETURNING *`,
  ).bind(Date.now()).first<PendingFind>()

  if (!find) return c.json({ find: null })

  // Generate a presigned URL for the photo (or just return the R2 key —
  // the laptop fetches via a separate endpoint)
  return c.json({
    find: {
      ...find,
      photoUrl: `/mailbox/photo/${find.id}`,
    },
  })
})

/**
 * Fetch the photo for a claimed find.
 */
mailboxRoutes.get('/photo/:findId', async (c) => {
  const findId = c.req.param('findId')
  const find = await c.env.DB.prepare(
    'SELECT photo_key FROM finds WHERE id = ?',
  ).bind(findId).first<{ photo_key: string }>()
  if (!find) return c.json({ error: 'not_found' }, 404)

  const obj = await c.env.PHOTOS.get(find.photo_key)
  if (!obj) return c.json({ error: 'photo_missing' }, 404)

  return new Response(obj.body, {
    headers: { 'Content-Type': 'image/jpeg' },
  })
})

/**
 * Laptop submits the judge result for a find.
 */
mailboxRoutes.post('/result', async (c) => {
  const body = await c.req.json<Partial<FindResult>>()
  if (!body.id || typeof body.passed !== 'boolean') {
    return c.json({ error: 'missing_fields' }, 400)
  }

  await c.env.DB.prepare(
    `UPDATE finds SET status = ?, passed = ?, reason = ?, observations = ?, judged_at = ?
     WHERE id = ?`,
  ).bind(
    body.passed ? 'passed' : 'failed',
    body.passed,
    body.reason ?? '',
    body.observations ?? '[]',
    Date.now(),
    body.id,
  ).run()

  return c.json({ ok: true })
})

/**
 * Phone polls for the result of a specific find.
 */
mailboxRoutes.get('/result', async (c) => {
  const questId = c.req.query('questId')
  if (!questId) return c.json({ error: 'missing_questId' }, 400)

  const result = await c.env.DB.prepare(
    `SELECT id, quest_id, passed, reason, observations, judged_at
     FROM finds WHERE quest_id = ? AND status IN ('passed', 'failed')
     ORDER BY judged_at DESC LIMIT 1`,
  ).bind(questId).first<FindResult>()

  if (!result) return c.json({ result: null })
  return c.json({ result })
})
