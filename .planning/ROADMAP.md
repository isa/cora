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
| 3.4 | ASCII Export + SKILL.md (INSERTED) ✓ | Text-native diagram export and agent skill handoff docs | ASCII-*, AGT-04 |
| 3.5 | Preview Visual Beauty (INSERTED) ✓ | Visual beauty, polish, and product feel of the preview workbench | BEAUTY-* |
| 3.6 | Default Component Look Lockdown (INSERTED) | Canonical component styling, colors, fonts, and sensible defaults | LOOK-* |
| 3.7 | Component/Icon Package Surface Lockdown (INSERTED) ✓ | Shipped component/icon set and package contents contract | PACK-* |
| 3.8 | Material Icon Pack + Default Component Surface (INSERTED) ✓ | ~4k Material icons, unified preview library, narrowed default components | ICON-* |
| 3.9 | Grid Capability Expansion (INSERTED) | More capable diagram grid behavior before the interactive canvas | GRID-* |
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
**Goal:** As a Cora user exploring renderer components, I want to open a preview workbench where I can drag components onto a canvas, tune their attributes, and inspect connection behavior, so that I can validate component appearance and interactions before using them in diagrams.
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

### Phase 3.4: ASCII Export + SKILL.md (INSERTED) ✓ 2026-05-23
**Goal:** `cora render diagram.yaml` and `cora render diagram.yaml -o diagram.txt` produce readable text architecture diagrams, with Unicode box drawing by default and explicit ASCII fallback, and `SKILL.md` captures reusable agent-facing guidance for generating, validating, and consuming Cora diagrams.
**Mode:** mvp
**Requirements:** ASCII-01–05, AGT-04
**UI hint:** no
**Depends on:** Phase 3.3 (uses the stable renderer component catalog and preview-learned component vocabulary before Phase 4 adds YAML writeback)

**Requirements (ASCII-*):**
- **ASCII-01:** `cora render diagram.yaml -o diagram.txt` selects a text export path from the output extension, and `cora render diagram.yaml` without `-o` prints text output to stdout.
- **ASCII-02:** Text output preserves nodes, groups, labels, and directional relationships in a readable fixed-width layout suitable for terminals, Markdown, pull requests, and agent logs.
- **ASCII-03:** Text export is deterministic in CI and does not require browser, SVG, PDF, or image dependencies.
- **ASCII-04:** Validation and render failures keep the existing structured JSON error behavior when `--format json` is requested.
- **ASCII-05:** Documentation explains text export limitations versus SVG/PDF, including layout simplification and unsupported visual styling.
- **AGT-04:** `SKILL.md` documents practical agent workflows, triggers, examples, and references to README/AGENTS for Cora diagram authoring and review.

**Success Criteria:**
1. `cora render examples/valid/minimal.yaml -o diagram.txt` writes a deterministic text artifact with visible node labels and edges
2. Text export works for representative box-arrows, flowchart, microservice, infra, and database examples without throwing renderer-specific errors
3. `--format json` remains machine-readable for validation/render errors on the text export path
4. README/AGENTS docs mention text export alongside SVG, PNG, and PDF where appropriate
5. `SKILL.md` exists with concise, reusable guidance for AI agents authoring Cora diagrams

**Research flag:** Research completed. Implement against the existing parsed/layouted IR rather than introducing a new diagram model.

**Pitfalls to address:**
- Keep output pure text and deterministic; avoid terminal color, default to Unicode box drawing, and provide explicit `--charset ascii` fallback
- Do not let ASCII constraints leak back into SVG/PDF rendering or component APIs
- Preserve the one-diagram-per-file and schema-first agent contract
- Make `SKILL.md` actionable without duplicating all of AGENTS.md

**Plans:** 4 plans

Plans:
**Wave 1**
- [x] 3.4-01-PLAN.md — Text renderer core over layouted IR with Unicode default and ASCII fallback

**Wave 2 *(blocked on Wave 1 completion)***
- [x] 3.4-02-PLAN.md — CLI `.txt`, stdout text rendering, charset flag, and JSON error preservation

