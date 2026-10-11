#!/usr/bin/env bash
# Start OpenQuest dev environment.
#
# Usage:
#   ./scripts/dev.sh            # start PWA only (default)
#   ./scripts/dev.sh pwa        # start PWA only
#   ./scripts/dev.sh worker     # start Cloudflare Worker only
#   ./scripts/dev.sh all        # start PWA + Worker (parallel)
#
# Prereqs:
#   - pnpm installed (npm install -g pnpm)
#   - For worker: wrangler installed, D1 + R2 bindings configured
#   - For companion: Android SDK + JDK 17

set -euo pipefail

TARGET="${1:-pwa}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT"

case "$TARGET" in
  pwa)
    echo "Starting PWA dev server…"
    pnpm install --frozen-lockfile 2>/dev/null || pnpm install
    pnpm run dev:pwa
    ;;
  worker)
    echo "Starting Cloudflare Worker dev server…"
    cd apps/worker
    pnpm install --frozen-lockfile 2>/dev/null || pnpm install
    npx wrangler dev
    ;;
  all)
    echo "Starting PWA + Worker in parallel…"
    pnpm install --frozen-lockfile 2>/dev/null || pnpm install
    pnpm run dev:pwa &
    PID_PWA=$!
    cd apps/worker
    pnpm install --frozen-lockfile 2>/dev/null || pnpm install
    npx wrangler dev &
    PID_WORKER=$!
    cd "$ROOT"
    trap "kill $PID_PWA $PID_WORKER 2>/dev/null || true" EXIT
    wait
    ;;
  *)
    echo "Unknown target: $TARGET"
    echo "Usage: $0 [pwa|worker|all]"
    exit 1
    ;;
esac
