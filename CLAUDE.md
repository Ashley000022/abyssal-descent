# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"ABYSSAL" — an interactive deep-sea descent website where scrolling takes the user 10,935 m down to the Mariana Trench, with real-time depth/pressure/temperature telemetry, zone indicators, bioluminescent particle effects, and AI-generated creature images.

## Commands

Uses **pnpm** (pinned via `packageManager` in package.json).

```bash
pnpm install        # install deps (applies patches/wouter@3.7.1.patch)
pnpm dev            # Vite dev server on port 3000 (falls back to next free port)
pnpm build          # vite build → dist/public, then esbuild server → dist/index.js
pnpm start          # serve the production build (NODE_ENV=production node dist/index.js)
pnpm preview        # vite preview of the built client
pnpm check          # TypeScript typecheck (tsc --noEmit)
pnpm format         # Prettier over the whole repo
```

There is no test suite or test script (vitest is installed but unused) and no linter beyond `pnpm check` + Prettier.

## Architecture — read this first

**The entire live site is a single self-contained static file: `client/public/index.html`** (~840 lines of inline CSS + vanilla JS, no React, no build step). All content edits — copy, styles, zone sections, telemetry logic, animations — happen in that one file.

The React app under `client/src/` is leftover scaffolding from the Manus "web-static" template: `App.tsx` (and `pages/Home.tsx`) just do `window.location.href = "/index.html"`. Do not add features to the React tree unless deliberately migrating off the static file.

Structure of `client/public/index.html`:
- Fixed atmosphere layers (`#snow` canvas particles, light rays, vignette) and a HUD showing DEPTH / PRESS / TEMP / LIGHT / ZONE, all driven by scroll position via the inline `<script>` at the bottom.
- Content is a hero `<section>` followed by five `<section class="zone" id="zone-1..5">` (one per ocean zone, each with a `--zc` accent color CSS variable) and a `<section class="finale">`.
- Creature images load from `/manus-storage/<key>.png`; the hero background is `/hero-abyssal.png` (checked into `client/public/`).

**Serving layers:**
- Dev: Vite (root = `client/`) with custom plugins in `vite.config.ts`:
  - `vitePluginStorageProxy` — proxies `/manus-storage/*` to presigned URLs from the Forge storage API. Requires `BUILT_IN_FORGE_API_URL` and `BUILT_IN_FORGE_API_KEY` env vars; without them creature images 500 in dev (they work in the deployed environment).
  - `vitePluginManusDebugCollector` — injects a script that POSTs browser console/network/session logs to the dev server, written to `.manus-logs/*.log` (auto-trimmed at 1MB). Useful for debugging browser behavior without a visible browser.
- Prod: `server/index.ts` is a minimal Express static server for `dist/public` with an SPA fallback to `index.html`. It has no API routes.

**Other files:**
- `template.json` — snapshot of the original Manus template files; not application code, don't edit.
- `components.json` — shadcn/ui config (new-york style); no components have been generated yet under `client/src/components/ui`.
- Path aliases: `@/*` → `client/src/*`, `@shared/*` → `shared/*` (defined in both tsconfig.json and vite.config.ts — keep in sync if changed).

## Conventions

- TypeScript strict mode; typecheck covers `client/src`, `shared`, and `server`.
- Prettier: 80-char width, 2-space indent, double quotes, semicolons, `arrowParens: "avoid"`.
- The static `index.html` uses CSS custom properties (`--acc-1..5` accent colors, `--mono`/`--disp`/`--body` font stacks) defined in its `:root` — reuse them rather than hardcoding values.
