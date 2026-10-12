# Building the Android Companion

## Prerequisites

- **Android Studio** (Hedgehog or newer) — or just the command-line tools
- **JDK 17** — required by AGP 8.7
- **Android SDK 35** (Android 15) — install via `sdkmanager "platforms;android-35"`
- **Android NDK** — not required (we use only Kotlin, no native code)
- A physical Android device (API 29+) for testing — emulators don't
  support VpnService well

## Build

### From Android Studio

1. Open `apps/companion` in Android Studio
2. Let Gradle sync (will download AGP 8.7 + Kotlin 2.0)
3. Select `Build → Build Bundle(s) / APK(s) → Build APK(s)`
4. APK is at `app/build/outputs/apk/debug/app-debug.apk`

### From command line

No Gradle wrapper is committed yet, so use an installed Gradle ≥ 8.9 (AGP 8.7 requires it).

```bash
cd apps/companion
gradle assembleDebug
# APK at: app/build/outputs/apk/debug/app-debug.apk
```

For a release build:

```bash
gradle assembleRelease
# APK at: app/build/outputs/apk/release/app-release.apk
```

(Release build is minified + shrunk via ProGuard. Debug build is not.)

## Install

### Via ADB

```bash
adb install app/build/outputs/apk/debug/app-debug.apk
```

### Via sideloading

1. Transfer the APK to your phone (download, email to self, USB, etc.)
2. Open it in the file manager
3. Allow "Install from unknown sources" if prompted
4. Install

## First-run setup

1. **Open the companion app.** You'll see the main status screen.
2. **Grant VPN permission.** The first time the app tries to start a
   lockout, Android will prompt: "OpenQuest Companion wants to set up
   a VPN connection." Tap OK. This is a one-time grant.
3. **Set panic PIN.** Tap "Set panic PIN" in the app. Enter a 4-digit
   PIN. Avoid 0000, 1234, your birth year.
4. **Pair with the PWA.** Open the OpenQuest PWA in your phone's browser,
   go to Onboarding → Pair the companion. Enter the pairing code shown
   in the companion app.

## Testing the lockout

To verify the lockout works without doing a full quest:

```bash
# From your laptop on the same network (or via ADB port-forwarding)
adb forward tcp:7777 tcp:7777

# Check status
curl http://127.0.0.1:7777/status

# Engage a 1-minute lockout (you'll need to sign the request)
# See docs/LOCKOUT_PROTOCOL.md for the HMAC signature flow
```

For manual testing, you can temporarily comment out the signature
verification in `LocalhostServer.kt` and use unsigned curl requests.

## Troubleshooting

### "VPN connection failed"

The user denied the one-time VPN permission. Re-grant via:
Settings → Apps → OpenQuest Companion → VPN access.

### "Foreground service not starting"

Android 14+ requires foreground services to declare a type. We use
`specialUse` with a description. If your device blocks it, check:
Settings → Apps → OpenQuest Companion → Battery → Allow background activity.

### "Battery drain during lockout"

Expected ~5-10% extra drain per hour of active VPN. If it's higher,
check that the worker thread in `LockoutVpnService` isn't busy-looping
(it should block on `input.read(buffer)` which is a blocking call).

### "Other apps still have internet"

The allowed-domains list might be too permissive. Check
`assets/allowed_domains.json` and `Policy.kt`. If you added a wildcard
like `*.example.com`, that's your bug — we don't support wildcards, only
exact domain matches.

## Distribution

We do NOT plan to publish on the Google Play Store — VpnService + the
lockout mechanic would likely fail review. Distribution is via:

1. **GitHub Releases** — upload the release APK to the releases page
2. **F-Droid** (eventually) — if there's interest, we can submit
3. **Self-host** — anyone can build from source

The README links to the latest release APK.
