#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "error: full SnipIME verification requires macOS and the macOS SDK." >&2
  exit 1
fi

cd "$ROOT"
echo "==> Swift toolchain"
swift --version

echo "==> Unit tests"
swift test

echo "==> App bundle build"
Scripts/build.sh

echo "==> Bundle metadata"
plutil -lint \
  "build/SnipIME.app/Contents/Info.plist" \
  "build/SnipIME Manager.app/Contents/Info.plist"

echo "==> Signatures"
codesign --verify --deep --strict --verbose=2 "build/SnipIME.app"
codesign --verify --deep --strict --verbose=2 "build/SnipIME Manager.app"

echo "SnipIME verification passed."
