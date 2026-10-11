#!/usr/bin/env bash
# Cut a new OpenQuest release.
#
# Usage:
#   ./scripts/release.sh 0.2.0
#
# What it does:
#   1. Updates version in root package.json + companion build.gradle.kts
#   2. Updates version in apps/pwa/public/manifest.json
#   3. Builds the PWA (vite build)
#   4. Builds the companion APK (release variant)
#   5. Builds the worker (wrangler deploy --dry-run)
#   6. Creates a git tag v0.2.0
#   7. Pushes the tag
#
# After running, manually:
#   - Upload the APK to GitHub Releases
#   - Deploy the worker: cd apps/worker && npx wrangler deploy
#   - Deploy the PWA: cd apps/pwa && pnpm run deploy (or your preferred host)

set -euo pipefail

VERSION="${1:?Usage: $0 <version> e.g. 0.2.0}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT"

echo "=== Cutting release $VERSION ==="

# 1. Update root package.json
sed -i.bak "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" package.json
rm -f package.json.bak

# 2. Update companion versionName + versionCode
COMPONENTS=$(echo "$VERSION" | tr '.' ' ')
MAJOR=$(echo $COMPONENTS | cut -d' ' -f1)
MINOR=$(echo $COMPONENTS | cut -d' ' -f2)
PATCH=$(echo $COMPONENTS | cut -d' ' -f3)
VERSION_CODE=$((MAJOR * 10000 + MINOR * 100 + PATCH))

sed -i.bak \
  -e "s/versionCode = [0-9]*/versionCode = $VERSION_CODE/" \
  -e "s/versionName = \"[^\"]*\"/versionName = \"$VERSION\"/" \
  apps/companion/app/build.gradle.kts
rm -f apps/companion/app/build.gradle.kts.bak

# 3. Update PWA manifest
sed -i.bak "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" apps/pwa/public/manifest.json
rm -f apps/pwa/public/manifest.json.bak

echo "Updated versions:"
grep '"version"' package.json apps/pwa/public/manifest.json
grep 'versionName\|versionCode' apps/companion/app/build.gradle.kts | head -2

# 4. Build PWA
echo ""
echo "=== Building PWA ==="
pnpm install --frozen-lockfile
pnpm run build:pwa

# 5. Build companion APK
echo ""
echo "=== Building companion APK ==="
bash scripts/build-apk.sh release

# 6. Build worker (dry run)
echo ""
echo "=== Building worker (dry run) ==="
cd apps/worker
pnpm install --frozen-lockfile
npx wrangler deploy --dry-run
cd "$ROOT"

# 7. Tag
echo ""
echo "=== Tagging release ==="
git add package.json apps/pwa/public/manifest.json apps/companion/app/build.gradle.kts
git commit -m "chore: release v$VERSION"
git tag "v$VERSION"
git push origin "v$VERSION"

echo ""
echo "=== Release v$VERSION tagged ==="
echo ""
echo "Manual steps remaining:"
echo "  1. Upload APK to GitHub Releases: apps/companion/app/build/outputs/apk/release/app-release.apk"
echo "  2. Deploy worker: cd apps/worker && npx wrangler deploy"
echo "  3. Deploy PWA: cd apps/pwa && pnpm run deploy (or your preferred host)"