**Wave 3 *(blocked on Wave 2 completion)***
- [x] 3.4-03-PLAN.md — Root `SKILL.md`, docs, package inclusion, and clean-install smoke proof

**Wave 4 *(blocked on Waves 1-3 completion)***
- [x] 3.4-04-PLAN.md — Requirements traceability, all-kind text coverage, and full regression verification

Cross-cutting constraints:
- Text rendering must consume existing layouted IR rather than introducing a new layout model.
- JSON failure output must remain a structured array when `--format json` is requested.
- Preview distribution cleanup remains out of scope for Phase 3.4 and belongs to Phase 3.7.

---

### Phase 3.5: Preview Visual Beauty (INSERTED) ✓ 2026-05-23
**Goal:** Talk through and lock a stronger visual direction for the `cora preview` workbench so the app feels visually beautiful, intentional, and worth using before later phases harden defaults and build the interactive canvas on top of it.
**Mode:** mvp
**Requirements:** BEAUTY-*
**UI hint:** yes — this phase is explicitly about preview app visual polish and product feel
**Depends on:** Phase 3.3 (preview exists and can be inspected) and Phase 3.4 (agent-facing text output is complete, so attention can return to the visual workbench)

**Success Criteria:**
1. The preview workbench has an explicit visual direction covering layout density, typography, spacing, color, interaction feedback, and component presentation
2. Existing preview screens are audited for visual quality issues, including hierarchy, clutter, awkward spacing, weak contrast, and confusing control placement
3. Any chosen visual changes improve the actual workbench experience rather than adding marketing-style decoration
4. The direction can inform Phase 3.6 default component look decisions without conflating preview UI polish with renderer component defaults
5. Visual acceptance criteria are concrete enough for screenshots or browser verification during execution

**Research flag:** Light visual audit recommended — run the preview, inspect desktop/mobile-ish viewports where applicable, and compare against the component workflow the preview is meant to support.

**Pitfalls to address:**
- Do not turn preview into a landing page; keep the workbench as the first screen
- Do not hide component inspection controls behind decorative composition
- Avoid one-note palettes and oversized marketing treatments that make repeated technical use slower
- Keep preview-only UI beauty separate from renderer output defaults, which are locked in Phase 3.6

**Plans:** 4 plans

Plans:
**Wave 1**
- [x] 03.5-01-PLAN.md — Preview visual shell tokens and reference composition foundation

**Wave 2 *(blocked on Wave 1 completion)***
- [x] 03.5-02-PLAN.md — Branded catalog and reference-style inspector polish
- [x] 03.5-03-PLAN.md — Premium dotted canvas, split tools, and motion

**Wave 3 *(blocked on Waves 1-2 completion)***
- [x] 03.5-04-PLAN.md — Visual contract tests, browser verification, and final QA

Cross-cutting constraints:
- Keep the first screen a focused preview workbench, not a landing page.
- Match the agreed NodeFlow-style reference direction: branded left library, dotted canvas, right inspector, soft white panels, black action surfaces, and controlled purple accent.
- Remove primary visible `Labels` chrome and visible generated IDs such as `node-1` from the normal preview UI.
- Keep visual beauty preview-local; renderer component defaults and shipped package surface remain Phase 3.6 and Phase 3.7 responsibilities.

---

### Phase 3.6: Default Component Look Lockdown (INSERTED)
**Goal:** Lock down Cora's built-in component appearance, color palette, font choices, spacing, and sensible defaults so rendered diagrams and preview/canvas components feel consistent before Phase 4 makes them directly editable.
**Mode:** mvp
**Requirements:** LOOK-01–07
**UI hint:** no (visual system and renderer defaults; no new interactive surface)
**Depends on:** Phase 3.5 (preview visual direction should inform but not dictate component defaults) and Phase 3.4 (ASCII export should remain independent from visual styling)

