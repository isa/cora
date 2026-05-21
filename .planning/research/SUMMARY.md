# Project Research Summary

**Project:** Cora — open-source AI-agent diagram tool
**Domain:** Diagram-as-code / visual tooling (agent-first)
**Researched:** 2026-05-21
**Confidence:** HIGH

## Executive Summary

Cora occupies a genuine gap in the diagram-as-code ecosystem: the combination of agent-grade structured spec + professional visual output + curated provider themes + lightweight CI path does not exist in any current tool (Mermaid, D2, PlantUML, Structurizr). The recommended build approach is a strict four-module monorepo (`core → renderer → web → cli`) with a single published npm package, where `DiagramIR` is the typed contract between modules. Every technology decision in STACK.md is high-confidence and well-justified; the stack is lean, modern, and avoids deprecated or unmaintained libraries.

The key risk area is the renderer pipeline: text measurement without a DOM, YAML AST preservation on save, and ensuring the same React component tree works correctly in both headless (`renderToStaticMarkup`) and interactive (browser canvas) contexts. These three concerns must be resolved architecturally in early phases — they are hard to retrofit. ELK edge routing and extension version drift are secondary risks that are fully mitigatable with explicit version pinning and load-time validation.

The feature scope in PROJECT.md is well-calibrated. The anti-feature list is disciplined and correct — resist the temptation to add sequence diagrams, structural canvas editing, or MCP server in v1. The agent contract (JSON Schema + structured errors + AGENTS.md) should be established in Phase 1, not bolted on at the end, because every subsequent phase produces output that must satisfy it.

---

## Key Findings

### Recommended Stack

The stack is fully verified against npm registry and official documentation (HIGH confidence throughout). The single most important constraint is **Node.js 20+ minimum** — chokidar v5, required for `cora serve` file watching, dropped Node 18 support. The recommended runtime is Node 22 LTS.

Library bundling uses **tsdown** (not tsup — tsup entered maintenance-only in Nov 2025). Monorepo management uses **pnpm 9 + Turborepo 2**. For YAML, `eemeli/yaml` is the only viable option — `js-yaml` discards the AST and cannot satisfy the save-back requirement. For validation, AJV 8.x is preferred over Zod because agents need a machine-readable JSON Schema, not TypeScript-first schema definitions.

**Core technologies:**
- `Node.js 22 LTS` / `TypeScript 5.x`: runtime and language — stable, ESM-native, required by chokidar v5
- `pnpm 9` + `Turborepo 2`: monorepo tooling — strict hoisting, fast incremental builds
- `tsdown`: library bundler — tsup successor, Rolldown-powered, zero-config
- `yaml` (eemeli): YAML parse + AST — only option with comment-preserving AST; critical for save-back
- `ajv 8.x` + `ajv-formats`: JSON Schema validation — 305M weekly downloads, machine-readable structured errors
- `elkjs 0.11.1`: graph layout — only mature JS layout engine; ELK_LAYERED, FORCE, TREE, RADIAL algorithms
- `React 19` + `renderToStaticMarkup`: shared render tree for headless SVG and interactive canvas
- `@resvg/resvg-js` + `pdf-lib`: default PDF pipeline — Rust binaries, no system deps, fast
- `playwright-core` (lazy): high-quality PDF — Chromium deferred to `~/.config/cora/browsers/` on first use
- `Vite 6` + `express 5` + `ws 8` + `chokidar 5`: interactive canvas stack for `cora serve`
- `commander 12.x`: CLI framework — 35M weekly downloads vs oclif's 200K; right-sized for 5-command CLI

**Critical version note:** Pin `elkjs` to exact minor (`^0.11.1`), pin `resvg-js` to exact minor (`~2.6.2`) — both have breaking behavior changes on minor bumps.

### Expected Features

The ecosystem comparison confirms Cora's positioning is sound. No existing tool combines all four of: agent-grade structured spec, professional visual output, curated provider themes, and lightweight CI path.

**Must have (table stakes):**
- YAML/JSON spec with JSON Schema validation and structured error codes
- CLI: `validate`, `render`, `serve`, `schema`, `ext`, `doctor`
- Auto-layout (ELK) with pinned position support (`auto | preserve | hybrid`)
- Multiple diagram kinds: box-arrows, flowchart, microservice topology, cloud/infra, basic database
- SVG + PDF export (resvg bundled default; Playwright `--quality=high` optional)
- Built-in polished `default` theme — no extensions required for a good first impression
- Live preview via `cora serve` with file watching and hot-reload
- Interactive canvas: drag/pin nodes, inline label edits, AST-patched YAML save-back

