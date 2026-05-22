# Roadmap: Cora

**Project:** Cora — open-source AI-agent diagram tool
**Created:** 2026-05-21
**Granularity:** Standard (6 phases)
**Mode:** Vertical MVP slices

---

## Overview

| # | Phase | Goal | Requirements |
|---|-------|------|--------------|
| 1 | Foundation ✓ | Agent contract + monorepo skeleton | SPEC-*, CLI-01–04, CLI-08, AGT-01, AGT-03 |
| 2 | Renderer + SVG ✓ | Professional diagrams from YAML | LAY-*, REN-*, CLI-05, EXP-01 |
| 3 | PDF Export | Shareable PDF artifacts | EXP-02–05 |
| 3.1 | Renderer Component Refactor (INSERTED) | Reusable React component library for renderer | REN-* (consolidation) |
| 3.2 | Component Preview Canvas (INSERTED) | `cora preview` browser SPA for browsing + tuning components | PREV-* (new) |
| 4 | Interactive Canvas | Human layout polish loop | CLI-06, SRV-* |
| 5 | Extension System | Provider themes & icons | EXT-* |
| 6 | Hardening | v1 release readiness | CLI-07, AGT-02 |

---

### Phase 1: Foundation — Agent Contract + Core Schema ✓ 2026-05-21
**Goal:** Agents can validate YAML diagrams against a published JSON Schema before rendering exists.
**Mode:** mvp
**Requirements:** SPEC-01–06, CLI-01–04, CLI-08, AGT-01, AGT-03
**UI hint:** no

**Success Criteria:**
1. Monorepo scaffold builds with Bun + Turborepo + tsdown (`packages/cora/` single publish target)
2. `cora validate diagram.yaml --format json` returns structured errors with stable codes on invalid input
3. `cora schema` exports JSON Schema matching the v1 YAML spec
4. `AGENTS.md` draft documents validate workflow and JSON error shape
5. All five v1 diagram kinds are expressible in the schema (even if not yet renderable)

**Research flag:** Standard patterns — skip research-phase

**Pitfalls to address:** Agent-hostile CLI output (TTY detection, JSON path established from day one)

**Plans:** 4 plans

Plans:
- [x] 01-01-PLAN.md — Walking skeleton: monorepo build + cora validate/schema E2E
- [x] 01-02-PLAN.md — Full v1 JSON Schema + five diagram kinds + fixtures
- [x] 01-03-PLAN.md — Structured errors, semantic validation, TTY/JSON output
- [x] 01-04-PLAN.md — AGENTS.md draft + README agent pointer

---

### Phase 2: Core Renderer + SVG Export ✓ 2026-05-21
**Goal:** `cora render -o diagram.svg` produces professional diagrams for all v1 kinds using the built-in default theme.
**Mode:** mvp
**Requirements:** LAY-01–04, REN-01–08, CLI-05, EXP-01
**UI hint:** no

**Success Criteria:**
1. ELK auto-layout positions nodes for box-arrows, flowchart, microservice, infra, and basic database diagrams
2. `layout: auto | preserve | hybrid` and `pinned: true` behave correctly
3. React renderer outputs pure SVG via `renderToStaticMarkup` with polished `default` theme
4. DOM-free text measurement produces accurate node dimensions in headless context
5. Golden-image regression suite exists for at least one diagram per kind

**Research flag:** **Needs research-phase** — DOM-free text measurement library selection (spike before implementation)

**Pitfalls to address:** Text measurement without DOM, ELK version pinning, pure-function renderer rule, viewBox padding, font strategy

**Plans:** 4 plans

Plans:
- [x] 02-01-PLAN.md — Render walking skeleton: measure + Noto Sans fonts + minimal SVG + cora render E2E
- [x] 02-02-PLAN.md — ELK worker layout + auto/preserve/hybrid + pinned nodes
- [x] 02-03-PLAN.md — Full default theme + all shapes + edges/groups + five kinds
- [x] 02-04-PLAN.md — Golden SVG regression + render CLI polish + AGENTS.md

---

### Phase 3: PDF Export
**Goal:** `cora render -o diagram.pdf` works out of the box; `--quality=high` optionally uses Playwright.
**Mode:** mvp
**Requirements:** EXP-02–05
**UI hint:** no

**Success Criteria:**
1. Default PDF path uses resvg + pdf-lib without browser dependencies
2. PDF output matches SVG content at 2× scale for print quality
3. `--quality=high` prompts once to download Chromium to `$HOME/.config/cora/browsers/`
4. `--yes` / `CORA_AUTO_INSTALL=1` enables non-interactive high-quality PDF in CI
5. CI fails on resvg font-family warnings