**Requirements (LOOK-*):**
- **LOOK-01:** Define a canonical default visual language for all built-in nodes, groups, lines, labels, markers, and component states.
- **LOOK-02:** Lock default colors for backgrounds, borders, text, lines, semantic states, and muted UI surfaces with sufficient contrast.
- **LOOK-03:** Lock default typography around bundled Noto Sans, including font weights, label sizes, line heights, and truncation/wrapping behavior.
- **LOOK-04:** Normalize component sizing, padding, radii, shadows, line widths, marker sizes, and group spacing across renderer and preview usage.
- **LOOK-05:** Ensure YAML/component omitted props resolve to sensible defaults without producing visually sparse or inconsistent diagrams.
- **LOOK-06:** Preserve SVG/PDF golden stability and keep ASCII export unaffected by visual defaults.
- **LOOK-07:** Document the default look contract for future themes, extensions, and Interactive Canvas editing controls.

**Success Criteria:**
1. Default component props produce polished output for every built-in catalog component without requiring per-node styling
2. Representative valid examples render with consistent colors, typography, spacing, line treatments, and group styling
3. Golden coverage protects the locked default look from accidental drift
4. Preview controls and renderer defaults agree on initial values for size, color, typography, borders, shadows, markers, and labels
5. Docs describe the default visual contract and when authors should override it

**Research flag:** Light visual audit recommended — use the existing preview and golden examples to compare the current defaults, then codify the chosen tokens and defaults.

**Pitfalls to address:**
- Do not invent a full theme marketplace here; Phase 5 owns extension themes
- Avoid one-off per-component magic values; define shared tokens/default helpers where the renderer already has seams
- Do not regress PDF text overlay alignment or font embedding
- Keep defaults agent-friendly: omitted YAML fields should render well without extra styling advice

**Plans:** 4 plans

Plans:
**Wave 1**
- [x] 03.6-01-PLAN.md — Shared Tailwind look contract, catalogDefaultProps factory, and defaultTheme rebuild

**Wave 2 *(blocked on Wave 1 completion)***
- [x] 03.6-02-PLAN.md — Renderer YAML path: measurement, catalog props, LayoutBoxNode radius/no-shadow
- [x] 03.6-03-PLAN.md — Preview sync: defaults.ts, builtins.tsx, look-sync regression test

**Wave 3 *(blocked on Waves 1–2 completion)***
- [x] 03.6-04-PLAN.md — Golden baseline refresh (D-13), ASCII/PDF gates, AGENTS.md Default Look docs

Cross-cutting constraints:
- Single source: `renderer/themes/componentDefaults.ts` feeds theme, renderer, and preview (D-12).
- No runtime Tailwind/CSS; static hex map only (D-02).
- Preview workbench chrome (`preview/styles.css`) stays Phase 3.5 local — diagram defaults only.
- Golden refresh is intentional approved baseline update, not accidental drift (D-13).

---

### Phase 3.7: Component/Icon Package Surface Lockdown (INSERTED)
**Goal:** Decide and enforce exactly which default components, SVG icon assets, renderer APIs, CLI commands, and built package files ship in the public `cora` package, with preview retained as a development-phase tool rather than a distributed user feature.
**Mode:** mvp
**Requirements:** PACK-01–08
**UI hint:** no (package/API contract and asset surface; no new UI)
**Depends on:** Phase 3.6 (default look contract should be locked before deciding what ships) and Phase 3.3 (preview proved the component catalog but does not define the package surface)

**Requirements (PACK-*):**
- **PACK-01:** Define the canonical built-in component set that ships as supported v1 renderer components.
- **PACK-02:** Define the default SVG icon set that ships in core, including names, purposes, licensing assumptions, and how icon slots resolve without extensions.
- **PACK-03:** Decide which component/icon APIs are public package exports and which remain internal implementation details.
- **PACK-04:** Remove preview from the distributed package surface; preview may remain available for local development/testing but must not be advertised or required as a user-facing installed feature.
- **PACK-05:** Update packaging rules so npm artifacts include only runtime-required CLI, schema, renderer, fonts, examples/docs, and approved assets.
- **PACK-06:** Add package smoke checks that fail if development-only preview assets or commands leak into the published tarball.
- **PACK-07:** Document the package contents contract for agents, downstream users, and future extension authors.
- **PACK-08:** Reconcile README, AGENTS.md, examples, and CLI help so they describe only the supported shipped surface.

