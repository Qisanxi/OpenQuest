# OpenQuest Demo Script

For recording the Hacktoberfest submission video.

## Goal

A 60-90 second video showing:
1. OpenQuest generating a real quest from local POIs
2. The phone actually locking when the quest is accepted
3. Walking to the location, taking a photo
4. The photo being judged by the local Gemma model
5. The phone unlocking when the quest completes

## Setup before recording

- Charge phone to >80%
- Disable other notifications (do not disturb)
- Pick a quest you can complete in <5 minutes (bakery or cafe works well)
- Have the companion app installed and paired
- Have Gemma already loaded in the PWA (first load takes 30s, you don't want that in the video)

## Script

### Shot 1 (5s) — Title card

```
OpenQuest
Open-source quests that lock you out until you touch grass.
```

### Shot 2 (10s) — Generate quest

- Open OpenQuest PWA
- Tap "Wake Gemma" (if not already awake)
- Tap "Generate a quest"
- Show the quest card appearing

Voiceover:
> "OpenQuest uses an open-weight Gemma model running locally in the browser via WebGPU. No API, no cloud. The model picks a real place from OpenStreetMap and writes a tiny quest."

### Shot 3 (8s) — Accept & lock

- Tap "Accept & lock phone"
- Show the lockout banner appearing
- Switch to another app (Instagram, Twitter, browser) — show it's offline

Voiceover:
> "When you accept, the companion app runs a VpnService that drops all network traffic except for OpenQuest and OpenStreetMap. You can't doomscroll. You can't check Instagram. The only thing your phone can do is complete the quest."

### Shot 4 (5s) — Emergency call check

- Show the phone dialer with 911 still working (just open it, don't actually call)

Voiceover:
> "Emergency calls always work — they go through the cellular modem, not the VPN."

### Shot 5 (15s) — Walk to location

- Walk to the bakery / park / viewpoint
- Show the OpenQuest app tracking distance and direction
- Show a quick clip of walking outside

Voiceover:
> "The screen is the shortest part of the experience. The walk is the point."

### Shot 6 (10s) — Take photo

- Tap "Take photo"
- Capture the bread / bench / sign
- Tap "Submit"

Voiceover:
> "The photo is judged by Gemma's multimodal vision — also running locally. It checks the photo matches the quest prompt AND that the GPS is within the quest radius."

### Shot 7 (8s) — Judge result

- Show the judge result: "Quest complete!"
- Show the lockout banner disappearing
- Switch to another app — show it's online again

Voiceover:
> "Phone unlocks. You're free to doomscroll again — but you've been outside for 15 minutes, so maybe you don't want to."

### Shot 8 (10s) — Why open

Voiceover (over a static screen showing code or the repo):
> "Every piece is auditable. The LLM runs on your device via WebGPU. The lockout logic is 500 lines of Kotlin. The panic PIN lives in the Android Keystore. There is no server you don't control."

> "A closed app that locks your phone is a dystopia. An open one is a commitment device."

> "OpenQuest. Touch grass or touch nothing."

### Shot 9 (5s) — End card

```
github.com/Qisanxi/OpenQuest
Built for Hacktoberfest 2026 — Touch Grass
```

## Editing tips

- Keep cuts tight — 90s max
- Use phone screen recording (Android built-in) for the app shots
- Use a separate camera (or a friend) for the walking shots
- Add captions — many people watch videos muted
- Background music: something chill, lo-fi beats work

## What NOT to show

- The Gemma download progress (looks slow, kills the magic)
- The companion pairing flow (technical, boring)
- Any errors or fallbacks (looks broken)

## Honesty

If something goes wrong during the demo, keep filming. A genuine
"wait, the model said no, let me try again" moment is more
compelling than a fake perfect run. Judges can tell.
