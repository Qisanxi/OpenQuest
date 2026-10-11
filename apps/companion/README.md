# OpenQuest Companion

Tiny Android app that locks the phone during an OpenQuest quest.

## What it does

The companion runs a localhost HTTP server on port 7777. The OpenQuest PWA
sends lock/unlock requests to it. When a lock is active, the companion runs
a VpnService that drops all network traffic except for whitelisted domains
(OpenQuest itself, OSM tiles, emergency calls).

## Why a separate app

A PWA can't lock your phone — browser sandboxes prevent it. The companion is
the only piece that needs native Android permissions (VpnService + foreground
service). Everything else (quest generation, photo judging, UI) runs in the
PWA via WebGPU.

## Build

```bash
cd apps/companion
./gradlew assembleRelease
# APK at: app/build/outputs/apk/release/app-release.apk
```

You'll need Android SDK 35 (Android 15) and JDK 17.

## Sideload

```bash
adb install app/build/outputs/apk/release/app-release.apk
```

Or transfer the APK to your phone and tap it in the file manager.

## Pairing

1. Open the companion app. It will show a pairing code.
2. Open the OpenQuest PWA, go to Onboarding → Pair the companion.
3. Enter the pairing code.
4. The PWA verifies by calling `http://127.0.0.1:7777/status` on the same
   device. If the companion is running and the code matches, pairing succeeds.

## Safety

- **Emergency calls always work.** They go through the cellular modem,
  not VpnService. Android does not let VpnService block emergency calls.
- **Panic PIN.** Set a 4-digit PIN during onboarding. Entering it
  force-unlocks the phone for 24 hours. Use it if you get hurt, need
  directions, or have any emergency.
- **Lost PIN?** Uninstall the companion. That clears the EncryptedSharedPreferences
  (where the PIN hash lives), stops the foreground service, and unlocks
  the phone immediately.

## Audit

The whole companion is ~500 lines of Kotlin:

- `MainActivity.kt` — UI
- `LockoutService.kt` — foreground service orchestrator
- `LockoutVpnService.kt` — the actual packet blocker
- `LocalhostServer.kt` — NanoHTTPD on 127.0.0.1:7777
- `PanicPinManager.kt` — EncryptedSharedPreferences + SHA-256 + salt
- `Policy.kt` — allowed domains list
- `LockoutState.kt` — in-memory state

Read all of it in an afternoon. That's the point.

## License

Apache 2.0.
