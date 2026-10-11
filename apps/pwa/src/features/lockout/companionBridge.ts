/**
 * Companion bridge — talks to the Android companion app via localhost HTTP.
 *
 * Why localhost: the companion binds to 127.0.0.1:7777 only. The PWA
 * running on the same device reaches it via fetch('http://127.0.0.1:7777/...').
 * No remote attacker can trigger a lockout, even if they know the secret.
 *
 * Authentication: every request is HMAC-SHA256-signed with a pairing
 * secret. The secret is generated when the user pairs the companion via
 * QR code and stored in localStorage.
 *
 * If the companion is not installed, all calls resolve to null/false —
 * the PWA falls back to "soft lock" mode (fullscreen overlay).
 */

import type { LockRequest, StatusResponse, UnlockRequest, LockoutState } from '@shared/lockout'
import { DEFAULT_COMPANION_PORT, buildPayload } from '@shared/lockout'

const PAIRING_SECRET_KEY = 'openquest.pairingSecret'
const COMPANION_PORT_KEY = 'openquest.companionPort'

function getPort(): number {
  const stored = localStorage.getItem(COMPANION_PORT_KEY)
  if (stored) return parseInt(stored, 10)
  return parseInt(import.meta.env.VITE_COMPANION_PORT ?? String(DEFAULT_COMPANION_PORT), 10)
}

function getSecret(): string | null {
  return localStorage.getItem(PAIRING_SECRET_KEY)
}

async function sign(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

class CompanionBridge {
  async getStatus(): Promise<StatusResponse | null> {
    const secret = getSecret()
    const port = getPort()
    try {
      const res = await fetch(`http://127.0.0.1:${port}/status`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      })
      if (!res.ok) return null
      return (await res.json()) as StatusResponse
    } catch {
      return null
    }
  }

  async lock(questId: string, questSummary: string, durationMin: number): Promise<void> {
    const secret = getSecret()
    if (!secret) {
      console.warn('[companion] No pairing secret set — falling back to soft lock')
      return
    }

    const port = getPort()
    const req: Omit<LockRequest, 'signature'> = {
      timestamp: Date.now(),
      durationMin,
      questId,
      questSummary,
    }
    const signature = await sign(buildPayload(req), secret)

    const res = await fetch(`http://127.0.0.1:${port}/lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...req, signature } satisfies LockRequest),
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) {
      throw new Error(`Lock failed: ${res.status}`)
    }
  }

  async unlock(reason: 'quest_completed' | 'quest_expired' | 'panic_pin'): Promise<void> {
    const secret = getSecret()
    if (!secret) return

    const port = getPort()
    const req: Omit<UnlockRequest, 'signature'> = {
      timestamp: Date.now(),
      reason,
      questId: 'unknown',  // companion doesn't care which quest, just unlocks
    }
    const signature = await sign([req.timestamp, req.reason].join('|'), secret)

    await fetch(`http://127.0.0.1:${port}/unlock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...req, signature } satisfies UnlockRequest),
      signal: AbortSignal.timeout(3000),
    })
  }

  async panicPin(pin: string): Promise<boolean> {
    const secret = getSecret()
    if (!secret) return false

    const port = getPort()
    const pinHash = await sha256(pin + ':' + secret)
    const req = { timestamp: Date.now(), pinHash }
    const signature = await sign([req.timestamp, req.pinHash].join('|'), secret)

    const res = await fetch(`http://127.0.0.1:${port}/panic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...req, signature }),
      signal: AbortSignal.timeout(3000),
    })
    return res.ok
  }

  setPairingSecret(secret: string): void {
    localStorage.setItem(PAIRING_SECRET_KEY, secret)
  }

  setPort(port: number): void {
    localStorage.setItem(COMPANION_PORT_KEY, String(port))
  }

  isPaired(): boolean {
    return getSecret() !== null
  }
}

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export const companionBridge = new CompanionBridge()
export type { LockoutState }
