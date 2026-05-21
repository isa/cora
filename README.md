# Cora

  ░██████    ░██████   ░█████████     ░███    
 ░██   ░██  ░██   ░██  ░██     ░██   ░██░██   
░██        ░██     ░██ ░██     ░██  ░██  ░██  
░██        ░██     ░██ ░█████████  ░█████████ 
░██        ░██     ░██ ░██   ░██   ░██    ░██ 
 ░██   ░██  ░██   ░██  ░██    ░██  ░██    ░██ 
  ░██████    ░██████   ░██     ░██ ░██    ░██ 

Open-source diagram tool for AI coding agents and the humans who review their output. Agents author architectural diagrams as YAML; the CLI validates and renders professional SVG/PDF artifacts. Humans refine layout and labels interactively via `cora serve`, with changes patched back into the same YAML file.

## Why Cora

Existing diagram-as-code tools (Mermaid, D2, PlantUML) are not built for agents: loose syntax, weak validation, and output that rarely looks beautiful or professional — whether you are drawing system architecture, process flows, flowcharts, or infra topology. Cora gives agents a structured spec with validation, strong defaults, and optional provider-specific theme packs — without a heavyweight visual editor for structural changes.

**Core workflow:** write YAML → `cora validate` → `cora render` → commit SVG/PDF. Humans can polish layout and labels in the browser when needed.

## Status

Early development. Requirements and architecture are defined in [PROJECT.md](./PROJECT.md); implementation is in progress.

## Install

When published:

```bash
npm install -g cora
# or
bun add -g cora
```

For local development, clone the repo and use [Bun](https://bun.sh) (recommended) or Node 20+:

```bash
git clone https://github.com/isa/cora.git
cd cora
bun install
```

## CLI

| Command | Purpose |
|---------|---------|
| `cora validate` | Validate a diagram file against the JSON Schema |
| `cora render` | Export SVG or PDF |
| `cora serve` | Interactive canvas — drag/pin nodes, edit labels, save to YAML |
| `cora schema` | Export the spec schema for agents |
| `cora doctor` | Check install, extensions, and environment |
| `cora ext install <name>` | Install a theme/icon pack from [cora-extensions](https://github.com/isa/cora-extensions) |

### Examples

```bash
# Agent / CI path
cora validate architecture.yaml
cora validate architecture.yaml --format json
cora render architecture.yaml -o architecture.svg
cora render architecture.yaml -o architecture.pdf

# High-fidelity PDF (downloads Chromium on first use)
cora render architecture.yaml -o architecture.pdf --quality=high

# Human polish
cora serve architecture.yaml
```

Non-interactive CI:

```bash
cora ext install aws-theme --yes
# or
export CORA_AUTO_INSTALL=1
```

## Diagram spec

YAML is primary; JSON is supported (detected by file extension). One diagram per file in v1.

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
    - id: db
      label: Database
  edges:
    - from: api
      to: db
      label: read/write
  groups: []
```

- **`version: 1`** is required at the top level.
- **`layout`**: `auto` | `preserve` | `hybrid` (ELK auto-layout with optional pinned positions).
- **Theming**: built-in `default` theme; provider themes via extensions; optional per-node `style:` overrides.
- **Semantic styling**: `provider` + `service` resolve to icons and colors through the extension registry.

### v1 diagram kinds

Box-arrows, flowcharts, microservice topology, cloud/infra, and basic database diagrams. Sequence, state, and advanced ER diagrams are deferred to v1.x.

## Extensions

Provider-specific themes and icons live in a separate **[cora-extensions](https://github.com/isa/cora-extensions)** repository (curated via pull request, not npm). The core package ships a polished generic `default` theme; missing extensions fail with actionable install instructions rather than silent fallbacks.

```bash
cora ext install aws-theme
```

| Location | Purpose |
|----------|---------|
| `$HOME/.config/cora/extensions.json` | Global extension config |
| `cora.extensions.lock.json` | Project lockfile (commit for reproducible CI) |
| `$HOME/.config/cora/extensions/` | Cached extension files |

Extension versions are compatibility-aware with the installed `cora` version. Install from tagged releases only, not `main`.

## Export

| Output | Engine | Notes |
|--------|--------|-------|
| SVG | React renderer → pure SVG | Fast default for agents and CI |
| PDF | resvg (bundled) | Works after a normal install |
| PDF (high) | Playwright + Chromium | `--quality=high`; ~150 MB browser cache on first use |

High-quality PDF stores Chromium under `$HOME/.config/cora/browsers/`.

## Interactive canvas (`cora serve`)

- Drag and pin nodes and groups; inline label editing.
- Structural changes (add/remove nodes and edges) stay in YAML — agents own structure.
- Save uses **YAML AST patching** (preserves comments, field order, and unknown fields).
- Watches the source file; prompts if the canvas has unsaved edits when the file changes externally.

## For agents

- JSON Schema is the single source of truth for the spec shape.
- `cora validate --format json` returns structured errors with codes (`UNKNOWN_SERVICE`, `MISSING_EDGE_TARGET`, etc.).
- `cora schema` exports the schema for tooling.
- See `AGENTS.md` and the example gallery (when added) for copy-paste patterns.

## Architecture

```
YAML spec
  → core        validate, layout (ELK), resolve theme
  → renderer    React → pure SVG (no foreignObject)
  → outputs
      ├── cora serve       live React canvas
      ├── cora render      SVG via renderToStaticMarkup
      └── cora render      PDF via resvg (default) or Playwright (--quality=high)
```

Monorepo layout (single published `cora` npm package):

```
packages/cora/
  core/       parse, validate, ELK layout, theme resolution, extension loader
  renderer/   React → pure SVG
  web/        interactive canvas
  cli/        render, serve, validate, schema, ext, doctor
```

## Development

This is a Node.js project. [Bun](https://bun.sh) is the recommended runtime and package manager for local work.

```bash
bun install
bun run build      # when scripts exist
bun test           # when tests exist
bun run cora -- validate examples/infra.yaml
```

Requirements: Node 20+ or Bun 1.x. TypeScript throughout; React shared between headless SVG export and the serve canvas.

## Config paths

```
$HOME/.config/cora/
  config.json
  extensions.json
  extensions/
  browsers/          # Chromium, only after --quality=high
```

## License

Apache 2.0 for the core tool. Icon packs in `cora-extensions` carry their own licenses.

## Related

- [PROJECT.md](./PROJECT.md) — requirements, decisions, and scope
- [cora-extensions](https://github.com/isa/cora-extensions) — themes and provider icons (separate repo)
