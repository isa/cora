# Cora

Open-source diagram tool for AI coding agents and the humans who review their output. Agents author architectural diagrams as YAML; the CLI validates and renders professional SVG, PNG, PDF, or text artifacts.

> **AI agents: read [AGENTS.md](./AGENTS.md) first** — validate loop, JSON error shape, schema contract, and error codes.

## Status

| Phase | State | Delivered |
|-------|--------|-----------|
| 1 — Foundation | Complete | `cora validate`, `cora schema`, v1 JSON Schema, structured errors |
| 2 — Renderer + SVG | Complete | `cora render` → `.svg` / `.png`, ELK layout, pure SVG renderer, default theme |
| 3 — PDF Export | Complete | `cora render -o diagram.pdf` |
| 3.3 — Component Preview Canvas | Complete | `cora preview` local component workbench |
| 3.4 — Text Export + SKILL.md | Complete | `cora render` stdout text, `.txt`, `--charset ascii`, agent skill guide |
| 3.5 — Preview Visual Beauty | Complete | Polished preview workbench UI and interaction pass |
| 3.6 — Default Component Look Lockdown | Complete | Shared renderer/preview component defaults and look tokens |
| 3.7+ | Planned | Component/icon package surface, grid expansion, `cora serve`, extensions (`cora ext`), `cora doctor` |

**Today:** validate any diagram, export schema, render all five v1 diagram kinds to SVG, PNG, PDF, or simplified graph-like text, and run `cora preview` as a local workbench for built-in renderer components. Built-in component defaults are shared by the renderer and preview controls. Icon nodes support bundled offline Iconify Material Symbols.

## Install

**Requirements:** Node.js **22+** or **Bun 1.x** (recommended for development).

From source:

```bash
git clone https://github.com/isa/cora.git
cd cora
bun install
bun run build
```

When published:

```bash
npm install -g cora
```

Link the CLI locally after building:

```bash
cd packages/cora && bun link
cora --version
```

From the repo without linking:

```bash
bun run cora -- <command> ...
```

## Quick start

```bash
# Validate (human-readable in a TTY)
bun run cora validate examples/valid/box-arrows.yaml

# Validate for CI / agents (JSON array on stdout)
bun run cora validate examples/valid/box-arrows.yaml --format json

# Render SVG
bun run cora render examples/valid/box-arrows.yaml -o /tmp/diagram.svg

# Render PNG (default 2× scale)
bun run cora render examples/valid/box-arrows.yaml -o /tmp/diagram.png

# Render text to stdout or a .txt file
bun run cora render examples/valid/box-arrows.yaml
bun run cora render examples/valid/box-arrows.yaml -o /tmp/diagram.txt

# Export JSON Schema
bun run cora schema --out cora-schema.json

# Open the local component preview workbench
bun run cora preview --no-open
```

## Commands

### Global

| Flag / env | Purpose |
|------------|---------|
| `--version` | Print package version |
| `--yes` | Non-interactive mode for future install prompts |
| `CORA_AUTO_INSTALL=1` | Same as `--yes` (read at startup) |

### `cora validate [file]`

Validate a diagram YAML or JSON file against the v1 JSON Schema and semantic rules (edge targets, extensions, etc.).

| Option | Default | Description |
|--------|---------|-------------|
| `--format text\|json` | `text` | Output format for errors |

**Exit codes:** `0` when valid; `1` when invalid or parse error.

**Success output:**

- TTY + `--format text` → no output (silent success)
- `--format json` or non-TTY stdout → `[]` plus newline

```bash
# Human-readable errors (colored in a TTY)
cora validate examples/invalid/missing-version.yaml

# Machine-readable errors for agents and CI
cora validate examples/invalid/missing-edge-target.yaml --format json

# Piped stdout is treated as JSON even without --format json
cora validate diagram.yaml | jq .
```

### `cora render [file]`

Parse, validate, layout, and render to **SVG**, **PNG**, **PDF**, or simplified graph-like terminal text. Output format is determined by the `-o` extension (`.svg`, `.png`, `.pdf`, or `.txt`). Omit `-o` to print text output to stdout.

| Option | Default | Description |
|--------|---------|-------------|
| `-o, --output <path>` | — | Output file (`.svg`, `.png`, `.pdf`, or `.txt`); omit for stdout text |
| `--format text\|json` | `text` | Error output format on validation/layout/parse failure |
| `--charset unicode\|ascii` | `unicode` | Text output charset for `.txt` or stdout text |
| `--size sm\|md\|lg\|xl\|xxl` | `md` | PNG raster scale (ignored for SVG) |
| `--without-shadow` | off | Flat nodes without drop shadows |
| `--monochrome` | off | Black, grey, and white only |
| `--page a4\|letter\|a4-portrait\|letter-portrait` | fit-to-content | PDF page size |
| `--quality high` | bundled PDF lane | Use Playwright/Chromium for high-quality PDF output |
| `--ascii-engine layout\|svg` | `layout` | Text rendering engine |

