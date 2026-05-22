---
phase: 03
plan: 01
subsystem: pdf-export
tags: [pdf, vitest, fonts, wave-0]
requires: []
provides:
  - vitest framework wired into packages/cora
  - NotoSans TTF assets vendored (OFL 1.1) for pdf-lib embedding
  - shared assets/fonts.ts helper exporting resolveFontPath, resvgFontBuffers, pdfLibFontBuffers
  - RED test stubs for all Phase 3 Wave 1+ behaviors
affects:
  - packages/cora/package.json
  - packages/cora/src/renderer/renderToPNG.ts
tech-stack:
  added:
    - vitest@4.1.7 (devDependency)
    - pdf-parse@2.4.5 (devDependency)
  patterns:
    - shared font-resolution helper consumed by both PNG and (forthcoming) PDF renderers
    - vitest describe.skip / it.todo for RED stubs without crashing CI
key-files:
  created:
    - packages/cora/vitest.config.ts
    - packages/cora/src/renderer/assets/fonts.ts
    - packages/cora/src/renderer/assets/fonts/NotoSans-Regular.ttf
    - packages/cora/src/renderer/assets/fonts/NotoSans-SemiBold.ttf
    - packages/cora/src/renderer/assets/fonts/SOURCES.md
    - packages/cora/tests/pdf/page-size.test.ts
    - packages/cora/tests/pdf/render-pdf.test.ts
    - packages/cora/tests/pdf/resvg-warning.test.ts
    - packages/cora/tests/pdf/chromium-prompt.test.ts
    - packages/cora/tests/pdf/high-quality.test.ts
    - packages/cora/tests/smoke/clean-install.sh
    - .planning/phases/03-pdf-export/deferred-items.md
  modified:
    - packages/cora/package.json
    - packages/cora/src/renderer/renderToPNG.ts
    - bun.lock
decisions:
  - vitest 4.1.7 used (latest stable from bun add -d) instead of 2.x noted in research — pure dev-tooling change, no API impact on stub-level usage
  - resolveFontPath kept as a verbatim 2-candidate lookup per 03-PATTERNS.md; the 3rd ../../src/... candidate in RESEARCH sketch was NOT added (would only be needed if Wave 1+ tests prove necessity)
  - vitest stubs use describe.skip + it.todo (not failing assertions) so the suite exits 0 — Wave 1+ converts to real tests
  - high-quality.test.ts gated by CORA_TEST_PLAYWRIGHT=1 to keep default CI free of 170MB Chromium download
  - tests/smoke/clean-install.sh is a shell smoke test (not vitest) — explicitly excluded from vitest include glob
metrics:
  duration: ~12 minutes
  completed: 2026-05-22
  tasks: 4
  files-created: 12
  files-modified: 3
  commits: 4
---

# Phase 03 Plan 01: Wave 0 PDF Test/Font Scaffolding Summary

Wave 0 walking-slice prep for Phase 3 PDF Export: vitest + pdf-parse installed, NotoSans TTF assets vendored under OFL 1.1 provenance, font-resolution refactored out of `renderToPNG.ts` into a shared `assets/fonts.ts` helper, and six RED stub test files committed (12 todos across vitest + 1 shell smoke stub) so Plans 02–04 see failing→passing transitions per task instead of authoring tests and code in the same commit.

## What Shipped

### Test infrastructure
- **vitest 4.1.7** + **pdf-parse 2.4.5** installed as `devDependencies` via `bun add -d` (lockfile updated).
- `packages/cora/vitest.config.ts` with `include: ['tests/**/*.test.ts']`, `reporters: 'default'`, `testTimeout: 30000` — non-watch only, honoring the D-VALIDATION "no watch flags" rule.
- `test` script in `package.json` runs `vitest run --passWithNoTests`; existing `test:golden` script left untouched.

### Font assets (OFL 1.1, vendored)
- `packages/cora/src/renderer/assets/fonts/NotoSans-Regular.ttf` (622 KB)
- `packages/cora/src/renderer/assets/fonts/NotoSans-SemiBold.ttf` (625 KB)
- `packages/cora/src/renderer/assets/fonts/SOURCES.md` — provenance: `notofonts/notofonts.github.io@c0f00677ac9a4d2d019ab283d1848af3acaacc8f`, both SHA-256 hashes, OFL 1.1 license notice, and vendor date (2026-05-22). Satisfies T-03-W0-01 mitigation from the threat model.
- Verified `bun run build && ls dist/renderer/assets/fonts/` shows all four font files (TTF + WOFF) under `dist/` — the existing `cp -r src/renderer/assets dist/renderer/` build step picks the TTFs up automatically (Pitfall 1 sidestepped).

### Shared font helper
- New `packages/cora/src/renderer/assets/fonts.ts` exports:
  - `resolveFontPath(filename)` — verbatim 2-candidate path lookup lifted from `renderToPNG.ts`.
  - `resvgFontBuffers()` — cached `Buffer[]` of WOFF Regular + SemiBold (renamed from `renderFontBuffers`).
  - `pdfLibFontBuffers()` — NEW; cached `{ regular: Buffer, semibold: Buffer }` of TTFs for the forthcoming `renderToPDF.ts`.
- `renderToPNG.ts` now imports `resvgFontBuffers` from `./assets/fonts.js`. End-to-end smoke via the production bundle (`dist/renderer/index.js`) confirmed `renderToPNG()` still produces a valid PNG (`89504e47` header) for a sample SVG — proving the refactor preserved PNG render behavior.