**Research flag:** Standard patterns — skip research-phase

**Pitfalls to address:** resvg top-level `<text>` requirement, font loading

**Plans:** 4 plans

Plans:
- [x] 03-01-PLAN.md — Wave 0: vitest + TTF Noto Sans + shared font helper + RED test stubs
- [x] 03-02-PLAN.md — Default PDF path end-to-end (resvg + pdf-lib + text overlay + --page)
- [x] 03-03-PLAN.md — --quality=high Playwright lane + lazy Chromium install + JSON error
- [x] 03-04-PLAN.md — Clean-install smoke + AGENTS.md PDF docs + CI wiring

---

### Phase 3.1: Renderer Component Refactor (INSERTED)
**Goal:** Extract the renderer's React node/edge/group components from `Diagram.tsx`, `nodes/index.tsx`, `edges/`, and `groups/` into a well-typed, reusable component library that Phase 4 (Interactive Canvas) and Phase 5 (Extension System) can consume without reaching into renderer internals.
**Mode:** mvp
**Requirements:** REN-* (consolidation — no new requirements; tightens existing Phase 2 surface)
**UI hint:** no (component library; visual output unchanged)
**Depends on:** Phase 3 (PDF path consumes the same renderer; refactor lands after PDF ships so the IR-driven text overlay isn't disturbed mid-flight)

**Success Criteria:**
1. Each diagram-kind node component (`box-arrows`, `flowchart`, `microservice`, `infra`, `database`) lives in its own file under `packages/cora/src/renderer/nodes/` with a stable `NodeComponentProps` interface
2. Edge variants (`Arrow`, plus any decorations) and group containers are split into per-file modules with shared `EdgeComponentProps` / `GroupComponentProps` interfaces
3. A single `renderer/components/index.ts` barrel re-exports the public component surface; `Diagram.tsx` consumes only from the barrel — no deep imports across modules
4. Golden SVG regression suite from Phase 2 passes byte-for-byte after the refactor (no visual or coordinate changes)
5. Component prop interfaces are documented in `AGENTS.md` under a "Renderer Components" section so Phase 5 extension authors can target stable types

**Research flag:** Standard patterns — skip research-phase. Pure code-organisation refactor against a green test suite.

**Pitfalls to address:**
- Golden regression is the contract: every commit during the refactor must keep `bun run test:golden` green
- Avoid premature theming abstraction — Phase 5 owns provider themes; this phase only stabilises the prop shapes
- PDF text overlay (Phase 3) reads from the layouted IR, not from the components — confirm refactor does not move geometry computation out of `nodes/*` measurement helpers

---

### Phase 3.2: Component Preview Canvas (INSERTED)
**Goal:** `bun run cora preview` boots a local dev server + opens a browser SPA where the user can pick a component pack from a sidebar, drill into individual components, render them on an isolated canvas with various combinations, tune attributes (color, border-width, text, font weight, padding, etc.) live, and visualise edge/line attachment points.
**Mode:** mvp
**Requirements:** PREV-01–06 (new requirement family — see REQUIREMENTS.md to be drafted in discuss-phase)
**UI hint:** yes — first phase with a real interactive UI (Phase 4 will reuse infrastructure)
**Depends on:** Phase 3.1 (consumes the typed `NodeComponentProps` / `EdgeComponentProps` / `GroupComponentProps` surface to drive picker + controls). Soft dep on Phase 5: when extensions ship, the "pack" picker grows from "built-ins only" to "built-ins + installed extensions" without breaking the v1 contract.

**Tentative requirements (PREV-*):**
- **PREV-01:** `cora preview` boots a local dev server (Vite or similar), opens a default browser, and exits cleanly on Ctrl-C
- **PREV-02:** Sidebar lists component packs; v1 ships with one pack ("built-ins") containing every typed node/edge/group component from Phase 3.1's barrel
- **PREV-03:** Selecting a component renders it in isolation on a centered canvas with default props; user can also pick "combinations" (presets: alone, two-connected, three-with-group, etc.)
- **PREV-04:** A controls panel exposes each prop in the component's typed interface (color = color picker, border-width = number slider, text = text input, font weight = select). Editing a control re-renders live
- **PREV-05:** A "line attachments" overlay draws the geometric attachment points the renderer uses for edge endpoints (top/right/bottom/left + any corner anchors), so designers can verify where edges will hit
- **PREV-06:** No diagram YAML is required — the preview drives components directly from their prop interfaces, decoupled from the layout engine

**Success Criteria:**
1. `bun run cora preview` opens a browser at a localhost URL with a sidebar + canvas + controls panel
2. Built-in pack lists every Phase 3.1 component (boxes, flowchart shapes, microservice node, infra node, database node, edge variants, group container)
3. Picking a component renders it isolated; combination presets (e.g. "two connected", "three with group wrapper") work for at least one node + one edge variant
4. Editing any control updates the canvas without a full reload (live re-render via React state)
5. Line-attachment overlay can be toggled on/off; when on, draws the anchor points each edge variant uses, labeled with their names

**Research flag:** Light research recommended — Vite-based dev server boot strategy (Vite SSR-less, or Vite as a library, vs `vite-node`) + how to lazy-load a "pack" registry that Phase 5 extensions can plug into without breaking the v1 contract.

**Pitfalls to address:**
- Don't reinvent Phase 4's `cora serve` infrastructure; if a dev-server abstraction lands here, design it so Phase 4 reuses it (Vite-as-library twice is wasted work)
- Avoid coupling the controls panel to a UI framework that pollutes the renderer (preview UI = React, but live in `packages/cora-preview/` or under `src/preview/`, not in `src/renderer/`)
- The pack registry must be open to extensions (Phase 5) but closed to ad-hoc imports — define a `PackManifest` interface up front
- Bundled-asset path: the preview SPA's HTML/JS must ship in the npm tarball so `cora preview` works after `npm install cora` with no extra deps
**Goal:** Humans can drag/pin nodes, edit labels, and save back to YAML without destroying agent-authored content.
**Mode:** mvp
**Requirements:** CLI-06, SRV-01–07
**UI hint:** yes

**Success Criteria:**
1. `cora serve diagram.yaml` opens browser canvas with pre-built bundled assets
2. Drag/pin and inline label edits persist via YAML AST patch (comments preserved)
3. External file changes trigger hot-reload with unsaved-change guard (content-hash based)
4. `cora render` does not modify YAML and does not trigger unsaved guard
5. Round-trip test: comment-rich YAML survives position save unchanged except patched fields

**Research flag:** Light research recommended — YAML AST comment transplanting spike before implementation

**Pitfalls to address:** YAML AST formatting loss, file-watch race condition, ELK performance (worker + cache)

---

### Phase 5: Extension System
**Goal:** Provider themes and icons install from `cora-extensions` with reproducible CI rendering.
**Mode:** mvp
**Requirements:** EXT-01–08
**UI hint:** no

**Success Criteria:**
1. `cora ext install aws-theme` fetches tagged release and caches to `$HOME/.config/cora/extensions/`
2. `cora.extensions.lock.json` pins versions; project lock overrides global config
3. Diagram referencing missing extension hard-fails with install command in error
4. `provider: aws` + `service: lambda` resolves icon and styling when extension installed
5. `cora-extensions` repo structure documented with PR contribution guide

**Research flag:** Standard patterns — Gemini CLI git-extension model as reference

**Pitfalls to address:** Extension version drift (`coraSchemaVersion` validation at load time)

---

### Phase 6: Hardening + Agent Polish
**Goal:** v1 release-ready with complete agent docs, examples, and environment diagnostics.
**Mode:** mvp
**Requirements:** CLI-07, AGT-02
**UI hint:** no

**Success Criteria:**
1. `cora doctor` reports Node version, extension cache health, and browser availability
2. `AGENTS.md` documents all error codes, JSON schemas, and CI integration patterns
3. Canonical example diagram exists for each v1 kind in `examples/`
4. README covers install, validate, render, serve, and extension workflows
5. Apache 2.0 LICENSE present; npm package publishes as `cora`

**Research flag:** Standard patterns — skip research-phase

**Pitfalls to address:** Final validation of agent JSON output paths

---

## Phase Ordering Rationale

1. **Schema before renderer** — agents consume `cora validate` immediately
2. **Renderer before PDF** — resvg requires specific SVG structure enforced in Phase 2
3. **Renderer before canvas** — same React tree; pure-function rule established first
3a. **Component refactor before canvas (Phase 3.1, INSERTED)** — Phase 4 wires a live canvas around the same components, so stabilising prop shapes first avoids tearing the canvas later
3b. **Preview after refactor (Phase 3.2, INSERTED)** — once components are typed (3.1) they can be browsed/tuned in isolation; preview tool also seeds the dev-server abstraction Phase 4 reuses
4. **Canvas before extensions** — core pipeline stable before adding theme variables
5. **Extensions before hardening** — `cora doctor` and docs reference extension errors

## v1.x Backlog (Post-Roadmap)

- Sequence diagrams (custom layout engine)
- State diagrams (custom layout engine)
- Advanced ER diagrams
- MCP server
- Multi-diagram project config
- `cora migrate` for schema v2

---
*Roadmap created: 2026-05-21*
