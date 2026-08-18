#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_ROOT="${BUILD_ROOT:-$ROOT/build}"
INPUT_METHODS_DIR="$HOME/Library/Input Methods"
APPS_DIR="$HOME/Applications"
IME_TARGET="$INPUT_METHODS_DIR/SnipIME.app"
MANAGER_TARGET="$APPS_DIR/SnipIME Manager.app"
IME_STAGE="${IME_TARGET}.installing.$$"
MANAGER_STAGE="${MANAGER_TARGET}.installing.$$"
IME_BACKUP="${IME_TARGET}.backup.$$"
MANAGER_BACKUP="${MANAGER_TARGET}.backup.$$"
COMMITTED=0

remove_install_path() {
  local target="$1"
  case "$target" in
    "$IME_TARGET"|"$MANAGER_TARGET"|\
    "$INPUT_METHODS_DIR"/SnipIME.app.installing.*|\
    "$INPUT_METHODS_DIR"/SnipIME.app.backup.*|\
    "$APPS_DIR"/SnipIME\ Manager.app.installing.*|\
    "$APPS_DIR"/SnipIME\ Manager.app.backup.*) ;;
    *)
      echo "error: refusing to remove unexpected path: $target" >&2
      exit 1
      ;;
  esac
  [[ -e "$target" ]] && rm -R "$target"
}

verify_bundle() {
  local bundle="$1"
  plutil -lint "$bundle/Contents/Info.plist" >/dev/null
  codesign --verify --deep --strict "$bundle"
  local executable
  executable="$(plutil -extract CFBundleExecutable raw "$bundle/Contents/Info.plist")"
  [[ -x "$bundle/Contents/MacOS/$executable" ]]
}

rollback() {
  local exit_code=$?
  if [[ "$COMMITTED" == "0" ]]; then
    remove_install_path "$IME_STAGE"
    remove_install_path "$MANAGER_STAGE"
    remove_install_path "$IME_TARGET"
    remove_install_path "$MANAGER_TARGET"
    [[ -e "$IME_BACKUP" ]] && mv "$IME_BACKUP" "$IME_TARGET"
    [[ -e "$MANAGER_BACKUP" ]] && mv "$MANAGER_BACKUP" "$MANAGER_TARGET"
  fi
  exit "$exit_code"
}

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "error: install.sh must run on macOS." >&2
  exit 1
fi

if [[ ! -d "$BUILD_ROOT/SnipIME.app" || ! -d "$BUILD_ROOT/SnipIME Manager.app" ]]; then
  "$ROOT/Scripts/build.sh"
fi

verify_bundle "$BUILD_ROOT/SnipIME.app"
verify_bundle "$BUILD_ROOT/SnipIME Manager.app"
mkdir -p "$INPUT_METHODS_DIR" "$APPS_DIR"

remove_install_path "$IME_STAGE"
remove_install_path "$MANAGER_STAGE"
remove_install_path "$IME_BACKUP"
remove_install_path "$MANAGER_BACKUP"
ditto "$BUILD_ROOT/SnipIME.app" "$IME_STAGE"
ditto "$BUILD_ROOT/SnipIME Manager.app" "$MANAGER_STAGE"
verify_bundle "$IME_STAGE"
verify_bundle "$MANAGER_STAGE"

trap rollback ERR INT TERM
[[ -e "$IME_TARGET" ]] && mv "$IME_TARGET" "$IME_BACKUP"
[[ -e "$MANAGER_TARGET" ]] && mv "$MANAGER_TARGET" "$MANAGER_BACKUP"
mv "$IME_STAGE" "$IME_TARGET"
mv "$MANAGER_STAGE" "$MANAGER_TARGET"
verify_bundle "$IME_TARGET"
verify_bundle "$MANAGER_TARGET"
COMMITTED=1
trap - ERR INT TERM
remove_install_path "$IME_BACKUP"
remove_install_path "$MANAGER_BACKUP"

killall SnipIME 2>/dev/null || true
killall TextInputMenuAgent 2>/dev/null || true

open "$MANAGER_TARGET"
open "x-apple.systempreferences:com.apple.Keyboard-Settings.extension"

cat <<'EOF'

SnipIMEをインストールしました。
1. システム設定 → キーボード → テキスト入力 → 編集
2. 「＋」から SnipIME を追加
3. 入力メニューで SnipIME を選択
4. 「;sig」のように入力し、Space / Enter で確定

通常の日本語入力には、入力メニューから普段の日本語IMEへ切り替えてください。
EOF
