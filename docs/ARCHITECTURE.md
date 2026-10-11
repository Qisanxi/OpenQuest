# OpenQuest Architecture

## Overview

OpenQuest is a two-part system:

1. **The PWA** (React + Vite + Tailwind) — runs in the browser, owns the
   quest lifecycle, runs the local LLM (Gemma 4 E2B via WebGPU), takes
   photos, and judges them. This is 95% of the code.

2. **The Companion** (Kotlin + Jetpack Compose + VpnService) — a tiny
   Android app (~500 LOC) that locks the phone's internet during a quest.
   It exposes a localhost HTTP API on port 7777. The PWA calls it via
   `fetch('http://127.0.0.1:7777/...')`.

A **Cloudflare Worker** (optional) adds cross-device sync via a "mailbox"
pattern: the laptop runs Gemma locally and judges photos from the phone.

## Three operating modes

### Solo mode (default)

```
┌─────────────────────────────────────────────────┐
│                   Phone / Laptop                │
│                                                 │
│  ┌──────────────┐    ┌──────────────────────┐  │
│  │  OpenQuest   │    │  Companion (Android   │  │
│  │  PWA         │───►│  only, optional)      │  │
│  │  + Gemma     │    │  VpnService lockout   │  │
│  └──────────────┘    └──────────────────────┘  │
└─────────────────────────────────────────────────┘
```

- PWA runs Gemma via WebGPU
- Companion locks the phone via VpnService
- No server needed — fully offline

### Field mode (phone paired with laptop)

```
┌───────────────────────────────┐
│           Phone               │
│  ┌──────────────────────────┐ │
│  │  OpenQuest PWA (field)   │ │
│  │  - takes photos          │ │
│  │  - sends to mailbox      │ │
│  └──────────┬───────────────┘ │
└─────────────┼─────────────────┘
              │ HTTPS
              ▼
┌───────────────────────────────┐
│     Cloudflare Worker         │
│  ┌──────────────────────────┐ │
│  │  Mailbox                 │ │
│  │  - D1 (metadata)         │ │
│  │  - R2 (photos)           │ │
│  └──────────┬───────────────┘ │
└─────────────┼─────────────────┘
              │ HTTPS
              ▼
┌───────────────────────────────┐
│         Laptop                │
│  ┌──────────────────────────┐ │
│  │  OpenQuest PWA (base)   │ │
│  │  - polls mailbox         │ │
│  │  - runs Gemma            │ │
│  │  - posts judgement       │ │
│  └──────────────────────────┘ │
└───────────────────────────────┘
```

- Phone is just a camera — can't run Gemma
- Laptop runs Gemma and judges
- Used when the phone's GPU can't handle the 2.6GB model

### Soft-lock mode (no companion installed)

- PWA uses wake lock + persistent notification + focus trap
- NOT a real lock — user can dismiss
- Useful for trying OpenQuest before installing the companion

## Quest lifecycle

```
                ┌─────────────────────────┐
                │      pending            │
                │  (generated, not        │
                │   accepted yet)         │
                └───────────┬─────────────┘
                            │
                       user accepts
                            │
                            ▼
                ┌─────────────────────────┐
                │  active                 │
                │  (lockout engaged,      │
                │   walking)              │
                └───────────┬─────────────┘
                            │
                  take photo + submit
                            │
                            ▼
                ┌─────────────────────────┐
                │  submitted              │
                │  (awaiting judgement)   │
                └───────────┬─────────────┘
                            │
                  ┌─────────┴─────────┐
                  │                   │
                  ▼                   ▼
        ┌──────────────┐     ┌──────────────┐
        │  verified    │     │  failed      │
        │  (unlock)    │     │  (still      │
        │              │     │   locked)    │
        └──────────────┘     └──────────────┘
```

Plus three terminal states:
- `expired` — the 60-minute timer ran out
- `abandoned` — user gave up via the panic PIN
- `error` — something went wrong

## Data flow

```
1. User opens PWA, taps "Generate quest"
2. PWA fetches location via navigator.geolocation
3. PWA queries Overpass API for POIs within 2km (cached 7d in IndexedDB)
4. PWA builds QuestContext (setting/season/time/weather from Open-Meteo)
5. PWA calls Gemma (in worker) with system prompt + candidates + context
6. Gemma returns JSON quest prompt + verification hint
7. PWA runs safety filter on the prompt (regex net)
8. PWA persists quest to IndexedDB, displays to user
9. User taps "Accept & lock phone"
10. PWA calls companion localhost /lock (HMAC-signed)
11. Companion starts VpnService, drops all traffic except whitelist
12. User walks to location, takes photo
13. PWA calls Gemma (judge) with photo + quest context
14. Gemma returns {passed, reason, observations}
15. PWA checks GPS proximity of photo (if EXIF GPS available)
16. If both pass: PWA calls companion /unlock, marks quest verified
17. If failed: PWA keeps phone locked, shows reason, user can retry
18. If 60 min timer expires: companion auto-unlocks, marks quest expired
```

## Threat model

We don't claim OpenQuest is unbreakable. We claim it's auditable.

- **Power user can bypass**: someone with developer tools can call
  `companionBridge.unlock()` from the console. We accept this —
  if you're going to that effort, you weren't the target audience.
- **Companion APK is the real lock**: a determined user can uninstall
  the companion. That's by design — the lockout should never be a
  prison. The panic PIN exists for when you need to get out fast.
- **GPS spoofing**: a rooted phone can spoof GPS. We accept this —
  the photo judge (Gemma multimodal) catches most fakes anyway, and
  we're not trying to defeat determined cheaters, just your own
  doomscrolling habit.

## Why this architecture

- **PWA over native app**: ships in 5 minutes, no app store review,
  works on iOS too (with soft-lock only). The companion handles the
  one thing PWAs can't (real lockout).
- **WebGPU + Transformers.js over llama.cpp**: ships in the browser,
  no native bindings, model swaps without rebuilding. The cost is
  slower inference (~10s vs ~3s for llama.cpp) — acceptable for a
  60-minute quest.
- **VpnService over AccessibilityService**: VpnService actually blocks
  network traffic. AccessibilityService can only redirect the user
  back to the app — feels like a real lockout but isn't.
- **Localhost HTTP over IPC**: trivially debuggable (curl from the
  PWA's devtools). The HMAC signature prevents other apps on the
  phone from triggering lockouts.
- **Cloudflare Worker over self-hosted**: free tier covers our volume
  (tens of thousands of requests per day), no ops, global edge.
  Solo mode works without it.

## Limits

- **iOS**: no real lockout possible (no VpnService equivalent). Soft
  lock only.
- **Gemma on phones**: 2.6GB model is too big for most phones. Field
  mode (laptop runs Gemma) is the workaround.
- **Photo GPS EXIF**: most modern browsers strip EXIF from
  `getUserMedia` captures. We fall back to `navigator.geolocation`
  at capture time.
- **VpnService battery**: a 60-min active VPN will drain ~5-10% extra
  battery. Acceptable for the use case.
