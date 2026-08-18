#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_ROOT="${BUILD_ROOT:-$ROOT/build}"
CONFIGURATION="${CONFIGURATION:-release}"
SIGN_IDENTITY="${SIGN_IDENTITY:--}"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "error: SnipIME app bundles must be built on macOS." >&2
  exit 1
fi

cd "$ROOT"
echo "==> Running core tests"
swift test

echo "==> Building Swift executables"
swift build -c "$CONFIGURATION" --product SnipIME
swift build -c "$CONFIGURATION" --product SnipIMEManager
BIN_DIR="$(swift build -c "$CONFIGURATION" --show-bin-path)"

APP_DIR="$BUILD_ROOT/SnipIME.app"
MANAGER_DIR="$BUILD_ROOT/SnipIME Manager.app"
rm -rf "$APP_DIR" "$MANAGER_DIR"
mkdir -p \
  "$APP_DIR/Contents/MacOS" \
  "$APP_DIR/Contents/Resources" \
  "$APP_DIR/Contents/Library/LoginItems" \
  "$MANAGER_DIR/Contents/MacOS" \
  "$MANAGER_DIR/Contents/Resources"

cp "$BIN_DIR/SnipIME" "$APP_DIR/Contents/MacOS/SnipIME"
cp "$BIN_DIR/SnipIMEManager" "$MANAGER_DIR/Contents/MacOS/SnipIMEManager"
cp "$ROOT/Resources/SnipIME-Info.plist" "$APP_DIR/Contents/Info.plist"
cp "$ROOT/Resources/SnipIMEManager-Info.plist" "$MANAGER_DIR/Contents/Info.plist"

ICON_SOURCE="$ROOT/Resources/AppIcon-1024.png"
ICONSET="$BUILD_ROOT/AppIcon.iconset"
rm -rf "$ICONSET"
mkdir -p "$ICONSET"
for size in 16 32 128 256 512; do
  double=$((size * 2))
  sips -z "$size" "$size" "$ICON_SOURCE" --out "$ICONSET/icon_${size}x${size}.png" >/dev/null
  sips -z "$double" "$double" "$ICON_SOURCE" --out "$ICONSET/icon_${size}x${size}@2x.png" >/dev/null
done
iconutil -c icns "$ICONSET" -o "$BUILD_ROOT/AppIcon.icns"
cp "$BUILD_ROOT/AppIcon.icns" "$APP_DIR/Contents/Resources/AppIcon.icns"
cp "$BUILD_ROOT/AppIcon.icns" "$MANAGER_DIR/Contents/Resources/AppIcon.icns"

# Keep a bundled fallback so the input menu can always open the manager.
cp -R "$MANAGER_DIR" "$APP_DIR/Contents/Library/LoginItems/SnipIME Manager.app"

if [[ "$SIGN_IDENTITY" == "-" ]]; then
  echo "==> Signing ad hoc (local development)"
else
  echo "==> Signing with: $SIGN_IDENTITY"
fi
codesign --force --deep --options runtime --sign "$SIGN_IDENTITY" "$MANAGER_DIR"
codesign --force --deep --options runtime --sign "$SIGN_IDENTITY" "$APP_DIR"

codesign --verify --deep --strict --verbose=2 "$MANAGER_DIR"
codesign --verify --deep --strict --verbose=2 "$APP_DIR"
plutil -lint "$APP_DIR/Contents/Info.plist" "$MANAGER_DIR/Contents/Info.plist"

echo
printf 'Built:\n  %s\n  %s\n' "$APP_DIR" "$MANAGER_DIR"
