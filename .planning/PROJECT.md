# Cora

## What This Is

Cora is an open-source diagram tool built for AI coding agents and the humans who review their output. Agents author architectural diagrams as YAML; the CLI validates and renders professional SVG/PDF artifacts. Humans refine layout and labels interactively via `cora serve`, with changes patched back into the same YAML file.

The project ships as a single **`cora`** npm package. Provider-specific themes and icons live in a separate **`cora-extensions`** repository, curated through pull requests.

## Core Value

An AI agent can write a YAML diagram, run `cora validate` and `cora render`, and produce a professional-looking architectural diagram without touching a visual editor — while humans can still polish the result when needed.

## Requirements

### Validated

- [x] YAML diagram spec (`version: 1`) with JSON Schema validation — *Phase 1*
- [x] Layered hybrid diagram model (shared nodes/edges/groups + type-specific extensions) — *schema layer, Phase 1*
- [x] v1 diagram kinds: box-arrows, flowcharts, microservice topology, cloud/infra, basic database — *schema layer, Phase 1*
- [x] Agent docs: `AGENTS.md` draft, structured validation errors — *Phase 1*
- [x] CLI: `cora validate`, `cora schema` — *Phase 1*

### Active

- [ ] CLI: `cora render`, `cora serve`, `cora doctor`, `cora ext install`
- [ ] ELK auto-layout with pinned position support (`layout: auto | preserve | hybrid`)
- [ ] React renderer producing pure SVG (no `foreignObject`)
- [ ] Built-in polished generic `default` theme (no extensions required)
- [ ] SVG export via `renderToStaticMarkup`
- [ ] PDF export via bundled resvg (default); Playwright on `--quality=high`
- [ ] Interactive canvas: drag/pin nodes, inline label edits, AST-patched YAML save
- [ ] File watch in `cora serve` with unsaved-change guard on external edits
- [ ] Extension system backed by `cora-extensions` git registry (PR-curated)
- [ ] Extension install: `cora ext install`, compatibility-aware versioning, lockfiles
- [ ] Agent docs: example gallery (Phase 6 polish)

### Out of Scope

- **MCP server** — CLI is the agent interface; MCP may come later
- **Sequence diagrams (v1)** — require custom layout; deferred to v1.x
- **State diagrams (v1)** — require custom layout; deferred to v1.x
- **Advanced ER diagrams (v1)** — crow's foot, cardinality layout; deferred to v1.x
- **Full structural canvas editor (v1)** — add/remove nodes and edges in UI; agents own structure in YAML
- **Multi-diagram files (v1)** — one diagram per YAML file; project config deferred
- **Many `@cora/*` npm packages** — single `cora` publish; extensions via git registry
- **Bundled cloud provider icons in core** — legal/trademark separation; icons live in `cora-extensions`
- **Silent fallback when extensions missing (v1)** — hard fail with actionable install instructions
- **npm-published community extensions (v1)** — contributions via PR to `cora-extensions` only

## Context

### Users

| User | Primary workflow |
|------|------------------|
| AI coding agents | Write YAML → `cora validate` → `cora render` → commit SVG/PDF |
| Human engineers | `cora serve` → adjust layout/labels → save → `cora render` |

### Problem

Existing diagram-as-code tools (Mermaid, D2, PlantUML) optimize for syntax brevity, not visual quality for cloud/architecture work. Agents need a structured spec with validation, excellent default output, and optional provider-specific theme packs — without a heavyweight visual editor for structural changes.

### Architecture overview

```
YAML spec
  → cora/core        validate, layout (ELK), resolve theme
  → cora/renderer    React → pure SVG components
  → outputs
      ├── cora serve       live React canvas (drag/pin, labels)
      ├── cora render .svg renderToStaticMarkup
      └── cora render .pdf resvg (default) | Playwright (--quality=high)
```

### Spec format

```yaml
version: 1

diagram:
  kind: infra
  theme: default
  layout: auto
  nodes:
    - id: api
      label: API Gateway
      shape: rounded
      provider: aws        # requires extension
      service: lambda      # requires extension
      position: { x: 420, y: 180 }
      pinned: true
  edges:
    - from: api
      to: db
      label: read/write
  groups: []
```

- **YAML primary**, JSON supported (auto-detect by extension)
- **One diagram per file** in v1
- **`version: 1`** required at top level; `cora migrate` deferred until schema v2
- **Theming**: built-in `default` theme; provider themes via extensions; optional per-node `style:` overrides
- **Semantic styling preferred**: `provider` + `service` resolve to icons/colors via extension registry

### Extension model

| Piece | Location |
|-------|----------|
| Core tool | `cora` npm package (monorepo, single publish) |
| Themes & icons | `cora-extensions` GitHub repo |
| Contribution | PR to `cora-extensions` (not npm publish) |
| Install | `cora ext install aws-theme` → fetch tagged release → cache locally |
| Global config | `$HOME/.config/cora/extensions.json` |
| Project lock | `cora.extensions.lock.json` (committed; overrides global) |

