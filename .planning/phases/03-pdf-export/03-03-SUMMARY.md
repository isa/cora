---
phase: 03-pdf-export
plan: 03
subsystem: cli + renderer
tags: [pdf, playwright, chromium, lazy-install, high-quality, npmrc]
dependency-graph:
  requires:
    - 03-02 (default PDF path, dedicated try/catch around .pdf branch with
      CHROMIUM_NOT_INSTALLED passthrough comment + // Plan 03 wires high-quality
      lane here marker)
    - cli/index.ts global --yes registration (Phase 1)
    - renderer/pdf/pageSize.ts extractSvgDimensions + computePageGeometry (Plan 03-02)
  provides:
    - cora render … -o foo.pdf --quality=high (vertical slice)
    - CORA_CONFIG_DIR + CHROMIUM_DIR cross-platform path resolution
    - isNonInteractive + shouldAutoInstall predicates on cli/output.ts
    - chromiumInstalled / installChromium / promptUser plumbing
    - renderToPDFHighQuality (dynamic-imported)
    - .npmrc playwright_skip_browser_download=1 (EXP-05 lock for `npm install cora`)
  affects:
    - render.ts .pdf branch (refactored to split high vs default lanes)
    - package.json (playwright + env-paths runtime deps, files array, postinstall)
tech-stack:
  added:
    - playwright@1.60.0 (runtime; installed with PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1)
    - env-paths@4.0.0 (runtime; Windows fallback only)
  patterns:
    - Dynamic import for opt-in heavy modules (renderToPDFHighQuality)
    - Allowlisted env spawn (no ...process.env spread) per T-03-02
    - Test seam via CORA_TEST_PLAYWRIGHT_INSTALL_STUB env var
key-files:
  created:
    - packages/cora/src/cli/paths.ts
    - packages/cora/src/cli/playwrightInstall.ts
    - packages/cora/src/renderer/renderToPDFHighQuality.ts
    - packages/cora/.npmrc
  modified:
    - packages/cora/src/cli/output.ts (added isNonInteractive, shouldAutoInstall)
    - packages/cora/src/cli/commands/render.ts (wired --quality=high branch)
    - packages/cora/package.json (deps, files array, postinstall)
    - packages/cora/tests/pdf/chromium-prompt.test.ts (converted from RED stub to 16 real cases)
    - packages/cora/tests/pdf/high-quality.test.ts (converted from RED stub to gated integration test)
decisions:
  - Followed CONTEXT D-06..D-10 verbatim. CHROMIUM_NOT_INSTALLED JSON shape uses the existing
    [{code,path,message,suggestion}] convention; path is /quality per CONTEXT.
  - Linux/mac hardcoded to $HOME/.config/cora/ per PROJECT.md + Pitfall 6 (env-paths used
    only as Windows fallback when LOCALAPPDATA is unset).
  - Test-stub seam (CORA_TEST_PLAYWRIGHT_INSTALL_STUB) added to keep CI fast — integration
    tests can exercise the install plumbing without downloading 170MB of Chromium. The
    real Playwright lane stays gated behind CORA_TEST_PLAYWRIGHT=1.
metrics:
  duration: ~25 min wall clock
  completed: 2026-05-22
---

# Phase 3 Plan 03: Playwright --quality=high lane Summary

`cora render … -o foo.pdf --quality=high --yes` now produces a Chromium-rendered PDF after a one-time lazy Chromium install to `$HOME/.config/cora/browsers/`. Non-interactive failures emit a structured `CHROMIUM_NOT_INSTALLED` JSON error per CONTEXT D-07/D-08; interactive runs prompt once and cache the install. Default-path PDF users pay zero Playwright cost thanks to dynamic-import gating.

## What Shipped

