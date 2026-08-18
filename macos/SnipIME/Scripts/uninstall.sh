#!/usr/bin/env bash
set -euo pipefail

INPUT_METHOD="$HOME/Library/Input Methods/SnipIME.app"
MANAGER="$HOME/Applications/SnipIME Manager.app"
DATA_DIR="$HOME/Library/Application Support/SnipIME"

killall SnipIME 2>/dev/null || true

for target in "$INPUT_METHOD" "$MANAGER"; do
  if [[ -e "$target" ]]; then
    rm -rf "$target"
    echo "Removed $target"
  fi
done

if [[ "${DELETE_DATA:-0}" == "1" && -d "$DATA_DIR" ]]; then
  rm -rf "$DATA_DIR"
  echo "Removed $DATA_DIR"
else
  echo "Snippet data kept at: $DATA_DIR"
  echo "Run DELETE_DATA=1 Scripts/uninstall.sh to remove it too."
fi

killall TextInputMenuAgent 2>/dev/null || true
