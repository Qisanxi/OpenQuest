import { describe, it, expect } from 'vitest'
import app from '../src/index'

const env = {
  GITHUB_CLIENT_ID: 'cid',
  GITHUB_CLIENT_SECRET: 'secret',
  GITHUB_REDIRECT_URI: 'https://example.test/auth/callback',
} as never

describe('worker', () => {
  it('GET /health is ok', async () => {
    const res = await app.request('/health', {}, env)
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true })
  })

  it('/auth/login binds the OAuth state to a cookie', async () => {
    const res = await app.request('/auth/login', {}, env)
    expect(res.status).toBe(302)
    const state = new URL(res.headers.get('Location')!).searchParams.get('state')
    expect(state).toBeTruthy()
    expect(res.headers.get('Set-Cookie')).toContain(`openquest_oauth_state=${state}`)
  })

  it('/auth/callback rejects a missing or mismatched state', async () => {
    const noState = await app.request('/auth/callback?code=abc', {}, env)
    expect(noState.status).toBe(400)
    const wrong = await app.request(
      '/auth/callback?code=abc&state=evil',
      { headers: { Cookie: 'openquest_oauth_state=good' } },
      env,
    )
    expect(wrong.status).toBe(400)
    expect(await wrong.json()).toEqual({ error: 'bad_state' })
  })
})