**PNG scale factors:**

| `--size` | Scale |
|----------|-------|
| `sm` | 1× |
| `md` | 2× (default) |
| `lg` | 3× |
| `xl` | 4× |
| `xxl` | 6× |

```bash
# SVG (vector, locked default component look)
cora render examples/valid/flowchart.yaml -o out.svg

# PNG at default resolution (2×)
cora render examples/valid/microservice.yaml -o out.png

# High-resolution PNG for slides or print
cora render examples/valid/microservice.yaml -o out.png --size xxl

# Simplified terminal output for Markdown, pull requests, and agent logs
cora render diagram.yaml
cora render diagram.yaml -o diagram.txt
cora render diagram.yaml --charset ascii

# PDF, browser-free by default
cora render examples/valid/infra.yaml -o out.pdf
cora render examples/valid/infra.yaml -o out.pdf --page a4

# Optional Playwright/Chromium PDF lane
cora render examples/valid/infra.yaml -o out.pdf --quality high --yes

# Print-friendly / documentation variants
cora render examples/valid/infra.yaml -o out.svg --monochrome
cora render examples/valid/infra.yaml -o out.svg --without-shadow
cora render examples/valid/infra.yaml -o out.svg --monochrome --without-shadow

# JSON errors when render fails validation (same shape as validate)
cora render examples/invalid/missing-version.yaml -o out.svg --format json

# JSON diagram input works too
cora render diagram.json -o out.svg
```

Parent directories for `-o` are created automatically.

### `cora schema`

Print the v1 diagram JSON Schema (`https://cora.dev/schema/v1/diagram.json`).

| Option | Description |
|--------|-------------|
| `--out <path>` | Write schema to a file instead of stdout |

```bash
cora schema
cora schema --out cora-schema.json
```

### `cora preview`

Start a local browser workbench for built-in renderer components. The preview
does not take a YAML input file and does not persist YAML or layout changes.
Selected components are nodes only, with a maximum of one primary and one
secondary node; lines and groups are relationship context.

| Option | Default | Description |
|--------|---------|-------------|
| `--host <host>` | `127.0.0.1` | Host interface for the local server |
| `--port <port>` | `4173` | Preferred local port |
| `--no-open` | off | Do not open the default browser |

```bash
cora preview
cora preview --no-open
```

## Diagram format

Every file must have `version: 1` at the root and a single `diagram` object (one diagram per file).

```yaml
version: 1

diagram:
  kind: box-arrows          # required
  direction: LR             # LR or TB (optional)
  layout: auto              # auto | preserve | hybrid (default: auto)
  theme: default            # built-in theme (default)
  nodes:
    - id: client
      label: Client
      component: document   # optional; omit for the default box component
      position: { x: 100, y: 50 }   # required for layout: preserve on all nodes
      pinned: true          # keep position during auto/hybrid relayout
  edges:
    - from: client
      to: server
      label: request        # optional; rendered with gap in edge stroke
  groups:                   # optional; microservice/infra use contains: [...]
    - id: region
      label: Region
      contains: [client, server]
```

### Diagram kinds

| Kind | Typical use |
|------|-------------|
| `box-arrows` | Simple architecture / component diagrams |
| `flowchart` | Process flows |
| `microservice` | Service topology with domain groups |
| `infra` | Cloud / boundary diagrams |
| `database` | App ↔ datastore |

Run `cora schema` for the authoritative field list — do not add properties outside the schema.

### Layout modes

| Mode | Behavior |
|------|----------|
| `auto` (default) | ELK computes positions; YAML `position` ignored unless `pinned: true` |
| `preserve` | Use YAML `position` on every node; errors if any node lacks coordinates |
| `hybrid` | ELK lays out unpinned nodes; nodes with `pinned: true` and `position` stay fixed |

### Icons

Nodes may set `icon` to an Iconify id. Cora currently ships offline `material-symbols` and `basil` icon sets, so diagrams render deterministically without API calls:

```yaml
- id: archive
  label: Archive
  component: icon
  icon: material-symbols:database
```

The older `provider: default` + `service: database` form remains supported as an alias for `material-symbols:database`. Unknown icon sets fail with `MISSING_EXTENSION`; unknown icon names fail with `UNKNOWN_SERVICE`.

## Examples

