#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_ROOT="${BUILD_ROOT:-$ROOT/build}"
INPUT_METHODS_DIR="$HOME/Library/Input Methods"
APPS_DIR="$HOME/Applications"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "error: install.sh must run on macOS." >&2
  exit 1
fi

if [[ ! -d "$BUILD_ROOT/SnipIME.app" || ! -d "$BUILD_ROOT/SnipIME Manager.app" ]]; then
  "$ROOT/Scripts/build.sh"
fi

mkdir -p "$INPUT_METHODS_DIR" "$APPS_DIR"
rm -rf "$INPUT_METHODS_DIR/SnipIME.app" "$APPS_DIR/SnipIME Manager.app"
ditto "$BUILD_ROOT/SnipIME.app" "$INPUT_METHODS_DIR/SnipIME.app"
ditto "$BUILD_ROOT/SnipIME Manager.app" "$APPS_DIR/SnipIME Manager.app"

killall SnipIME 2>/dev/null || true
killall TextInputMenuAgent 2>/dev/null || true

open "$APPS_DIR/SnipIME Manager.app"
open "x-apple.systempreferences:com.apple.Keyboard-Settings.extension"

cat <<'EOF'

SnipIMEをインストールしました。
1. システム設定 → キーボード → テキスト入力 → 編集
2. 「＋」から SnipIME を追加
3. 入力メニューで SnipIME を選択
4. 「;sig」のように入力し、Space / Enter で確定

通常の日本語入力には、入力メニューから普段の日本語IMEへ切り替えてください。
EOF