**Should have (differentiators):**
- `cora schema` exports JSON Schema for agent consumption
- `cora validate --format json` with stable error codes (`UNKNOWN_SERVICE`, `MISSING_EDGE_TARGET`, etc.)
- `AGENTS.md` + example gallery for agent copy-paste patterns
- AST-preserving YAML round-trip (comments, field order, unknown fields survive canvas edits)
- Extension system with `cora.extensions.lock.json` for reproducible CI rendering
- Hard fail on missing extensions (never silent fallback)
- Unsaved-change guard on external file edits during `cora serve`
- CI-friendly flags: `--yes`, `CORA_AUTO_INSTALL=1`
- `cora doctor` for environment self-diagnosis

**Defer (v1.x+):**
- Sequence, state, advanced ER diagrams — custom layout engine required; ELK insufficient
- MCP server — CLI is already runtime-agnostic; MCP is an optional layer
- Multi-diagram files — one diagram per file in v1; project config deferred
- `cora migrate` — no schema v2 exists yet
- Full structural canvas editor — agents own structure; humans polish layout only

### Architecture Approach

Four internal modules with a strict, unidirectional dependency chain: `core` ← `renderer` ← `web` ← `cli`. No module reaches "up." The `DiagramIR` / `LayoutedDiagram` typed interface is the sole contract between modules — raw YAML and DOM objects never cross module boundaries. The renderer is intentionally stateless (no `useState`, `useEffect`, `useRef`) so the same component tree runs identically in `renderToStaticMarkup` (Node.js) and the browser canvas. All interaction state lives in `web/Canvas.tsx`.

**Major components:**
1. `core/` — Parse YAML/JSON → DiagramIR; AJV validation; ELK layout (in worker thread); theme/extension resolution; YAML AST patch
2. `renderer/` — Stateless React components: `LayoutedDiagram → <svg>` tree; `renderToSVG()` headless function; pure functions of props only
3. `web/` — Interactive canvas (Vite app); drag/pin handlers; WebSocket sync; unsaved-change guard; pre-built into `dist/web/` at publish time
4. `cli/` — Commander command dispatcher; file I/O; PDF export (resvg + playwright); Express + WS + chokidar server for `serve`

**Key patterns:**
- ELK runs in a worker thread — its JS bundle is CPU-bound and would block the `serve` event loop
- YAML save uses AST patching (`parseDocument → mutate specific scalars → toString`), never full re-serialization
- Extension loading is at pipeline start with hard-fail on missing — no lazy fallbacks
- `dist/web/` is baked into the published npm package at build time; no Vite at serve runtime

### Critical Pitfalls

1. **Text measurement without a DOM** — ELK needs accurate node dimensions before layout. In headless context, `getBBox()` returns zero. Use a DOM-free font metrics library (e.g. Pretext.js or OpenType advance widths) to compute bounding boxes. Resolve this before writing layout code — it cannot be retrofitted.

2. **YAML AST patch destroying formatting** — `eemeli/yaml`'s `setIn()` operations can drop comment attachments from replaced nodes. Only mutate specific scalar values (position x/y, label text, pinned flag) — never replace parent collection nodes. Build a round-trip test before implementing patch save.

3. **resvg font loading failure in nested SVG** — resvg's font discovery only triggers on top-level `<text>` nodes. Text inside nested `<svg>` groups silently falls back to a default glyph. Keep all `<text>` elements at top-level SVG scope. Fail CI on `RUST_LOG=resvg=warn` font-family warnings.

4. **ELK edge routing regression on version bumps** — ELK option interactions are complex and change silently between versions. Always set all layout options explicitly (`hierarchyHandling: INCLUDE_CHILDREN`, `edgeRouting`, `nodePlacement.strategy: BRANDES_KOEPF`). Never rely on defaults. Maintain a golden-image suite from day one.

5. **Canvas ↔ headless SVG divergence** — Browser-specific code paths (`useLayoutEffect`, `window`, `getComputedStyle`, external CSS classes) in renderer components silently produce different output in headless export. Enforce the pure-function component rule architecturally from the start — run `renderToStaticMarkup` in dev cycle, not just CI.

---

## Implications for Roadmap

Feature dependency analysis shows a clear build order. The agent contract must come first — it is the foundation every other phase produces output for. The renderer must be built before PDF export or the interactive canvas. Extensions can only land after the core render pipeline is proven.

### Phase 1: Foundation — Agent Contract + Core Schema
**Rationale:** The JSON Schema and structured validation errors are the contract that every subsequent phase must satisfy. Build this first so agents can start using Cora even before rendering works. Also establishes monorepo structure, tooling, and CI.
**Delivers:** Working `cora validate --format json`, `cora schema`, YAML spec v1, JSON Schema definition, structured error codes, monorepo skeleton (pnpm + Turborepo + tsdown), `AGENTS.md` draft
**Features addressed:** YAML spec, JSON Schema validation, structured errors with codes, CLI skeleton, `cora schema`
**Pitfall avoidance:** Pitfall 12 (agent-hostile errors) — TTY detection and JSON output shape established from day one
**Research flag:** Standard patterns — skip research phase

