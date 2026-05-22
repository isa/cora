# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-21)

**Core value:** An AI agent can write a YAML diagram, run `cora validate` and `cora render`, and produce a professional-looking architectural diagram without touching a visual editor — while humans can still polish the result when needed.
**Current focus:** Phase 3 — PDF Export

## Current Position

Phase: 3 of 6 (PDF Export)
Plan: Not started
Status: Phase 3 context gathered — ready for plan-phase
Last activity: 2026-05-22 — Phase 3 discuss complete

Progress: [████░░░░░░] 33% (2/6 phases complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 8
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 Foundation | 4 | 4 | — |
| 2 Renderer + SVG | 4 | 4 | — |

**Recent Trend:**
- Last 5 plans: 02-01, 02-02, 02-03, 02-04, 01-04
- Trend: Renderer pipeline shipped

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- **Package manager:** Bun workspaces
- **Font:** Bundled Noto Sans (Regular + SemiBold woff) for cross-platform SVG parity (D-06); fontkit for headless measurement (Inter incompatible with opentype.js GSUB)
- **Layout:** ELK 0.11.x in worker thread; layered + orthogonal routing
- Phase 2: default theme soft pastels, pure SVG renderer, golden regression per kind

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Diagram types | Sequence, state, advanced ER | v1.x | Project init |
| Platform | MCP server | v1.x | Project init |

## Session Continuity

Last session: 2026-05-22
Stopped at: Phase 3 context gathered
Resume file: `.planning/phases/03-pdf-export/03-CONTEXT.md`