| File | Purpose |
|------|---------|
| `examples/valid/minimal.yaml` | Small box-arrows diagram using box nodes |
| `examples/valid/box-arrows.yaml` | Box-arrows with box nodes and mixed markers |
| `examples/valid/components.yaml` | Preserve-layout box-node catalog with marker shapes |
| `examples/valid/flowchart.yaml` | Flowchart with box steps and retry markers |
| `examples/valid/icon-gallery.yaml` | Box-only graph retained as a compatibility fixture |
| `examples/valid/markers.yaml` | Box-arrows covering circle, filled-circle, diamond, square, and filled-square markers |
| `examples/valid/marker-cycle.yaml` | Flowchart loop with box nodes and marker endpoints |
| `examples/valid/microservice.yaml` | Large microservice topology with groups, box service nodes, and labeled cross-domain edges |
| `examples/valid/infra.yaml` | Infra diagram with box DNS/cloud/queue/data nodes and grouped regions |
| `examples/valid/database.yaml` | Database kind with cache, primary, replica, analytics, and dataset box nodes |
| `examples/invalid/malformed-icon.yaml` | `UNKNOWN_SERVICE` for malformed Iconify id |
| `examples/invalid/missing-version.yaml` | `SCHEMA_VIOLATION` |
| `examples/invalid/missing-edge-target.yaml` | `MISSING_EDGE_TARGET` |
| `examples/invalid/unknown-service.yaml` | `MISSING_EXTENSION` for missing icon provider |
| `examples/invalid/service-without-provider.yaml` | `UNKNOWN_SERVICE` |

## Validation errors

`cora validate --format json` and `cora render --format json` (on failure) print a **JSON array** on stdout:

```json
[
  {
    "code": "SCHEMA_VIOLATION",
    "path": "/diagram/nodes/0/id",
    "message": "must match pattern ...",
    "suggestion": "Add version: 1 at the document root"
  }
]
```

| Code | Meaning |
|------|---------|
| `SCHEMA_VIOLATION` | Document fails JSON Schema validation |
| `MISSING_EDGE_TARGET` | Edge `from` or `to` references a missing node id |
| `UNKNOWN_SERVICE` | `service` without `provider`, malformed icon id, or unknown icon/service name |
| `MISSING_EXTENSION` | Requested icon provider/set is not installed |
| `PARSE_ERROR` | YAML/JSON syntax error |
| `LAYOUT_ERROR` | Layout failed (e.g. `layout: preserve` without positions on all nodes) |
| `CHROMIUM_NOT_INSTALLED` | `--quality=high` requested without installed Chromium or install consent |
| `CHROMIUM_INSTALL_FAILED` | Chromium install failed after consent |
| `HIGH_QUALITY_RENDER_FAILED` | Playwright high-quality PDF rendering failed |
| `RESVG_FONT_WARNING` | Default PDF lane found a non-bundled font in CI mode |

**TTY behavior:** interactive terminal + default `--format text` → colored human-readable lines. `--format json` or non-TTY stdout → JSON only, no extra prose.

## CI

```bash
bun run build

# Fail the job on invalid diagrams
cora validate path/to/diagram.yaml --format json | jq -e 'length == 0'

# Produce artifacts
cora render path/to/diagram.yaml -o dist/diagram.svg
cora render path/to/diagram.yaml -o dist/diagram.png --size lg
cora render path/to/diagram.yaml -o dist/diagram.pdf
```

Use `--format json` (or pipe stdout) so parsers never depend on terminal colors or wording.

High-quality PDF rendering downloads Chromium lazily only after explicit consent. In CI, pass `--yes` or set `CORA_AUTO_INSTALL=1`; otherwise `--quality=high` fails with a structured `CHROMIUM_NOT_INSTALLED` error instead of silently falling back.

## Architecture

Single published **`cora`** npm package with internal modules:

```
YAML/JSON
  → core       parse, validate (AJV), ELK layout, theme resolution
  → renderer   React → pure SVG (no foreignObject); SVG, PNG, PDF, text
  → preview    Vite-backed local component workbench
  → cli        validate, render, schema, preview
```

**Stack:** Node.js 22+, Bun, TypeScript 5, Turborepo, ELK 0.11, React 19, Vite, `@resvg/resvg-js`, `pdf-lib`, Playwright for optional high-quality PDF, and bundled Noto Sans for consistent headless metrics and selectable PDF text.

**Planned:** interactive `cora serve`, `cora ext`, `cora doctor`, and custom extension themes.

## Development

```bash
bun install
bun run build
bun run typecheck
(cd packages/cora && bun x vitest run)

# Golden render regression (all five kinds)
(cd packages/cora && node tests/render-golden.mjs)
# or: (cd packages/cora && bun run test:golden)

# Clean install/package smoke
bash packages/cora/tests/smoke/clean-install.sh
```

Programmatic use (after build):

```ts
import { parseFile, validateDocument, computeLayout } from 'cora/core';
import { renderToSVG } from 'cora/renderer';
```

## License

Apache 2.0 — see [LICENSE](./LICENSE).

## Related

- [AGENTS.md](./AGENTS.md) — agent contract, recommended loop, error codes
- [PROJECT.md](./PROJECT.md) — requirements, scope, and decisions
- [.planning/ROADMAP.md](./.planning/ROADMAP.md) — phase plan and success criteria
