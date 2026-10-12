# Lockout Protocol

The localhost HTTP contract between the OpenQuest PWA and the Android companion.

## Transport

- **URL**: `http://127.0.0.1:7777`
- **Why localhost only**: the companion binds to 127.0.0.1 — only the PWA
  on the same device can reach it. No remote attacker can trigger a
  lockout, even if they know the pairing secret.
- **Content-Type**: `application/json` for all POST bodies.
- **Timeouts**: 2s for GET `/status`, 3s for POST `/lock` and `/unlock`.

## Authentication

Every request (except GET `/status`) is HMAC-SHA256 signed with the
pairing secret. The secret is generated when the user pairs the
companion via QR code (in `MainActivity`) and stored in the PWA's
`localStorage` under `openquest.pairingSecret`.

### Signature

```
payload = "<timestamp>|<durationMin>|<questId>|<questSummary>"
signature = HMAC-SHA256(payload, pairingSecret)  // hex-encoded
```

Payloads per endpoint (the PWA and companion must agree byte for byte):

| Endpoint | Signed payload                                        |
|----------|-------------------------------------------------------|
| `/lock`  | `<timestamp>\|<durationMin>\|<questId>\|<questSummary>` |
| `/unlock`| `<timestamp>\|<reason>`                               |
| `/panic` | `<timestamp>\|<pinHash>`                              |

The companion verifies with constant-time comparison to prevent timing
attacks.

### Replay protection

Each request includes a `timestamp` field. The companion rejects
requests more than 30 seconds away from its own clock (older or future-dated). (We don't use nonces — they'd require
state, and 30s is a tight enough window.)

## Endpoints

### GET /status

Returns the current lockout state. No auth required.

**Response 200:**
```json
{
  "state": "unlocked|locking|locked|unlocking|panic",
  "lockedAt": 1700000000000,   // null if not locked
  "expiresAt": 1700003600000,  // null if not locked
  "questId": "uuid",            // null if not locked
  "panicPinConfigured": true,
  "version": "0.1.0"
}
```

### POST /lock

Engage a lockout. The companion starts the VpnService and drops all
traffic except for whitelisted domains.

**Request:**
```json
{
  "timestamp": 1700000000000,
  "durationMin": 60,
  "questId": "uuid",
  "questSummary": "walk to the bakery and photograph bread",
  "signature": "abc123..."
}
```

**Response 200:**
```json
{ "ok": true }
```

**Response 401:** bad signature
```json
{ "error": "bad_signature" }
```

**Response 400:** stale request
```json
{ "error": "stale_request" }
```

### POST /unlock

Release the lockout. The companion stops the VpnService and tears down
the foreground notification.

**Request:**
```json
{
  "timestamp": 1700000000000,
  "reason": "quest_completed|quest_expired|panic_pin",
  "questId": "unknown",
  "signature": "abc123..."
}
```

**Response 200:**
```json
{ "ok": true }
```

### POST /panic

Force-unlock for 24 hours. Requires the panic PIN hash (not the PIN itself).

**Request:**
```json
{
  "timestamp": 1700000000000,
  "pinHash": "sha256(pin + ':' + pairingSecret)",
  "signature": "abc123..."
}
```

**Response 200:** PIN correct, unlocking
```json
{ "ok": true }
```

**Response 401:** bad PIN
```json
{ "error": "bad_pin" }
```

## Allowed domains during lockout

The companion's VpnService pre-resolves these to IPs at lock start and
adds them as bypass routes. All other traffic is dropped.

```
openquest.local              # OpenQuest PWA itself
tile.openstreetmap.org       # OSM tiles for navigation
a/b/c.tile.openstreetmap.org # OSM tile mirrors
overpass-api.de              # Overpass API (cached, but allowed just in case)
routing.openstreetmap.de     # Routing
api.open-meteo.com           # Weather (for quest context)
```

Emergency calls (911/112/999/etc.) go through the cellular modem and are
**always reachable** regardless of VpnService state.

## Failure modes

| Scenario                                   | Behavior                                                                  |
|--------------------------------------------|---------------------------------------------------------------------------|
| Companion not installed                    | PWA falls back to soft-lock (wake lock + notification + focus trap)       |
| Companion installed but not running        | `/status` returns null; PWA shows "companion not detected" banner       |
| Bad signature                              | 401; PWA logs warning, falls back to soft-lock                           |
| Stale request (>30s)                       | 400; PWA should re-issue                                                  |
| VpnService prepare not granted             | Companion prompts user; if denied, lockout doesn't engage                |
| Phone reboots during lockout               | MVP: phone unlocks on reboot (safe default)                              |
| User uninstalls companion during lockout   | Lockout immediately ends (no foreground service to maintain it)          |
| Panic PIN forgotten                        | User uninstalls companion — clears PIN hash, stops service, unlocks      |
| Battery dies during lockout                | Phone reboots without lockout (BootReceiver is a stub in MVP)            |

## Security considerations

### CORS

The PWA is served from another origin, so browsers send an `OPTIONS`
preflight before each JSON `POST`. The companion answers it and adds
`Access-Control-Allow-Origin: *` plus `Access-Control-Allow-Private-Network`.
Origin is not the security boundary — the HMAC signature is.

### Why not TLS?

Localhost doesn't need TLS — there's no network path to eavesdrop on.
Adding a self-signed cert would just complicate the PWA's fetch logic
(no CA trust store for self-signed localhost certs in browsers).

### Why HMAC and not just a bearer token?

A bearer token would let any process on the phone trigger a lockout
by reading the PWA's localStorage. HMAC over the request payload means
the secret alone isn't enough — you also need to sign each request,
which makes automated abuse harder.

### What about other apps on the phone?

Other apps can technically `curl http://127.0.0.1:7777/lock` if they
guess the port. But they can't sign requests without the secret, and
the companion rejects unsigned requests. The secret is stored in the
PWA's localStorage (origin-scoped — other apps can't read it).

### Timing attacks

We use constant-time string comparison for both HMAC verification and
PIN hash comparison. The server doesn't reveal whether the signature
or the PIN was wrong (both return 401).