### Phase 2: Core Renderer + SVG Export
**Rationale:** The renderer is the most technically risky phase. Text measurement without a DOM must be solved here; it cannot be deferred. The stateless pure-function component rule must be established architecturally. ELK integration in a worker thread and the `DiagramIR` contract between modules are defined here.
**Delivers:** Working `cora render --svg` for all 5 diagram kinds; ELK layout with `auto | preserve | hybrid`; polished `default` theme; stateless React component tree; `renderToSVG()` headless function
**Features addressed:** All diagram kinds, auto-layout, node groups, edge labels, SVG export, default theme
**Pitfall avoidance:** Pitfall 1 (text measurement), Pitfall 4 (ELK version pinning + golden images), Pitfall 5 (pure-function renderer), Pitfall 9 (viewBox padding), Pitfall 10 (font embedding decision), Pitfall 11 (SVG namespace)
**Research flag:** NEEDS research phase — DOM-free text measurement library selection (Pretext.js vs alternatives) needs validation before implementation

### Phase 3: PDF Export
**Rationale:** PDF builds directly on the SVG output from Phase 2 via the `resvg → pdf-lib` pipeline. A separate phase because resvg has specific SVG structure requirements (no `foreignObject`, top-level `<text>` nodes) that need explicit CI validation. Playwright high-quality path is a separate concern added here.
**Delivers:** Working `cora render --pdf` (default resvg path); `--quality=high` Playwright path with lazy Chromium download; print-quality 2× scale rendering
**Features addressed:** PDF export, `--quality=high`, CI non-interactive (`--yes` flag), `CORA_AUTO_INSTALL=1`
**Pitfall avoidance:** Pitfall 3 (resvg font loading — verify text placement from Phase 2 is top-level)
**Research flag:** Standard patterns — resvg and pdf-lib are well-documented; skip research phase

### Phase 4: Interactive Canvas (`cora serve`)
**Rationale:** Depends on a proven renderer (Phase 2) and YAML AST understanding. The YAML AST patch save and the file-watch race condition are the two technical risks here. Both must be resolved with tests before the phase is considered done.
**Delivers:** Working `cora serve`; Express + WebSocket + chokidar server; drag/pin nodes; inline label edits; AST-preserving YAML save-back; file-watch hot-reload; unsaved-change guard with content-hash comparison; pre-built `dist/web/` baked into npm package
**Features addressed:** Live preview, file watching, interactive canvas, AST save, unsaved-change guard
**Pitfall avoidance:** Pitfall 2 (YAML AST formatting — round-trip test first), Pitfall 7 (file-watch race — content hash not mtime), Pitfall 8 (ELK performance — worker thread + layout cache keyed on topology hash)
**Research flag:** Standard patterns overall, but YAML AST patch subtleties warrant a focused spike — light research recommended

### Phase 5: Extension System
**Rationale:** Extensions are a pure capability add-on. The core render pipeline must be working and stable before extensions can be layered on top. The lockfile and compatibility versioning are the correctness guarantees for CI reproducibility.
**Delivers:** `cora ext install / list / remove`; GitHub releases-based extension protocol; `cora.extensions.lock.json`; compatibility-aware semver versioning; `coraSchemaVersion` validation at load time; hard-fail on missing extensions; `cora-extensions` repository structure
**Features addressed:** Extension system, provider icons/themes, lockfile, CI reproducibility, hard-fail policy
**Pitfall avoidance:** Pitfall 6 (extension version drift — schema version in manifest + load-time validation)
**Research flag:** Standard patterns — Gemini CLI's git-based extension model is a direct reference; skip research phase

### Phase 6: Hardening + Agent Polish
**Rationale:** Cap the v1 release with `cora doctor`, full AGENTS.md, example gallery, and CI-hardening. These depend on everything else being in place to validate accurately.
**Delivers:** `cora doctor` (Node version, extension health, browser availability checks); complete `AGENTS.md` with all error codes and JSON output schemas; canonical example diagrams for all 5 diagram kinds; CI integration guide; extension system CI cross-version matrix
**Features addressed:** `cora doctor`, AGENTS.md, example gallery, CI flags
**Pitfall avoidance:** Pitfall 12 (agent error output — final validation pass)
**Research flag:** Standard patterns — skip research phase

### Phase Ordering Rationale