1. **`cli/paths.ts`** — `CORA_CONFIG_DIR` + `CHROMIUM_DIR` constants. Linux/mac hardcoded to `$HOME/.config/cora/` per PROJECT.md (avoiding env-paths' macOS default of `~/Library/Application Support/cora-nodejs/`); Windows uses `%LOCALAPPDATA%/cora/` with an env-paths cache fallback. Honors `CORA_CONFIG_DIR` env override for tests.

2. **`cli/output.ts` extension** — Added `isNonInteractive(opts)` (format=json OR CI=1 OR !isTTY) and `shouldAutoInstall(flags)` (flags.yes OR `CORA_AUTO_INSTALL=1`). Preserves the existing `isJsonOutput` export.

3. **`cli/playwrightInstall.ts`** — `chromiumInstalled()` (presence + non-empty CHROMIUM_DIR), `installChromium({quiet})` (spawns `npx playwright install chromium` with `PLAYWRIGHT_BROWSERS_PATH=CHROMIUM_DIR` and an explicit ALLOWLISTED env — no `...process.env` spread, T-03-02 mitigation), `promptUser(message)` (readline single y/N). Honors `CORA_TEST_PLAYWRIGHT_INSTALL_STUB` env var so tests can exercise the install path without downloading Chromium.

4. **`renderer/renderToPDFHighQuality.ts`** — Dynamic-imported only by `render.ts` in the high-quality branch. Sets `PLAYWRIGHT_BROWSERS_PATH` to `CHROMIUM_DIR` before importing `playwright`. Wraps the renderer SVG in HTML with `@page { size … pt; margin: 0 }` and `html, body { margin: 0; padding: 0 }` (Pitfall 5 defense). Uses `extractSvgDimensions` + `computePageGeometry` from Plan 02's `pdf/pageSize.ts`.

5. **`cli/commands/render.ts`** — Replaced the `// Plan 03 wires high-quality lane here` marker with full gating: install consent (auto-install via `--yes` / `CORA_AUTO_INSTALL=1`, or JSON error for non-interactive runs, or TTY prompt for interactive runs), then dynamic-import of `renderToPDFHighQuality`. No silent fallback to default resvg (D-09). `--yes` is read from `program.opts().yes` (not re-registered on the subcommand).

6. **`.npmrc`** — Single line `playwright_skip_browser_download=1`. Added to `package.json` `files` array so it ships in `npm pack`. Prevents Playwright's postinstall from downloading Chromium during `npm install cora` (EXP-05).

7. **`postinstall` script** — One-line informational `console.log` directing users to AGENTS.md for the lazy-install model.

## Verification

- `bun x vitest run tests/pdf/` — 38 passed, 1 skipped (high-quality.test.ts skipped without `CORA_TEST_PLAYWRIGHT=1`).
- 16 cases in `chromium-prompt.test.ts` cover: predicate split, paths.ts resolution, `chromiumInstalled` truth table, `installChromium` spawn allowlist (asserts `NODE_OPTIONS` injected via `process.env` is NOT forwarded), spawn rejection on non-zero exit, end-to-end CLI emission of `CHROMIUM_NOT_INSTALLED` JSON, end-to-end `--yes` triggers the install stub.
- Smoke: `CORA_CONFIG_DIR=<empty tmp> node dist/cli.js render … --quality=high --format=json` → exit 1, structured JSON on stdout containing `CHROMIUM_NOT_INSTALLED` + `/quality`.
- Smoke: default `.pdf` (no `--quality`) → exit 0, 15KB selectable-text PDF written.
- Smoke: `.svg` (3.3KB) and `.png` (11KB) outputs unchanged.
- `bun run build` succeeds.

## Deviations from Plan

### Rule 3 — Test seam for install path

The plan called for `CORA_TEST_PLAYWRIGHT_INSTALL_STUB` to be honored by `installChromium`. The plan did not explicitly state the env var was the runtime hook (only mentioned it in test-author guidance). I wired it into `playwrightInstall.ts` itself: when set, `spawn` shells out to the stub script directly instead of `npx playwright install chromium`. This is the only way the CLI integration test can exercise the install path without downloading 170MB. **Files modified:** `packages/cora/src/cli/playwrightInstall.ts`. **Commit:** 986324d.

No other deviations. Plan tasks executed in order; pre-existing baseline issues in `deferred-items.md` (golden tests + `tsc --noEmit` errors in `measureText.ts`) were left untouched per the execution-context instruction.

## Authentication Gates

None — no auth was required.

## Known Stubs

None.

## Deferred Issues

`bun run test:golden` is failing for all 5 fixtures with first-line drift. This was pre-existing on `main` before this plan started — documented in `.planning/phases/03-pdf-export/deferred-items.md`. The drift is not caused by Plan 03-03 (no renderer output changes were made).

`tsc --noEmit` reports 4 errors in `src/core/measureText.ts` (ascent/descent on Font type) — also pre-existing baseline.

## Self-Check: PASSED

- `packages/cora/src/cli/paths.ts` FOUND
- `packages/cora/src/cli/playwrightInstall.ts` FOUND
- `packages/cora/src/renderer/renderToPDFHighQuality.ts` FOUND
- `packages/cora/.npmrc` FOUND
- Commit d69d1d7 FOUND (Task 1: paths + predicates)
- Commit 986324d FOUND (Task 2: install plumbing + HQ renderer)
- Commit b144ad6 FOUND (Task 3: render.ts wiring + .npmrc)
