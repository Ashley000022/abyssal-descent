# SnipIME Verification Record

**Date:** 2026-08-18  
**Branch:** `feat/snipime-macos`

## Automated checks completed

| Check | Result |
|---|---|
| Swift toolchain | Swift 6.3.3 official Ubuntu 24.04 toolchain |
| SnipCore build | Passed |
| SnipCore unit tests | **20 passed, 0 failed** |
| Ranking tests | Exact match priority, frequency/recency, Japanese search, width normalization, long prefix, limit |
| Engine tests | Trigger, filtering, confirm, Space, Escape, Backspace, navigation, normal pass-through |
| Store tests | Unicode/newline round trip, CRUD, usage, stale edit preservation, duplicate rejection, owner-only permissions |
| macOS source syntax parse | Passed for all AppKit and InputMethodKit Swift files |
| Swift format lint | Passed with no findings |
| ShellCheck | Passed for build, install, verify, and uninstall scripts |
| Shell syntax | Passed |
| plist XML validation | Passed |
| IME metadata invariants | Passed: `.inputmethod.` bundle ID, source ID hierarchy, controller and connection names |
| Git diff whitespace | Passed |
| Independent code reviews | Two completed; launch, concurrency, data safety, candidate identity, installer, and editor findings corrected |

## macOS-only verification

This execution environment is Linux and does not contain the macOS SDK, so the final AppKit/InputMethodKit type-check, `.app` assembly, input-source registration, and live candidate-window interaction were not executed here. Run the following on a Mac with Xcode Command Line Tools:

```bash
cd macos/SnipIME
Scripts/verify.sh
Scripts/install.sh
```

The first script runs unit tests, compiles both executables against the macOS SDK, assembles and signs both app bundles, validates plist metadata, and verifies signatures. The second performs a staged, verified installation with rollback.

## Live smoke-test checklist

1. Add **SnipIME** in System Settings → Keyboard → Text Input.
2. Select SnipIME from the input menu.
3. Type `;sig`; confirm the candidate window appears.
4. Press Space or Enter; confirm `Best,` and `Ash` are inserted on separate lines.
5. Type ordinary text outside snippet composition; confirm the host application handles it normally.
6. Type `;unknown` then Enter; confirm the literal remains and Enter still inserts a newline.
7. Edit a snippet in SnipIME Manager and confirm the next query uses the new value without restarting.
8. Confirm `~/Library/Application Support/SnipIME` is mode `0700` and `snippets.json` is `0600`.
