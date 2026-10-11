/**
 * Lockout protocol — the localhost HTTP contract between the PWA and the
 * Android companion app.
 *
 * The PWA is the source of truth for quest state. The companion is a dumb
 * lockout engine: it receives `lock` requests, drops all packet traffic
 * except for whitelisted domains (OpenQuest itself + maps + emergency),
 * and stays in that state until it receives `unlock` or the duration
 * expires.
 *
 * Both sides share a secret (`PAIRING_SECRET`) generated when the user
 * pairs the companion via QR code. Every request is HMAC-SHA256 signed
 * with this secret. The companion rejects unsigned or wrongly-signed
 * requests.
 *
 * Why localhost only: the companion binds to 127.0.0.1:7777 — only the
 * PWA running in a browser on the same device can reach it. No remote
 * attacker can trigger a lockout, even if they know the secret.
 */

export const DEFAULT_COMPANION_PORT = 7777
export const DEFAULT_LOCKOUT_DURATION_MIN = 60
export const PANIC_UNLOCK_DURATION_MIN = 24 * 60 // 24 hours

export type LockoutState = 'unlocked' | 'locking' | 'locked' | 'unlocking' | 'panic'

export interface LockRequest {
  /** ISO 8601 timestamp the request was issued. */
  timestamp: number
  /** Lockout duration in minutes. Default 60. */
  durationMin: number
  /** Quest ID this lock belongs to. Used for the persistent notification. */
  questId: string
  /** Short quest summary shown in the notification ("walk to the bakery…"). */
  questSummary: string
  /** HMAC-SHA256(payload, PAIRING_SECRET) hex-encoded. */
  signature: string
}

export interface UnlockRequest {
  timestamp: number
  /** Either the quest completed normally, the timer expired, or panic PIN was used. */
  reason: 'quest_completed' | 'quest_expired' | 'panic_pin' | 'app_uninstall'
  questId: string
  signature: string
}

export interface StatusResponse {
  state: LockoutState
  /** Milliseconds since epoch when the current lockout started (if any). */
  lockedAt?: number
  /** Milliseconds since epoch when the lockout will auto-expire. */
  expiresAt?: number
  /** Quest ID the current lock is for (if any). */
  questId?: string
  /** Whether the panic PIN has been set up. */
  panicPinConfigured: boolean
  /** Companion app version. */
  version: string
}

export interface PanicRequest {
  timestamp: number
  /** SHA-256 hash of the user's 4-digit PIN, salted with the device ID. */
  pinHash: string
  signature: string
}

/**
 * Domains that remain reachable during a lockout. The companion's
 * VpnService drops all packets except for these.
 *
 * NOTE: emergency calls (911/112/etc.) are not domain-based — they go
 * through the cellular modem and are unaffected by VpnService.
 */
export const ALLOWED_DOMAINS_DURING_LOCKOUT: readonly string[] = [
  // OpenQuest PWA itself (when hosted on the production domain)
  'openquest.local',
  // OSM tiles for navigation
  'tile.openstreetmap.org',
  'a.tile.openstreetmap.org',
  'b.tile.openstreetmap.org',
  'c.tile.openstreetmap.org',
  // Overpass API (already cached locally, but allowed just in case)
  'overpass-api.de',
  // Routing
  'routing.openstreetmap.de',
] as const

export function buildPayload(req: Omit<LockRequest, 'signature'>): string {
  return [req.timestamp, req.durationMin, req.questId, req.questSummary].join('|')
}

export function buildPanicPayload(req: Omit<PanicRequest, 'signature'>): string {
  return [req.timestamp, req.pinHash].join('|')
}
