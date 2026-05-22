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
| 3.2 | Renderer Component Library (INSERTED) ✓ | Full reusable renderer component catalog and style vocabulary | RCL-* (new) |
| 3.3 | Component Preview Canvas (INSERTED) ✓ | `cora preview` browser SPA for browsing + tuning components | PREV-* |
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

### Phase 3.1: Renderer Component Refactor (INSERTED) ✓ 2026-05-22
**Goal:** Extract the renderer's React node/edge/group components from `Diagram.tsx`, `nodes/index.tsx`, `edges/`, and `groups/` into a well-typed, reusable component library that Phase 4 (Interactive Canvas) and Phase 5 (Extension System) can consume without reaching into renderer internals.
**Mode:** mvp
**Requirements:** REN-* (consolidation — no new requirements; tightens existing Phase 2 surface)
**UI hint:** no (component library; visual output unchanged)
**Depends on:** Phase 3 (PDF path consumes the same renderer; refactor lands after PDF ships so the IR-driven text overlay isn't disturbed mid-flight)

**Success Criteria:**
1. Existing renderer node components live under `packages/cora/src/renderer/components/nodes/` with a stable `NodeComponentProps` interface
2. Existing edge variants (`Arrow`, plus any decorations) and group containers live under `packages/cora/src/renderer/components/edges/` and `packages/cora/src/renderer/components/groups/` with shared `EdgeComponentProps` / `GroupComponentProps` interfaces
3. A single `renderer/components/index.ts` barrel re-exports the public component surface; `Diagram.tsx` consumes only from the barrel — no deep imports across modules
4. Golden SVG regression suite passes after the inherited baseline drift is refreshed, and remains byte-for-byte stable after the refactor
5. Component prop interfaces are documented in `AGENTS.md` under a "Renderer Components" section so Phase 5 extension authors can target stable types

**Research flag:** Standard patterns — skip research-phase. Pure code-organisation refactor against a green test suite.

**Pitfalls to address:**
- Golden regression is the contract after the initial Phase 3.1 baseline refresh: every subsequent refactor commit must keep `bun run test:golden` green
- Avoid premature theming abstraction — Phase 5 owns provider themes; this phase only stabilises the prop shapes
- PDF text overlay (Phase 3) reads from the layouted IR, not from the components — confirm refactor does not move geometry computation out of `nodes/*` measurement helpers

**Plans:** 1 plan

Plans:
- [x] 3.1-01-PLAN.md — Move existing renderer components under `renderer/components/`, publish the barrel, repair baseline blockers, and document the contract

---

### Phase 3.2: Renderer Component Library (INSERTED) ✓ 2026-05-22
**Goal:** Build the full reusable renderer component catalog and normalized style vocabulary before the preview, canvas, and extension phases grow the codebase around a too-small component abstraction.
**Mode:** mvp
**Requirements:** RCL-01–10
**UI hint:** no (component library; preview/UI comes next)
**Depends on:** Phase 3.1 (component folders, public prop interfaces, and barrel are established first)

**Requirements (RCL-*):**
- **RCL-01:** Public component catalog includes `Group`, `BoxNode`, `LabelNode`, `IconNode`, `LabelIconNode`, `WebsiteNode`, `PageNode`, `AppNode`, `DecisionNode`, `IssueNode`, `ShapeNode`, `Line`, and reusable markers.
- **RCL-02:** Legacy shape-specific public components and shape values are removed or replaced consistently across renderer, schema, examples, goldens, and docs.
- **RCL-03:** Box-like components share `BoxStyleProps` with `backgroundColor`, `radius`, `borderStyle`, `borderColor`, `borderWidth`, `text`, `textColor`, and `size`.
- **RCL-04:** `borderStyle` values are `none | solid | dashed | dotted`; `size` supports `{ width: number; height: number } | "sm" | "md" | "lg" | "xl" | "xxl"`.
- **RCL-05:** Specialized props are normalized: `PageNode.type = landing | form | content | profile | settings`, `IssueNode.icon = bug | warning | error | stop`, icon-bearing nodes use `iconColor`, and `PageNode` uses `skeletonColorDark` / `skeletonColorLight`.
- **RCL-06:** `WebsiteNode` and `AppNode` support optional `text`; box-driven nodes may bear icons where appropriate.
- **RCL-07:** `IconNode` is icon-only and renders an SVG icon from the component-side icon slot/pack contract without implementing extension loading.
- **RCL-08:** `Line` takes explicit routed `points: Array<{ x: number; y: number }>` and supports `lineStyle`, `strokeColor`, `strokeWidth`, `startMarker`, and `endMarker`.
- **RCL-09:** Marker values are `none | arrow | circle | filledCircle`; `Line` is the public edge primitive and `Arrow` is internal compatibility only.
- **RCL-10:** Components remain pure React/SVG functions with no DOM dependency and no direct YAML parsing.

**Success Criteria:**
1. Component modules are organized under `packages/cora/src/renderer/components/` by `nodes/`, `groups/`, and `lines/` (or `edges/` where preserving existing names is required)
2. Public prop/types capture the full catalog and style vocabulary; schema/examples/goldens/docs are updated only where needed to remove the old shape model consistently
3. At least one representative component from each family renders through tests or fixtures: group, node, issue/page-style node, line, and marker
4. Existing v1 diagram render path still works and continues to use the Phase 3.1 barrel
5. AGENTS.md documents the component catalog and style vocabulary for future extension authors

**Research flag:** Standard patterns — skip research-phase. This is an internal component-library design phase grounded in the Phase 3.1 API.

**Pitfalls to address:**
- Do not couple raw component props to YAML schema shape; schema mapping belongs to core/renderer integration
- Avoid one-off prop names (`bg-color`, `stroke-color`) in code; normalize to TypeScript-friendly camelCase
- Keep marker geometry centralized so future line endpoints do not duplicate trimming/attachment math
- Preserve pure SVG and headless render compatibility; preview interactivity comes in Phase 3.3

**Plans:** 4 plans

Plans:
- [x] 3.2-01-PLAN.md — Wave 1: shared style/size contract, `Line`, marker primitives, and primitive tests
- [x] 3.2-02-PLAN.md — Wave 1: node catalog components and component-side icon slot contract
- [x] 3.2-03-PLAN.md — Wave 2 *(blocked on Wave 1 completion)*: migrate renderer path to `Line` and clean the public barrel
- [x] 3.2-04-PLAN.md — Wave 3 *(blocked on Wave 2 completion)*: schema/examples/goldens/docs consistency sweep

---

### Phase 3.3: Component Preview Canvas (INSERTED) ✓ 2026-05-22
**Goal:** `bun run cora preview` boots a local dev server + opens a browser SPA where the user can pick a component pack from a sidebar, drill into individual components, render them on an isolated canvas with various combinations, tune attributes (color, border-width, text, font weight, padding, etc.) live, and visualise edge/line attachment points.
**Mode:** mvp
**Requirements:** PREV-01–06
**UI hint:** yes — first phase with a real interactive UI (Phase 4 will reuse infrastructure)
**Depends on:** Phase 3.2 (consumes the full typed renderer component catalog and style vocabulary). Soft dep on Phase 5: when extensions ship, the "pack" picker grows from "built-ins only" to "built-ins + installed extensions" without breaking the v1 contract.

**Requirements (PREV-*):**
- **PREV-01:** `cora preview` boots a local dev server, opens a browser by default, supports no-open/test mode, and exits cleanly on Ctrl-C
- **PREV-02:** Built-in pack lists every Phase 3.2 node component and includes group/line scenario metadata without treating groups or lines as selected components
- **PREV-03:** Workbench supports primary and secondary selected nodes with scenarios: isolated, connected, grouped, and grouped + connected
- **PREV-04:** Typed prop controls expose valid component props and update the canvas live while preventing invalid values
- **PREV-05:** Attachment overlay shows computed distributed slots, subtle side guides, toggleable labels, and live drag updates
- **PREV-06:** Preview drives renderer components directly from prop/control state and does not require or persist diagram YAML

**Success Criteria:**
1. `bun run cora preview` opens a browser at a localhost URL with a sidebar + canvas + controls panel
2. Built-in pack lists every Phase 3.2 component (groups, box/label/icon/page/app/decision/issue nodes, line variants, markers)
3. Picking a component renders it isolated; combination presets (e.g. "two connected", "three with group wrapper") work for at least one node + one edge variant
4. Editing any control updates the canvas without a full reload (live re-render via React state)
5. Line-attachment overlay can be toggled on/off; when on, draws the anchor points each edge variant uses, labeled with their names

**Research flag:** Light research recommended — Vite-based dev server boot strategy (Vite SSR-less, or Vite as a library, vs `vite-node`) + how to lazy-load a "pack" registry that Phase 5 extensions can plug into without breaking the v1 contract.

**Pitfalls to address:**
- Don't reinvent Phase 4's `cora serve` infrastructure; if a dev-server abstraction lands here, design it so Phase 4 reuses it (Vite-as-library twice is wasted work)
- Avoid coupling the controls panel to a UI framework that pollutes the renderer (preview UI = React, but live in `packages/cora-preview/` or under `src/preview/`, not in `src/renderer/`)
- The pack registry must be open to extensions (Phase 5) but closed to ad-hoc imports — define a `PackManifest` interface up front
- Bundled-asset path: the preview SPA's HTML/JS must ship in the npm tarball so `cora preview` works after `npm install cora` with no extra deps

**Plans:** 4 plans

Plans:
- [x] 3.3-01-PLAN.md — Preview CLI command, Vite server helper, SPA shell, and build output
- [x] 3.3-02-PLAN.md — Internal built-in pack, typed controls, scenarios, and two-node state model
- [x] 3.3-03-PLAN.md — Workbench UI, drag geometry, live connection endpoints, and attachment overlay
- [x] 3.3-04-PLAN.md — PREV requirements, package asset checks, clean-install smoke, and docs

---

### Phase 4: Interactive Canvas
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
3a. **Component refactor before library (Phase 3.1, INSERTED)** — move the current renderer into a stable `renderer/components/` surface before adding more component families
3b. **Component library before preview (Phase 3.2, INSERTED)** — define the full reusable component catalog and style vocabulary while the codebase is still small
3c. **Preview after library (Phase 3.3, INSERTED)** — once components are typed and cataloged they can be browsed/tuned in isolation; preview tool also seeds the dev-server abstraction Phase 4 reuses
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
