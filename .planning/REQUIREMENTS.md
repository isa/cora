# Requirements: Cora

**Defined:** 2026-05-21
**Core Value:** An AI agent can write a YAML diagram, run `cora validate` and `cora render`, and produce a professional-looking architectural diagram without touching a visual editor — while humans can still polish the result when needed.

## v1 Requirements

### Spec & Schema

- [ ] **SPEC-01**: Diagram files declare `version: 1` at the top level
- [ ] **SPEC-02**: Diagram spec uses layered hybrid model (nodes, edges, groups + kind-specific extensions)
- [ ] **SPEC-03**: YAML is the primary input format; JSON is supported via file extension auto-detection
- [ ] **SPEC-04**: One diagram per file (single `diagram:` root)
- [ ] **SPEC-05**: JSON Schema defines the full v1 spec shape and is the validation source of truth
- [ ] **SPEC-06**: v1 diagram kinds supported: box-arrows, flowchart, microservice topology, cloud/infra, basic database

### CLI — Agent Contract

- [ ] **CLI-01**: `cora validate <file>` validates a diagram against JSON Schema
- [ ] **CLI-02**: `cora validate --format json` emits structured errors with stable codes and JSON paths
- [ ] **CLI-03**: `cora validate` defaults to human-readable output when stdout is a TTY
- [ ] **CLI-04**: `cora schema` exports the JSON Schema for agent consumption
- [ ] **CLI-05**: `cora render <file> -o <path>` renders diagram artifacts
- [ ] **CLI-06**: `cora serve <file>` launches interactive canvas for layout/label polish
- [ ] **CLI-07**: `cora doctor` reports Node version, config paths, and environment health
- [ ] **CLI-08**: `--yes` and `CORA_AUTO_INSTALL=1` enable non-interactive CI operation

### Layout

- [ ] **LAY-01**: ELK auto-layout computes node positions for graph-like diagrams
- [ ] **LAY-02**: `layout: auto | preserve | hybrid` controls layout behavior
- [ ] **LAY-03**: Nodes with `pinned: true` retain position during hybrid/auto re-layout
- [ ] **LAY-04**: ELK runs in a worker thread to avoid blocking the serve event loop

### Renderer & Theme

- [ ] **REN-01**: React renderer produces pure SVG (no `foreignObject`, no HTML-in-SVG)
- [ ] **REN-02**: Same render tree used for headless export and interactive canvas
- [ ] **REN-03**: Renderer components are stateless pure functions of `LayoutedDiagram` props
- [ ] **REN-04**: Built-in polished `default` theme works without extensions installed
- [ ] **REN-05**: Built-in renderer exposes a consistent catalog-driven node/group/line model rather than preserving legacy shape-specific public components
- [ ] **REN-06**: Edge labels render at configured positions with routing from ELK
- [ ] **REN-07**: SVG export includes viewBox padding to prevent clipping
- [ ] **REN-08**: DOM-free text measurement computes node dimensions before ELK layout

### Renderer Component Library

- [x] **RCL-01**: Public component catalog includes `Group`, `BoxNode`, `LabelNode`, `IconNode`, `LabelIconNode`, `WebsiteNode`, `PageNode`, `AppNode`, `DecisionNode`, `IssueNode`, `ShapeNode`, `Line`, and reusable markers
- [x] **RCL-02**: Legacy shape-specific public components and shape values are removed or replaced consistently across renderer, schema, examples, goldens, and docs
- [x] **RCL-03**: Box-like components share `BoxStyleProps` with `backgroundColor`, `radius`, `borderStyle`, `borderColor`, `borderWidth`, `text`, `textColor`, and `size`
- [x] **RCL-04**: `borderStyle` values are `none | solid | dashed | dotted`; `size` supports `{ width: number; height: number } | "sm" | "md" | "lg" | "xl" | "xxl"`
- [x] **RCL-05**: Specialized props are normalized: `PageNode.type = landing | form | content | profile | settings`, `IssueNode.icon = bug | warning | error | stop`, icon-bearing nodes use `iconColor`, and `PageNode` uses `skeletonColorDark` / `skeletonColorLight`
- [x] **RCL-06**: `WebsiteNode` and `AppNode` support optional `text`; box-driven nodes may bear icons where appropriate
- [x] **RCL-07**: `IconNode` is icon-only and renders an SVG icon from the component-side icon slot/pack contract without implementing extension loading
- [x] **RCL-08**: `Line` takes explicit routed `points: Array<{ x: number; y: number }>` and supports `lineStyle`, `strokeColor`, `strokeWidth`, `startMarker`, and `endMarker`
- [x] **RCL-09**: Marker values are `none | arrow | circle | filledCircle`; `Line` is the public edge primitive and `Arrow` is internal compatibility only
- [x] **RCL-10**: Components remain pure React/SVG functions with no DOM dependency and no direct YAML parsing

