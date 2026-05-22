---
phase: 03-pdf-export
plan: 04
subsystem: ci + docs
tags: [pdf, smoke-test, ci, agents-md, exp-05]
dependency-graph:
  requires:
    - 03-03 (playwright runtime dep + lazy-install flow)
    - 03-01 (RED stub at packages/cora/tests/smoke/clean-install.sh)
  provides:
    - EXP-05 verifiable proof (`npm install cora` does NOT download Chromium)
    - CI on every push (vitest + smoke + golden)
    - AGENTS.md PDF section (all four new flags + both new error codes)
  affects:
    - .github/workflows/ci.yml (new file)
    - AGENTS.md (Renderer (PDF) section + error code table)
tech-stack:
  added:
    - actions/checkout@v4, oven-sh/setup-bun@v2, actions/setup-node@v4
  patterns:
    - Smoke isolation via $HOME override + npm_config_cache + npm pack tarball
    - CI lane = vitest + smoke + golden; gated Playwright lane stays manual
key-files:
  created:
    - .github/workflows/ci.yml
  modified:
    - packages/cora/tests/smoke/clean-install.sh (replaced TODO stub with real body)
    - AGENTS.md (Renderer (PDF) section, error-code table extensions)
decisions:
  - npm pack strips .npmrc from published tarballs (security feature). Plan 03's
    .npmrc strategy does not survive `npm pack`. EXP-05 still holds because the
    runtime `playwright` npm package does NOT auto-download Chromium in its
    own postinstall (that is `playwright-core` / `@playwright/test` behavior, or
    explicit `npx playwright install`). Smoke script documents this in a comment
    so future maintainers don't reintroduce the broken assertion.
  - CI workflow intentionally omits CORA_TEST_PLAYWRIGHT=1 to avoid a 170MB
    Chromium download on every PR. Gated lane runs manually pre-verify per
    VALIDATION.md sampling.
metrics:
  duration: ~15 min wall clock
  completed: 2026-05-22
---

# Phase 3 Plan 04: Clean-install smoke + AGENTS.md PDF docs + CI wiring Summary

Phase 3 ships with a load-bearing EXP-05 proof, full agent-facing PDF documentation, and CI on every push.

## What Shipped