Extension versions are compatibility-aware with the installed `cora` version. Tagged releases on `cora-extensions` — never install from `main` directly.

### User data paths

```
$HOME/.config/cora/
  config.json
  extensions.json
  extensions/          cached extension files
  browsers/            Chromium (only after --quality=high download)
```

### Export behavior

| Output | Engine | Notes |
|--------|--------|-------|
| SVG | Direct from renderer | Fast, default agent/CI path |
| PDF | resvg (bundled) | Works on normal `npm install` |
| PDF high | Playwright + Chromium | `--quality=high`; first use prompts to download ~150 MB to `$HOME/.config/cora/browsers/` |
| CI | `--yes` or `CORA_AUTO_INSTALL=1` | Non-interactive install for PDF high-quality and extensions |

### Interactive canvas (`cora serve`)

- Drag/pin nodes and groups; inline label editing
- Structural changes (add/remove nodes/edges) stay in YAML — agent-authored
- Save writes back via **YAML AST patch** (preserves comments, field order, unknown fields)
- Watches source file; hot-reloads on external change; prompts if canvas has unsaved edits

### Agent contract

- JSON Schema is the single source of truth for the spec shape
- `cora validate --format json` returns structured errors with codes (`UNKNOWN_SERVICE`, `MISSING_EDGE_TARGET`, etc.)
- `cora schema` exports the schema for agent consumption
- `AGENTS.md` + canonical example diagrams for copy-paste patterns

### v1 quality bar

Theme packs, icons, layout, and export must be excellent for in-scope diagram types — not "good enough for now." Deferred diagram types (sequence, state, advanced ER) are explicitly out of v1, not shipped at basic quality.

### Internal monorepo layout

```
cora/
  packages/cora/           ← only published npm artifact
    core/                  parse, validate, ELK layout, theme resolution, extension loader
    renderer/              React → pure SVG
    web/                   interactive canvas
    cli/                   render, serve, validate, schema, ext, doctor
```

## Constraints

- **License**: Apache 2.0 for core; icon packs carry their own licenses in `cora-extensions`
- **Agent interface**: CLI only in v1 — no MCP dependency
- **Rendering**: Pure SVG output only (no `foreignObject`, no HTML-in-SVG) — required for resvg PDF quality
- **React**: Shared render tree for canvas and headless SVG export
- **Extensions**: Separate `cora-extensions` repo — not the main repo
- **Config path**: `$HOME/.config/cora/` (not `~/.cora/`)
- **Publish surface**: Single `cora` npm package; no `@cora/*` package sprawl

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Structured YAML spec + CLI (not MCP) | Agents excel at structured output; CLI is runtime-agnostic | ✓ Phase 1 validate/schema |
| Layered hybrid diagram model | One core vocabulary; type-specific layout/styling profiles | ✓ Phase 1 schema |
| Single `cora` npm package | Simple install; internal modules not published separately | ✓ Phase 1 scaffold |
| `cora-extensions` repo via PR | Curated quality; no npm sprawl; clean icon licensing | — Pending |
| YAML primary, one diagram per file | Agent-friendly; unambiguous render target | ✓ Phase 1 |
| React everywhere, pure SVG | One render path; resvg-compatible PDF | — Pending |
| ELK + custom layout (later) + pinned positions | Graph diagrams first; sequence/state deferred | — Pending |
| Built-in polished `default` theme | Strong zero-extension first impression | — Pending |
| resvg PDF default; Playwright on `--quality=high` | Fast default; optional WYSIWYG fidelity | — Pending |
| Lazy Playwright download to `$HOME/.config/cora/browsers/` | Keep core install small | — Pending |
| Hard fail on missing extensions (v1) | No silently wrong icons/themes for agents | ✓ Phase 1 stub |
| Compatibility-aware extension versions + lockfile | Reproducible agent/CI runs | — Pending |
| AST patch YAML save in serve | Preserve agent comments and metadata | — Pending |
| Canvas: position + labels only (v1) | Agents own structure; humans polish layout | — Pending |
| Tiered v1 diagram types | Ship ELK-friendly types with excellence; defer sequence/state/ER | ✓ Phase 1 schema |
| Apache 2.0 license | Permissive OSS with patent grant | ✓ Phase 1 |
| `version: 1` field (not `specVersion`) | Explicit schema contract for agents | ✓ Phase 1 |
| Bun workspaces | Fast local dev; user preference over pnpm | ✓ Phase 1 |

## Evolution

After each milestone:

1. Move shipped requirements from Active → Validated
2. Revisit Out of Scope — deferrals may become Active in v1.x
3. Log new decisions in Key Decisions with outcomes
4. Update "What This Is" if the product has drifted

---
*Last updated: 2026-05-21 after Phase 1 completion*