### Export

- [ ] **EXP-01**: `cora render -o out.svg` writes SVG via `renderToStaticMarkup`
- [x] **EXP-02**: `cora render -o out.pdf` produces PDF via bundled resvg + pdf-lib (default)
- [x] **EXP-03**: `--quality=high` uses Playwright for high-fidelity PDF
- [x] **EXP-04**: First `--quality=high` use prompts to download Chromium to `$HOME/.config/cora/browsers/`
- [x] **EXP-05**: resvg PDF path works on normal `npm install` without extra browser deps

### Interactive Canvas

- [ ] **SRV-01**: Canvas supports drag/pin of nodes and groups
- [ ] **SRV-02**: Canvas supports inline label editing
- [ ] **SRV-03**: Save patches position, pinned, and label fields back to source YAML via AST (preserves comments)
- [ ] **SRV-04**: File watch hot-reloads diagram on external YAML changes
- [ ] **SRV-05**: Unsaved-change guard prompts before overwriting canvas edits on external reload
- [ ] **SRV-06**: Structural edits (add/remove nodes/edges) remain YAML-only — not in canvas UI
- [ ] **SRV-07**: Pre-built web assets ship inside npm package (no Vite at serve runtime)

### Extensions

- [ ] **EXT-01**: `cora ext install <id>` fetches extensions from `cora-extensions` git registry (tagged releases)
- [ ] **EXT-02**: `cora ext list` shows installed and available extensions
- [ ] **EXT-03**: Extensions cache to `$HOME/.config/cora/extensions/`
- [ ] **EXT-04**: `cora.extensions.lock.json` pins extension versions per project (committed to git)
- [ ] **EXT-05**: Global defaults in `$HOME/.config/cora/extensions.json`; project lock overrides
- [ ] **EXT-06**: Extension install is compatibility-aware with installed `cora` version
- [ ] **EXT-07**: Missing required extension hard-fails with actionable install instructions
- [ ] **EXT-08**: Theme extensions resolve `provider` + `service` to icons and default styling

### Agent Documentation

- [ ] **AGT-01**: `AGENTS.md` documents the agent workflow, error codes, and JSON output shapes
- [ ] **AGT-02**: Canonical example diagrams exist for each v1 diagram kind
- [ ] **AGT-03**: Error codes include at minimum: `UNKNOWN_SERVICE`, `MISSING_EDGE_TARGET`, `MISSING_EXTENSION`, `SCHEMA_VIOLATION`

## v2 Requirements

Deferred to post-v1. Tracked but not in current roadmap.

### Diagram Types

- **DIAG-01**: Sequence diagrams with custom lifeline layout
- **DIAG-02**: State diagrams with custom hierarchical layout
- **DIAG-03**: Advanced ER diagrams with crow's foot notation

### Platform

- **PLAT-01**: MCP server exposing validate/render tools
- **PLAT-02**: Multi-diagram project config file
- **PLAT-03**: `cora migrate` for schema version upgrades
- **PLAT-04**: Full structural canvas editor (add/remove nodes in UI)

## Out of Scope

