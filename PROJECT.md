# Cora

## What This Is

Cora is an open-source diagram tool built for AI coding agents and the humans who review their output. Agents author architecture diagrams as YAML or JSON; the CLI validates them against a v1 schema and renders professional SVG, PNG, PDF, or text artifacts. Humans can inspect built-in renderer components today with `cora preview`; the source-of-truth diagram remains the YAML/JSON file.

The project ships as a single **`cora`** npm package from the `packages/cora` workspace. Extension commands, provider themes, and the full interactive `cora serve` editing loop are still deferred.

## Current Capability

- `cora validate` validates YAML/JSON diagrams and emits structured errors for agents and CI.
- `cora schema` prints or writes the v1 JSON Schema.
- `cora render` writes SVG, PNG, PDF, or text output. When `-o` is omitted, it prints the text diagram to stdout.
- PDF rendering has two lanes: a default browser-free resvg + pdf-lib path with selectable Noto Sans text, and optional `--quality=high` Playwright/Chromium rendering after explicit install consent.
- `cora preview` starts a local Vite-backed component workbench for built-in renderer components. Preview drag/selection state is local to the workbench and does not patch diagram files.
- Built-in renderer components share a locked default look through `catalogDefaultProps()` in `packages/cora/src/renderer/themes/componentDefaults.ts`, consumed by both the pure SVG renderer and preview controls.
- Offline Iconify support currently includes bundled Material Symbols/Basil data; `provider: default` plus `service: database` remains an alias for `material-symbols:database`.

## Requirements

### Validated

- [x] YAML/JSON diagram spec (`version: 1`) with JSON Schema validation
- [x] CLI: `cora validate`, `cora render`, `cora preview`, `cora schema`
- [x] v1 diagram kinds: `box-arrows`, `flowchart`, `microservice`, `infra`, `database`
- [x] ELK auto-layout with pinned position support (`layout: auto | preserve | hybrid`)
- [x] React renderer producing pure SVG with no `foreignObject`
- [x] SVG, PNG, PDF, and text exports
- [x] Browser-free PDF export with bundled Noto Sans selectable text
- [x] Optional high-quality PDF export via Playwright/Chromium with explicit install consent
- [x] Component preview workbench for built-in nodes, groups, connections, controls, and drag-local inspection
- [x] Structured validation/render errors for agent repair loops
- [x] Agent docs: `AGENTS.md`, root `SKILL.md`, schema contract, and example gallery
- [x] Package smoke coverage for clean install, no Chromium postinstall download, fonts, preview assets, and packaged `SKILL.md`

### Active

- [ ] Component/icon package surface lockdown before public v1 API freeze
- [ ] Grid capability expansion before direct-manipulation canvas work
- [ ] Interactive `cora serve` canvas for human layout polish
- [ ] Extension system for provider themes and icons
- [ ] `cora doctor` diagnostics
- [ ] v1 release hardening and documentation polish

### Out of Scope

- **MCP server** - CLI is the agent interface; MCP may come later.
- **Sequence diagrams (v1)** - require custom layout; deferred to v1.x.
- **State diagrams (v1)** - require custom layout; deferred to v1.x.
- **Advanced ER diagrams (v1)** - crow's foot and cardinality layout are deferred to v1.x.
- **Full structural canvas editor (v1)** - add/remove nodes and edges remain agent/YAML-owned.
- **Multi-diagram files (v1)** - one diagram per YAML/JSON file.
- **Many `@cora/*` npm packages** - single `cora` publish; internal subpaths expose supported contracts.
- **Silent fallback when extensions or high-quality PDF dependencies are missing** - failures stay explicit and structured.

## Context

### Users

| User | Primary workflow |
|------|------------------|
| AI coding agents | Write YAML/JSON -> `cora validate --format json` -> `cora render` -> commit artifacts |
| Human engineers | Render artifacts for review, use `cora preview` to inspect component appearance, later use `cora serve` for layout polish |

### Problem

Existing diagram-as-code tools optimize for syntax brevity more than review-ready architecture output. Agents need a structured spec with validation, deterministic default styling, offline icons, and machine-readable errors. Humans need a way to inspect and eventually polish the result without making a visual editor the structural source of truth.

### Architecture Overview