- **Schema before renderer:** Agents can start consuming `cora validate` as soon as Phase 1 ships; no need to wait for visual output.
- **Renderer before PDF:** resvg requires specific SVG structure constraints; those must be enforced in the renderer before PDF is attempted.
- **Renderer before canvas:** `cora serve` uses the same React component tree as the headless renderer; the pure-function rule must be established first.
- **Canvas before extensions:** Extension themes are applied by the core pipeline and rendered by the renderer; both must be stable before introducing a new variable.
- **Extensions before hardening:** `cora doctor` needs to check extension health; AGENTS.md needs to document extension error codes.

### Research Flags

**Needs research during planning:**
- **Phase 2 (Renderer):** DOM-free text measurement library selection. Pretext.js is mentioned in PITFALLS.md but needs evaluation against OpenType advance-width approaches and any newer 2026 options. This is the single highest-risk technical decision in the project.
- **Phase 4 (Canvas):** YAML AST patch edge cases — specifically comment transplanting from replaced nodes. The eemeli/yaml issues referenced in PITFALLS.md (#207, #185) should be reviewed before planning the patch implementation.

**Standard patterns — skip research phase:**
- **Phase 1 (Foundation):** Monorepo setup, AJV validation, JSON Schema design — well-documented
- **Phase 3 (PDF):** resvg + pdf-lib pipeline — documented and verified in STACK.md
- **Phase 5 (Extensions):** Git-based extension registry — Gemini CLI is a direct, working reference
- **Phase 6 (Hardening):** CLI polish and documentation — no novel technical challenges

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All major libraries verified against npm registry and official docs (2026-05-21); explicit alternatives considered and rejected with rationale |
| Features | HIGH | Table stakes from established category patterns; differentiators directly derived from PROJECT.md decisions; anti-feature rationale cross-validated against ecosystem |
| Architecture | HIGH | Module boundaries derived directly from PROJECT.md constraints; patterns verified against React SSR docs, ELK docs, and resvg constraints |
| Pitfalls | HIGH | All critical pitfalls sourced from real library issue trackers (elkjs, eemeli/yaml, resvg, React) — not inference |

**Overall confidence:** HIGH

### Gaps to Address

- **DOM-free text measurement:** Pretext.js is identified as a candidate but not evaluated for production readiness, bundle size, or accuracy at small font sizes. Must be resolved in Phase 2 planning before any layout code is written.
- **YAML AST comment transplanting:** The `eemeli/yaml` comment-preservation API is confirmed to exist but the exact approach for transplanting comments from replaced nodes is not fully specified. Needs a proof-of-concept spike before Phase 4 planning.
- **elkjs worker thread in Node.js:** The `web-worker` package is listed in ARCHITECTURE.md for browser-compatible Worker API in Node.js but is not in the STACK.md install list. Verify this is the right package and it's compatible with the monorepo build before Phase 2 planning.
- **Default theme font decision:** System font stack vs. embedded base64 `@font-face` — tradeoff is documented in PITFALLS.md (Pitfall 10) but the decision is deferred. Must be made before SVG export ships in Phase 2, not after.

---

## Sources

### Primary (HIGH confidence)
- elkjs npm registry (v0.11.1, Mar 2026) — layout options, worker thread patterns
- yaml (eemeli) GitHub — AST-preserving parse/modify/stringify; issues #207, #185
- AJV v8 official docs (ajv.js.org) — structured error shapes, JSON Schema drafts
- @resvg/resvg-js GitHub (v2.6.2) — PNG-only output constraint, font loading behavior
- chokidar v5 release notes — Node 20+ requirement
- tsdown.dev — tsup successor, Rolldown-powered bundler
- React official docs — `renderToStaticMarkup` constraints, SVG xmlns requirement
- commander npm trends (35M vs oclif 200K downloads)
- elkjs issues #204, #349, #221 — edge routing regression history
- elkjs issue #179 — NETWORK_SIMPLEX performance collapse
- resvg issue #740 — font loading in nested SVG
- Gemini CLI GitHub — git-based extension loading reference

### Secondary (MEDIUM confidence)
- jsdev.space monorepo guide — pnpm + Turborepo patterns (cross-referenced with official docs)
- text-to-diagram.com — feature comparison matrix for ecosystem positioning
- diagrams.so comparison — D2, Mermaid, Structurizr capability comparison
- NavyaAI blog — two-reader pattern for agent-friendly CLIs

### Tertiary (LOW confidence / needs validation)
- Pretext.js (pretextjs.dev) — DOM-free text measurement candidate; production readiness unverified
- `web-worker` npm package — browser-compatible Worker API for Node.js; not independently verified

---
*Research completed: 2026-05-21*
*Ready for roadmap: yes*