| Feature | Reason |
|---------|--------|
| MCP server (v1) | CLI is runtime-agnostic; sufficient for all agents today |
| Sequence/state/advanced ER (v1) | Require custom layout engines; shipping at basic quality hurts brand |
| Full structural canvas editor (v1) | Agents own structure; canvas is layout/label polish only |
| Multi-diagram files (v1) | Ambiguous render target for agents |
| Many `@cora/*` npm packages | Single `cora` publish; extensions via git registry |
| Bundled cloud icons in core | Trademark/licensing separation |
| Silent fallback on missing extensions | Agents need deterministic output |
| npm-published community extensions (v1) | Quality control via PR to `cora-extensions` |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SPEC-01 | Phase 1 | Pending |
| SPEC-02 | Phase 1 | Pending |
| SPEC-03 | Phase 1 | Pending |
| SPEC-04 | Phase 1 | Pending |
| SPEC-05 | Phase 1 | Pending |
| SPEC-06 | Phase 1 | Pending |
| CLI-01 | Phase 1 | Pending |
| CLI-02 | Phase 1 | Pending |
| CLI-03 | Phase 1 | Pending |
| CLI-04 | Phase 1 | Pending |
| CLI-08 | Phase 1 | Pending |
| AGT-01 | Phase 1 | Pending |
| AGT-03 | Phase 1 | Pending |
| LAY-01 | Phase 2 | Pending |
| LAY-02 | Phase 2 | Pending |
| LAY-03 | Phase 2 | Pending |
| LAY-04 | Phase 2 | Pending |
| REN-01 | Phase 2 | Pending |
| REN-02 | Phase 2 | Pending |
| REN-03 | Phase 2 | Pending |
| REN-04 | Phase 2 | Pending |
| REN-05 | Phase 2 | Pending |
| REN-06 | Phase 2 | Pending |
| REN-07 | Phase 2 | Pending |
| REN-08 | Phase 2 | Pending |
| RCL-01 | Phase 3.2 | Done (3.2-04) |
| RCL-02 | Phase 3.2 | Done (3.2-04) |
| RCL-03 | Phase 3.2 | Done (3.2-04) |
| RCL-04 | Phase 3.2 | Done (3.2-04) |
| RCL-05 | Phase 3.2 | Done (3.2-04) |
| RCL-06 | Phase 3.2 | Done (3.2-04) |
| RCL-07 | Phase 3.2 | Done (3.2-04) |
| RCL-08 | Phase 3.2 | Done (3.2-04) |
| RCL-09 | Phase 3.2 | Done (3.2-04) |
| RCL-10 | Phase 3.2 | Done (3.2-04) |
| CLI-05 | Phase 2 | Pending |
| EXP-01 | Phase 2 | Pending |
| EXP-02 | Phase 3 | Done (03-02) |
| EXP-03 | Phase 3 | Done (03-03) |
| EXP-04 | Phase 3 | Done (03-03) |
| EXP-05 | Phase 3 | Done (03-04) |
| CLI-06 | Phase 4 | Pending |
| SRV-01 | Phase 4 | Pending |
| SRV-02 | Phase 4 | Pending |
| SRV-03 | Phase 4 | Pending |
| SRV-04 | Phase 4 | Pending |
| SRV-05 | Phase 4 | Pending |
| SRV-06 | Phase 4 | Pending |
| SRV-07 | Phase 4 | Pending |
| EXT-01 | Phase 5 | Pending |
| EXT-02 | Phase 5 | Pending |
| EXT-03 | Phase 5 | Pending |
| EXT-04 | Phase 5 | Pending |
| EXT-05 | Phase 5 | Pending |
| EXT-06 | Phase 5 | Pending |
| EXT-07 | Phase 5 | Pending |
| EXT-08 | Phase 5 | Pending |
| CLI-07 | Phase 6 | Pending |
| AGT-02 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 54 total
- Mapped to phases: 54
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-21*
*Last updated: 2026-05-22 after Phase 3.2 execution*