1. **`packages/cora/tests/smoke/clean-install.sh`** — replaces the Plan 01 RED stub. Builds the package, runs `npm pack`, installs the tarball into an isolated `$HOME` with redirected npm cache, and asserts:
   - cora bin reachable at `node_modules/.bin/cora`
   - Noto Sans TTF fonts shipped at `dist/renderer/assets/fonts/NotoSans-Regular.ttf`
   - playwright runtime dep landed in `node_modules/playwright/` (proves we exercised Playwright's postinstall path — without this the no-Chromium assertion would be vacuous)
   - **No `ms-playwright` cache directory** at either `$HOME/.cache/ms-playwright` (Linux) or `$HOME/Library/Caches/ms-playwright` (macOS). This is the EXP-05 assertion.
   - Cleanup via `trap … EXIT`.

2. **`.github/workflows/ci.yml`** — first CI workflow for the repo. Triggers on push to `main` and on every PR. Steps: checkout → setup-bun → setup-node (needed for `npm pack` in the smoke step) → `bun install --frozen-lockfile` → `bun run build` → `bun x vitest run` (in `packages/cora`) → `bash packages/cora/tests/smoke/clean-install.sh` → `bun run test:golden`. Explicit comment documents why `CORA_TEST_PLAYWRIGHT=1` is intentionally NOT set in default CI.

3. **`AGENTS.md` Renderer (PDF) section** — covers both PDF lanes with copy-pasteable invocations:
   - Default lane: `-o out.pdf`, `--page=a4|letter|a4-portrait|letter-portrait`
   - High-quality lane: `--quality=high`, `--yes`, `CORA_AUTO_INSTALL=1`
   - `CHROMIUM_NOT_INSTALLED` JSON shape (path: `/quality`)
   - `RESVG_FONT_WARNING` JSON shape (path: `/render/resvg`)
   - Both new codes added to the error-code table
   - CI integration YAML snippets (default lane + opt-in `--quality=high`)

4. **`packages/cora/README.md`** — **does not exist on disk**, so no README update was made (per plan must_haves: "if README pre-exists; else skip"). AGENTS.md is the canonical agent-facing doc.

## Verification

- `bash packages/cora/tests/smoke/clean-install.sh` → exits 0 with `[smoke] PASS`. Total runtime ~30s (mostly `bun run build` + `npm install`).
- `bun x vitest run tests/pdf/` → 38 passed, 1 skipped (high-quality.test.ts gated behind `CORA_TEST_PLAYWRIGHT=1`).
- All AGENTS.md grep checks pass (`cora render`, `.pdf`, `quality=high`, `page=a4`, `--yes`, `CORA_AUTO_INSTALL`, `CHROMIUM_NOT_INSTALLED`, `/quality`, `RESVG_FONT_WARNING`).
- All render.ts grep checks pass (`page <size>`, `quality <level>`, `CHROMIUM_NOT_INSTALLED`, `RESVG_FONT_WARNING`) — docs match code.

## Deviations from Plan

### Rule 1 — `.npmrc` strategy from Plan 03 does not survive `npm pack`

**Found during:** Task 1, first execution of the smoke script.

**Issue:** Plan 03 added `packages/cora/.npmrc` with `playwright_skip_browser_download=1` and listed it in `package.json` `files`, expecting it to ship in the published tarball and suppress Chromium download during `npm install cora`. The original Task 1 spec included an assertion `tar -tzf "$TARBALL" | grep -q '/.npmrc$'`. This assertion failed: `npm pack` intentionally strips `.npmrc` from published tarballs (security feature — prevents credential leakage and prevents a published package from overriding consumer's npm config). The `files` array does not override this.

**Empirical finding:** Running `npm install` against the tarball with NO `.npmrc` shipped still results in zero Chromium download. The runtime `playwright` npm package does NOT trigger a Chromium download in its own postinstall — that behavior belongs to `playwright-core` and `@playwright/test`, or to explicit `npx playwright install` invocations. Cora's lazy-install path in `cli/playwrightInstall.ts` is the only Chromium-fetching code path, gated behind `--quality=high` + consent.

**Fix:** Removed the `.npmrc`-in-tarball assertion. Added Assertion 4 (`playwright` runtime dep is present in `node_modules`) so the no-Chromium assertion is non-vacuous. Added a 10-line comment in the script documenting why `.npmrc` is irrelevant and why EXP-05 still holds.

**Files modified:** `packages/cora/tests/smoke/clean-install.sh`.

**Commit:** a389947.

**Open question for Phase 3.1 (not blocking):** The `packages/cora/.npmrc` file is now effectively dead code — it remains useful for monorepo-local development (Playwright won't auto-download when running `bun install` at the repo root) but ships nowhere. Could either delete it or leave it as a defensive measure. Not deleted in this plan to keep changes minimal.

## Authentication Gates

None.

## Known Stubs

None.

## Deferred Issues

Pre-existing baseline issues remain (unrelated to this plan): `bun run test:golden` first-line drift on Phase 2 fixtures, and 4 `tsc --noEmit` errors in `src/core/measureText.ts`. Documented in `.planning/phases/03-pdf-export/deferred-items.md`. Not touched per execution-context instructions.

## Self-Check: PASSED

- `packages/cora/tests/smoke/clean-install.sh` FOUND (executable, no TODO string)
- `.github/workflows/ci.yml` FOUND (contains `vitest`, `clean-install.sh`, no `CORA_TEST_PLAYWRIGHT=1`)
- `AGENTS.md` FOUND with all required substrings (grep verified above)
- Commit a389947 FOUND (Task 1: smoke + CI)
- Commit a6533a7 FOUND (Task 2: AGENTS.md docs)
