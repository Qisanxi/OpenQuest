# Contributing to OpenQuest

Thanks for helping people touch grass. OpenQuest is pre-alpha, so there is a lot to do. The [roadmap in the README](README.md#-roadmap) is the best place to start.

## Setup

Requirements: Node.js ≥ 22.12 and pnpm 9. For the companion app: JDK 17, Android SDK 35 and Gradle ≥ 8.9.

```bash
git clone https://github.com/Qisanxi/OpenQuest.git
cd OpenQuest
pnpm install --ignore-scripts
pnpm dev            # PWA on http://localhost:5173
```

Before opening a PR, run what CI runs:

```bash
pnpm typecheck
pnpm test
pnpm build
```

## Pull requests

- One logical change per PR, with an issue it closes (`Closes #123`).
- Branch from `main`. Use `fix/…`, `feat/…`, `docs/…` or `chore/…` names.
- If your PR depends on another open PR, say so in the description. **Merge stacked PRs into `main` in order**, bottom first; merging a PR into another PR's branch does not put it on `main`.
- Explain how you verified the change. Say plainly what you could *not* test (a real device, WebGPU hardware, a real OAuth app).
- Keep changes small and targeted. Avoid drive-by reformatting.
- UI changes need to work on a 360 px wide phone: touch targets at least 44 px, no horizontal scrolling, inputs at 16 px on phones. Include before/after screenshots.

## Safety-sensitive changes

Anything touching `apps/pwa/src/lib/ai/safetyFilter.ts`, the lockout protocol, the panic PIN, or the photo-judging GPS check gets extra scrutiny, because mistakes can put people in danger or lock them out.

- Safety filter: add tests for **both** directions: harmless text that must pass (`petal`) and inflected hazards that must still be rejected (`climbed`, `swims`, `eats`). When in doubt, reject.
- Lockout and panic PIN: update [`docs/LOCKOUT_PROTOCOL.md`](docs/LOCKOUT_PROTOCOL.md) in the same PR and keep the PWA and companion payloads byte-for-byte identical.

## Android companion

CI builds `assembleDebug`. Emulators handle `VpnService` poorly, so note whether you tested on a physical device.

## Reporting security problems

Please don't open a public issue for a vulnerability. Use GitHub's private vulnerability reporting (the repository's **Security** tab → **Report a vulnerability**) if it is enabled, or contact the maintainer directly.

## Code of conduct

Be kind and assume good faith. Harassment of any kind is not welcome.

## License

By contributing you agree that your contributions are licensed under the [Apache License 2.0](LICENSE).
