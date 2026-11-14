#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# CORPER WEE — ANDROID PLAY STORE RELEASE (.AAB) BUILD SCRIPT
# Builds production Vite bundle, syncs Capacitor Android project, and compiles
# a signed Android App Bundle targeting API 35 (Android 15) / minSdk 24.
# ============================================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "[1/4] Building production WebGL & Admin assets..."
npm ci
npm run lint
npm run build

if [ ! -d "$ROOT_DIR/android" ]; then
  echo "[2/4] Bootstrapping Capacitor Android project..."
  npx --yes @capacitor/cli add android
else
  echo "[2/4] Syncing compiled assets to Capacitor Android..."
  npx --yes @capacitor/cli sync android
fi

if [ -n "${ANDROID_KEYSTORE_BASE64:-}" ]; then
  echo "[3/4] Decoding CI upload keystore..."
  echo "$ANDROID_KEYSTORE_BASE64" | base64 --decode > "$ROOT_DIR/android/app/corperwee-upload-key.jks"
  cat > "$ROOT_DIR/android/keystore.properties" <<EOF
storeFile=corperwee-upload-key.jks
storePassword=${ANDROID_KEYSTORE_PASSWORD:?ANDROID_KEYSTORE_PASSWORD required}
keyAlias=${ANDROID_KEY_ALIAS:-corperwee-release}
keyPassword=${ANDROID_KEY_PASSWORD:?ANDROID_KEY_PASSWORD required}
EOF
fi

echo "[4/4] Building signed Android App Bundle (.aab)..."
cd "$ROOT_DIR/android"
chmod +x ./gradlew
./gradlew bundleRelease --no-daemon

AAB_PATH="$ROOT_DIR/android/app/build/outputs/bundle/release/app-release.aab"
if [ -f "$AAB_PATH" ]; then
  sha256sum "$AAB_PATH"
  echo "Android release bundle ready: $AAB_PATH"
else
  echo "ERROR: Expected App Bundle not found at $AAB_PATH"
  exit 1
fi
