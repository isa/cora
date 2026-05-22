# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-21)

**Core value:** An AI agent can write a YAML diagram, run `cora validate` and `cora render`, and produce a professional-looking architectural diagram without touching a visual editor — while humans can still polish the result when needed.
**Current focus:** Phase 3 — PDF Export

## Current Position

Phase: 3 of 6 (PDF Export)
Plan: 03-04 complete — Phase 3 SHIPS
Status: PDF default + high-quality lanes shipped; EXP-05 proof + CI live
Last activity: 2026-05-22 — Plan 03-04 executed

Progress: [█████░░░░░] 50% (3/6 phases complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 12
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 Foundation | 4 | 4 | — |
| 2 Renderer + SVG | 4 | 4 | — |
| 3 PDF Export | 4 | 4 | — |

**Recent Trend:**
- Last 5 plans: 03-04, 03-03, 03-02, 03-01, 02-04
- Trend: Phase 3 SHIPS — PDF (both lanes), EXP-05 proof, CI live

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- **Package manager:** Bun workspaces
- **Font:** Bundled Noto Sans (Regular + SemiBold woff) for cross-platform SVG parity (D-06); fontkit for headless measurement (Inter incompatible with opentype.js GSUB)
- **Layout:** ELK 0.11.x in worker thread; layered + orthogonal routing
- Phase 2: default theme soft pastels, pure SVG renderer, golden regression per kind
- Phase 3-02: PDF default path = resvg vector raster + pdf-lib selectable text overlay (Noto Sans TTF embedded, subsetted); IR drives text positions (not SVG re-parse); single-point Y-flip in coords.svgToPdf; BASELINE_FACTOR = 0.3 named constant; --page=a4|letter|*-portrait scale-to-fit, default fit-to-content (24pt margin); resvg-js Rust log bypasses process.stderr.write (verified), so D-11 detection uses structural SVG font-family scan instead
- Phase 3-03: Playwright --quality=high lane dynamic-imported; lazy Chromium install to $HOME/.config/cora/browsers/ via cli/playwrightInstall.ts; CHROMIUM_NOT_INSTALLED JSON error (path: /quality); no silent fallback; --yes / CORA_AUTO_INSTALL=1 consent; allowlisted spawn env (no ...process.env spread); CORA_TEST_PLAYWRIGHT_INSTALL_STUB seam for CI
- Phase 3-04: npm pack strips .npmrc from tarballs (security feature) — Plan 03's .npmrc strategy is moot, BUT runtime `playwright` npm pkg does NOT auto-download Chromium in its own postinstall, so EXP-05 still holds. Smoke script asserts this empirically. CI (.github/workflows/ci.yml) runs vitest + smoke + golden on every push; gated Playwright lane (CORA_TEST_PLAYWRIGHT=1) stays manual

### Roadmap Evolution

- 2026-05-22 — Phase 3.1 inserted after Phase 3 (URGENT): Renderer Component Refactor — extract React node/edge/group components into a reusable library before Phase 4 (Interactive Canvas) wires a live canvas around them.

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Diagram types | Sequence, state, advanced ER | v1.x | Project init |
| Platform | MCP server | v1.x | Project init |

## Session Continuity

Last session: 2026-05-22
Stopped at: Plan 03-04 complete — Phase 3 SHIPS
Resume file: `.planning/phases/03-pdf-export/03-04-SUMMARY.md`