```text
YAML/JSON spec
  -> core        parse, validate, measure, layout (ELK), resolve theme
  -> renderer    React -> pure SVG components
  -> outputs
      |-- render .svg
      |-- render .png via resvg
      |-- render .pdf via resvg + pdf-lib selectable text
      |-- render .pdf --quality=high via Playwright/Chromium
      `-- render text via layouted IR

preview
  -> Vite server + React workbench
  -> built-in component pack + shared default props
```

### Spec Format

```yaml
version: 1

diagram:
  kind: infra
  theme: default
  layout: auto
  nodes:
    - id: api
      label: API
      component: app
      icon: material-symbols:database
      position: { x: 420, y: 180 }
      pinned: true
  edges:
    - from: api
      to: db
      label: read/write
      endMarker: arrow
  groups: []
```

- YAML is primary; files ending in `.json` are parsed as JSON.
- One diagram per file in v1.
- `version: 1` is required at the document root.
- Node components are `box`, `label`, `icon`, `labelIcon`, `website`, `document`, and `app`; omit `component` for the default `box`.
- Edge markers are `none`, `arrow`, `circle`, `filledCircle`, `diamond`, `filledDiamond`, `square`, and `filledSquare`.
- The schema is authoritative. Run `cora schema` before adding fields.

### User Data Paths

```text
$HOME/.config/cora/
  browsers/            Chromium cache for --quality=high after consent
```

### Export Behavior

| Output | Engine | Notes |
|--------|--------|-------|
| SVG | React server render | Pure SVG, no `foreignObject` |
| PNG | resvg | Scale controlled by `--size sm|md|lg|xl|xxl` |
| PDF | resvg + pdf-lib | Browser-free default, selectable Noto Sans text |
| PDF high | Playwright + Chromium | `--quality=high`; first use prompts or requires `--yes`/`CORA_AUTO_INSTALL=1` |
| Text | Layouted IR | Stdout by default, `.txt` with `-o`, Unicode or ASCII charset |

## Internal Monorepo Layout

```text
cora/
  packages/cora/
    src/cli/                 validate, render, preview, schema
    src/core/                parse, validate, layout, theme resolution
    src/renderer/            React/SVG renderers, PNG/PDF/text exporters
    src/renderer/components/ public component contract for v1 renderer components
    src/preview/             local component workbench
    tests/                   CLI/core/renderer/PDF/preview/smoke coverage
```

## Constraints

- **License**: Apache 2.0 for core; icon/font assets retain their upstream licenses.
- **Agent interface**: CLI first in v1.
- **Rendering**: Pure SVG output, no `foreignObject`.
- **React**: Shared render tree for headless SVG export and preview component rendering.
- **Default look**: Centralized through `catalogDefaultProps()` and look/font tokens; preview controls must stay synchronized.
- **Chromium**: Never downloaded during package install; only via the `--quality=high` lane after consent.
- **Publish surface**: Single `cora` npm package with explicit subpath exports.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Structured YAML/JSON spec + CLI | Agents can generate, validate, and repair deterministic files | Shipped |
| `version: 1` field | Explicit schema contract for agents | Shipped |
| One diagram per file | Keeps render targets unambiguous | Shipped |
| ELK layout with pinned positions | Covers graph-like architecture diagrams first | Shipped |
| React renderer with pure SVG output | One render path, compatible with resvg and headless export | Shipped |
| Browser-free PDF default plus optional Playwright high-quality lane | Small install by default, richer rendering when explicitly requested | Shipped |
| Lazy Chromium install to `$HOME/.config/cora/browsers/` | Avoids postinstall downloads and keeps CI predictable | Shipped |
| Text renderer from layouted IR | Makes diagrams usable in terminals, Markdown, PRs, and agent logs | Shipped |
| `cora preview` before `cora serve` | Lets renderer component work mature before source-file editing | Shipped |
| Component APIs behind `cora/renderer/components` | Supports preview and future extensions without exporting internals from the top-level package | Shipped |
| Centralized default component look | Keeps renderer and preview controls visually consistent | Shipped |
| `cora serve`, `cora ext`, `cora doctor` deferred | Keep v1 slices narrow and verified before broadening scope | Active/deferred |

## Evolution

After each milestone:

1. Move shipped requirements from Active to Validated.
2. Revisit Out of Scope; deferrals may become Active in v1.x.
3. Log new decisions in Key Decisions with outcomes.
4. Update "What This Is" if the product has drifted.

---
*Last updated: 2026-05-27 after documentation refresh for Phases 3.4-3.6.*