### RED test stubs (Wave 1+ targets)
- `tests/pdf/page-size.test.ts` — `describe.skip('computePageGeometry')`, 3 todos
- `tests/pdf/render-pdf.test.ts` — `describe.skip('renderToPDF default path')`, 3 todos
- `tests/pdf/resvg-warning.test.ts` — `describe.skip('resvg stderr capture')`, 2 todos
- `tests/pdf/chromium-prompt.test.ts` — `describe.skip('--quality=high predicate split')`, 3 todos
- `tests/pdf/high-quality.test.ts` — gated `describe.skip` (only enabled when `CORA_TEST_PLAYWRIGHT=1`), 1 todo
- `tests/smoke/clean-install.sh` — `chmod +x`, stub body `echo "TODO: …"; exit 0;`

`bun x vitest run` reports `5 skipped files, 12 todo tests, exit 0`. Acceptance criteria threshold was ≥11 todos — met.

## Commits

| Hash      | Type       | Message                                                                  |
| --------- | ---------- | ------------------------------------------------------------------------ |
| `0783c79` | `chore`    | add vitest + pdf-parse dev deps and vitest config                        |
| `310dd48` | `chore`    | vendor NotoSans Regular + SemiBold TTF for pdf-lib embedding             |
| `bd6447d` | `refactor` | extract font resolution into shared assets/fonts.ts                      |
| `b2eccb0` | `test`     | scaffold RED stub tests for Phase 3 PDF export waves                     |

## Deviations from Plan

### Auto-adjusted (no user input required)

**1. [Rule 3 - Blocking] vitest version differs from research note**
- **Found during:** Task 1
- **Issue:** 03-RESEARCH.md "Standard Stack" notes "vitest 2.x"; `bun add -d vitest` resolved to vitest 4.1.7 (current latest).
- **Fix:** Used vitest 4.1.7. The plan's task only requires that vitest can run tests (with `--passWithNoTests` on empty discovery) — stub usage (`describe.skip`, `it.todo`) is identical between 2.x and 4.x. No API-breaking change.
- **Files modified:** `packages/cora/package.json`, `bun.lock`
- **Commit:** `0783c79`

### Auto-fixed (none — no Rule 1/2 fixes triggered)

### Architectural deferrals (Rule 4 candidates — surfaced, not actioned)

None. All architectural choices stayed inside plan + research scope.

## Self-Check: PASSED

- `packages/cora/vitest.config.ts` — present (FOUND)
- `packages/cora/src/renderer/assets/fonts.ts` — present (FOUND)
- `packages/cora/src/renderer/assets/fonts/NotoSans-Regular.ttf` — present, 622 KB (FOUND)
- `packages/cora/src/renderer/assets/fonts/NotoSans-SemiBold.ttf` — present, 625 KB (FOUND)
- `packages/cora/src/renderer/assets/fonts/SOURCES.md` — present, contains "OFL" + "notofonts" + commit SHA (FOUND)
- All 5 `tests/pdf/*.test.ts` and `tests/smoke/clean-install.sh` — present (FOUND)
- `dist/renderer/assets/fonts/NotoSans-{Regular,SemiBold}.ttf` — present after `bun run build` (FOUND)
- Commits `0783c79`, `310dd48`, `bd6447d`, `b2eccb0` — all present in `git log --all` (FOUND)
- `bun x vitest run` — exits 0 with 5 skipped files, 12 todo tests (VERIFIED)
- `bash packages/cora/tests/smoke/clean-install.sh` — exits 0 (VERIFIED)
- `bun run build` — produces dist with TTFs (VERIFIED)

## Deferred Issues (Out of Scope — see `deferred-items.md`)

1. **`test:golden` pre-existing drift** — All 5 fixtures fail with `differs from golden (first change near line 1)` on clean `main` (HEAD `ca57d08`), reproduced before any Plan 03-01 change. Likely needs `UPDATE_GOLDEN=1 node tests/render-golden.mjs` baseline refresh or is superseded by upcoming Phase 3.1 renderer refactor. Plan 03-01 does NOT modify renderer output; Task 3 is a pure refactor (verified by end-to-end PNG header smoke).
2. **Pre-existing TypeScript errors in `src/core/measureText.ts`** — 4 errors about `Font.ascent` / `Font.descent` not existing on the `Font` type. Reproduced on clean `main` (stash test); unrelated to this plan. Phase 3.1 (Renderer Component Refactor) is the natural place to address.

## Threat Flags

None. No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries were introduced beyond the documented threat register (T-03-W0-01 TTF vendor → mitigated via SOURCES.md SHA-256 + commit SHA; T-03-W0-SC dev deps → mitigated by package legitimacy audit in 03-RESEARCH.md).

## Next Wave Handoff

Plan 03-02 (Wave 1) inherits:
- A working `bun x vitest run` lane that already discovers `tests/pdf/*.test.ts`
- TTF fonts and `pdfLibFontBuffers()` ready to import from `./assets/fonts.js`
- 11 `it.todo` declarations to convert into real GREEN tests for `computePageGeometry`, `renderToPDF`, and `resvgCapture`
- The Plan 02 scope is `renderer/pdf/*.ts` and `renderer/renderToPDF.ts` — none of which Plan 03-01 touched.
