# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-21)

**Core value:** An AI agent can write a YAML diagram, run `cora validate` and `cora render`, and produce a professional-looking architectural diagram without touching a visual editor — while humans can still polish the result when needed.
**Current focus:** Phase 3.2 — Renderer Component Library

## Current Position

Phase: 3.2 of 9 (Renderer Component Library)
Plan: none yet
Status: Ready to discuss Phase 3.2
Last activity: 2026-05-22 — Phase 3.1 executed and verified

Progress: [████░░░░░░] 44% (4/9 phases complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 13
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 Foundation | 4 | 4 | — |
| 2 Renderer + SVG | 4 | 4 | — |
| 3 PDF Export | 4 | 4 | — |
| 3.1 Renderer Component Refactor | 1 | 1 | — |

**Recent Trend:**
- Last 5 plans: 3.1-01, 03-04, 03-03, 03-02, 03-01
- Trend: Renderer component contract established after PDF export; Phase 3.2 can build the larger catalog on the new barrel.

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
- Phase 3.1: renderer components now live under `packages/cora/src/renderer/components/`; `Diagram.tsx` consumes `./components/index.js`; package subpath `cora/renderer/components` exports `NodeComponentProps`, `EdgeComponentProps`, `GroupComponentProps`, existing node components, `Arrow`, `EdgeLabel`, `Group`, and edge decoration helpers. Top-level `cora` export remains free of component exports. Build emits `dist/renderer/components/index.{js,d.ts}`.

### Roadmap Evolution

- 2026-05-22 — Phase 3.1 inserted after Phase 3 (URGENT): Renderer Component Refactor — extract React node/edge/group components into a reusable library before Phase 4 (Interactive Canvas) wires a live canvas around them.
- 2026-05-22 — Phase 3.2 inserted after Phase 3.1 (URGENT): Renderer Component Library — full reusable renderer component catalog and normalized style vocabulary before preview/canvas/extensions grow around a too-small abstraction.
- 2026-05-22 — Phase 3.3 renumbered from former Phase 3.2: Component Preview Canvas — `cora preview` browser SPA with pack/component picker, live attribute controls (color, border-width, text, etc.), and line-attachment overlay. Browser SPA delivery (not static HTML, not Storybook). Depends on Phase 3.2's typed component catalog; seeds dev-server infrastructure Phase 4 reuses.

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Diagram types | Sequence, state, advanced ER | v1.x | Project init |
| Platform | MCP server | v1.x | Project init |

## Session Continuity

Last session: 2026-05-22
Stopped at: Phase 3.1 complete
Resume file: `.planning/phases/3.1-renderer-component-refactor/3.1-VERIFICATION.md`
