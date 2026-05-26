---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: planning
stopped_at: Phase 3.7 context gathered
last_updated: "2026-05-26T12:49:48.532Z"
last_activity: 2026-05-24 -- Phase 3.6 completed
progress:
  total_phases: 14
  completed_phases: 9
  total_plans: 33
  completed_plans: 33
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-21)

**Core value:** An AI agent can write a YAML diagram, run `cora validate` and `cora render`, and produce a professional-looking architectural diagram without touching a visual editor — while humans can still polish the result when needed.
**Current focus:** Phase 3.6 — Default Component Look Lockdown

## Current Position

Phase: 3.7 of 14 (Component/Icon Package Surface Lockdown)
Plan: 0 of 0 planned
Status: Ready to plan
Last activity: 2026-05-24 -- Phase 3.6 completed

Progress: [██████░░░░] 64% (9/14 phases complete)

## Performance Metrics

**Velocity:**

- Total plans completed: 25
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 Foundation | 4 | 4 | — |
| 2 Renderer + SVG | 4 | 4 | — |
| 3 PDF Export | 4 | 4 | — |
| 3.1 Renderer Component Refactor | 1 | 1 | — |
| 3.2 Renderer Component Library | 4 | 4 | — |
| 3.3 Component Preview Canvas | 4 | 4 | — |
| 3.4 ASCII Export + SKILL.md | 4 | 4 | — |
| 3.5 Preview Visual Beauty | 4 | 4 | — |
| 3.6 Default Component Look Lockdown | 4 | 4 | — |
| 3.7 Component/Icon Package Surface Lockdown | 0 | 0 | — |
| 3.8 Grid Capability Expansion | 0 | 0 | — |

**Recent Trend:**

- Last 5 plans: 3.6-04, 3.6-03, 3.6-02, 3.6-01, 3.5-04
- Trend: Phase 3.6 component look lockdown is complete. Design tokens and defaults are synchronized between renderer and preview with passing look contract/sync tests.

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
- Phase 3.2 context: replace old shape-specific public model with catalog components (`Group`, `BoxNode`, `LabelNode`, `IconNode`, `LabelIconNode`, `WebsiteNode`, `PageNode`, `AppNode`, `DecisionNode`, `IssueNode`, `ShapeNode`, `Line`, markers); remove old shape support consistently across renderer/schema/examples/goldens/docs; `Line` is public and `Arrow` is internal compatibility only.
- Phase 3.2 research: recommended four-plan sequence — catalog style/line primitives, node catalog/icon slot, renderer/barrel migration, then schema/examples/goldens/docs consistency sweep. Validation strategy added with typecheck/build/vitest/golden gates.
- Phase 3.2 complete: public catalog exports `Group`, `BoxNode`, `LabelNode`, `IconNode`, `LabelIconNode`, `WebsiteNode`, `PageNode`, `AppNode`, `DecisionNode`, `IssueNode`, `ShapeNode`, `Line`, marker helpers, shared `BoxStyleProps`, and icon slot types. Schema/examples/docs use `component` instead of legacy `shape`; old shape-specific node files were removed. Full typecheck/build/test/golden verification passed.
- Phase 3.3 complete: `cora preview` is a Vite-backed local workbench with built-in component pack, primary/secondary node selection, typed prop controls, connected/grouped scenarios, drag-updated line endpoints, distributed attachment slot overlay, `dist/preview` package assets, and clean-install smoke coverage. Full typecheck/build/Vitest/smoke verification passed; in-app browser automation was unavailable, so localhost runtime was probed through the served root and entry module.
- Phase 3.4 complete: `cora render` now supports stdout text rendering, `.txt` output, `--charset ascii`, and root `SKILL.md` packaging. The text renderer consumes the layouted IR, preserves labels with a deterministic legend, and keeps structured JSON failures unchanged.

### Roadmap Evolution

- 2026-05-22 — Phase 3.1 inserted after Phase 3 (URGENT): Renderer Component Refactor — extract React node/edge/group components into a reusable library before Phase 4 (Interactive Canvas) wires a live canvas around them.
- 2026-05-22 — Phase 3.2 inserted after Phase 3.1 (URGENT): Renderer Component Library — full reusable renderer component catalog and normalized style vocabulary before preview/canvas/extensions grow around a too-small abstraction.
- 2026-05-22 — Phase 3.3 renumbered from former Phase 3.2: Component Preview Canvas — `cora preview` browser SPA with pack/component picker, live attribute controls (color, border-width, text, etc.), and line-attachment overlay. Browser SPA delivery (not static HTML, not Storybook). Depends on Phase 3.2's typed component catalog; seeds dev-server infrastructure Phase 4 reuses.
- 2026-05-23 — Phase 3.4 inserted after Phase 3.3 (URGENT): ASCII Export + SKILL.md — text-native diagram export and agent skill handoff before Phase 4.
- 2026-05-23 — Phase 3.5 inserted after Phase 3.4 (URGENT): Preview Visual Beauty — talk through and improve the visual beauty, polish, and product feel of the preview workbench.
- 2026-05-23 — Phase 3.6 inserted after Phase 3.5 (URGENT): Default Component Look Lockdown — canonical component styling, colors, fonts, and sensible defaults before Interactive Canvas.
- 2026-05-23 — Phase 3.7 inserted after Phase 3.6 (URGENT): Component/Icon Package Surface Lockdown — decide the supported component/icon/package surface and keep preview development-only before Phase 4.
- 2026-05-23 — Phase 3.8 inserted after Phase 3.7 (URGENT): Grid Capability Expansion — strengthen diagram grid behavior before Phase 4 direct manipulation depends on it.

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Diagram types | Sequence, state, advanced ER | v1.x | Project init |
| Platform | MCP server | v1.x | Project init |

## Session Continuity

Last session: 2026-05-26T12:49:48.519Z
Stopped at: Phase 3.7 context gathered
Resume file: .planning/phases/3.7-component-icon-and-package-surface-lockdown/03.7-CONTEXT.md
