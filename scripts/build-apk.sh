#!/usr/bin/env bash
# Build the OpenQuest Android companion APK.
#
# Usage:
#   ./scripts/build-apk.sh           # debug APK
#   ./scripts/build-apk.sh release   # release APK (minified)
#
# Output: apps/companion/app/build/outputs/apk/{debug,release}/

set -euo pipefail

BUILD_TYPE="${1:-debug}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT/apps/companion"

# Check for Android SDK
if [ -z "${ANDROID_HOME:-}" ] && [ -z "${ANDROID_SDK_ROOT:-}" ]; then
  echo "ERROR: ANDROID_HOME (or ANDROID_SDK_ROOT) not set."
  echo "Install Android Studio or run: sdkmanager \"platforms;android-35\""
  exit 1
fi

# Check for JDK 17
JAVA_VER=$(java -version 2>&1 | head -1 | awk -F\" '{print $2}' | cut -d. -f1)
if [ "$JAVA_VER" != "17" ]; then
  echo "WARNING: JDK 17 recommended, detected $JAVA_VER."
fi

# Make gradle wrapper executable if present
if [ -f "./gradlew" ]; then
  chmod +x ./gradlew
  GRADLE="./gradlew"
else
  GRADLE="gradle"
fi

echo "Building $BUILD_TYPE APK…"
$GRADLE "assemble${BUILD_TYPE^}"

APK_PATH="app/build/outputs/apk/$BUILD_TYPE/app-$BUILD_TYPE.apk"
if [ -f "$APK_PATH" ]; then
  echo "----------------------------------------"
  echo "Built: $APK_PATH"
  ls -lh "$APK_PATH"
  echo "----------------------------------------"
  echo "Install: adb install $APK_PATH"
else
  echo "ERROR: APK not found at expected path"
  exit 1
fi