**Success Criteria:**
1. A documented list of supported built-in components and default SVG icons exists, with clear public/internal boundaries
2. `npm pack` or the clean-install smoke path proves preview assets are not shipped as a distributed feature
3. CLI help and docs no longer present `cora preview` as an installed-user workflow if it is development-only
4. Package `files`/build output include all required renderer/runtime assets and exclude development-only preview artifacts
5. Tests or smoke scripts catch accidental package-surface drift

**Research flag:** Standard patterns — inspect npm package contents and existing exports/build rules; no external research required.

**Pitfalls to address:**
- Do not break prior preview work silently; preserve it as a local development aid if still useful
- Do not ship unlicensed or ambiguous SVG icon assets in core
- Keep extension-system room open: default icons should not preclude provider icon packs in Phase 5
- Avoid making internal renderer implementation details part of the public API by accident
- Keep AGENTS.md aligned with the real installable package, not development-only conveniences

**Plans:** 4 plans

Plans:
**Wave 1**
- [x] 03.7-01-PLAN.md — Preview CLI exclusion, Vite devDep relocation, build pipeline separation

**Wave 2 *(blocked on Wave 1 completion)***
- [x] 03.7-02-PLAN.md — Default SVG icon set, renderer icon resolution, built-in provider validation, preview icon controls
- [x] 03.7-03-PLAN.md — Package tarball integrity smoke test and clean-install script updates

**Wave 3 *(blocked on Waves 1–2 completion)***
- [x] 03.7-04-PLAN.md — AGENTS.md, README.md, SKILL.md docs reconciliation and final verification

---

### Phase 3.8: Grid Capability Expansion (INSERTED)
**Goal:** Give Cora's diagram grid more capability before the interactive canvas depends on it, so layout, snapping, visual grid affordances, and future edit interactions have a stronger foundation.
**Mode:** mvp
**Requirements:** GRID-*
**UI hint:** yes — grid behavior affects preview/canvas ergonomics and the upcoming Interactive Canvas
**Depends on:** Phase 3.6 (default look should define grid-adjacent visual defaults) and Phase 3.7 (package surface should decide whether grid helpers are public or internal)

**Success Criteria:**
1. Grid behavior expectations are explicit for renderer, preview, and future canvas usage
2. Snapping, spacing, coordinate, or alignment defaults are defined where the current grid model is too weak
3. Any new grid capabilities stay compatible with existing SVG/PDF/text rendering paths
4. Preview/canvas-facing behavior is documented enough for Phase 4 to consume without re-deciding grid semantics
5. Tests or fixtures protect grid behavior that affects generated output or edit-time interactions

**Research flag:** Light research recommended — inspect current preview/grid code and renderer coordinate assumptions before planning implementation.

**Pitfalls to address:**
- Do not let edit-time grid affordances leak into static text export
- Keep existing valid examples and golden outputs stable unless the grid capability intentionally changes layout
- Avoid making preview-only helpers part of the package surface after Phase 3.7 locks distribution rules
- Preserve pinned-node and layout-mode semantics from earlier phases

**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd-plan-phase 3.8 to break down)

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
3d. **ASCII export before interactive canvas (Phase 3.4, INSERTED)** — add a text-native agent output lane and skills handoff before the roadmap shifts to YAML writeback and human editing
3e. **Preview visual beauty before default lockdown (Phase 3.5, INSERTED)** — decide what makes the preview workbench feel beautiful and useful before locking renderer defaults and canvas behavior around it
3f. **Default look lockdown before interactive canvas (Phase 3.6, INSERTED)** — stabilize the built-in visual contract before users begin editing and saving component styling through the canvas
3g. **Package surface lockdown before interactive canvas (Phase 3.7, INSERTED)** — decide what components, icons, assets, and commands are actually shipped before `cora serve` expands the installed runtime surface
3h. **Grid capability expansion before interactive canvas (Phase 3.8, INSERTED)** — strengthen grid behavior before Phase 4 builds direct manipulation, snapping, and layout polish on top of it
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
