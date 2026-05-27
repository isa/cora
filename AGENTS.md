# Cora — Agent Contract

Cora validates and renders YAML architecture diagrams for AI coding agents.

## Quick start

```bash
bun install
bun run build
```

Run the CLI from the repo:

```bash
bun run cora validate diagram.yaml --format json
bun run cora render diagram.yaml -o diagram.svg
bun run cora render diagram.yaml -o diagram.png
bun run cora render diagram.yaml -o diagram.pdf
bun run cora render diagram.yaml -o diagram.txt
bun run cora render diagram.yaml
bun run cora render diagram.yaml --charset ascii
bun run cora preview
bun run cora preview --no-open
bun run cora schema
```

After `bun link` in `packages/cora`, you can use `cora` directly.

## Preview workbench

`cora preview` starts a local component workbench for built-in renderer
components. It does not require a diagram YAML file. Use `cora preview --no-open`
or `bun run cora preview --no-open` in tests and automation to avoid launching a
browser.

Preview selection means nodes only, with at most a primary node and secondary
node selected at once. Lines/connections and groups are context for inspecting
relationships and grouped layouts; they are not selected components. Dragging is
preview-local and does not persist YAML, layout, or source-file changes.

## Recommended agent loop

1. Write or edit a diagram YAML file (`version: 1` required).
2. Run `cora validate path.yaml --format json`.
3. Fix errors using `code` and `path` from the JSON array.
4. Run `cora render path.yaml -o out.svg` (or `-o out.png`, `-o out.pdf`, `-o out.txt`) to produce an artifact.
5. If no output flag is given, `cora render path.yaml` prints the text diagram to stdout; use `--charset ascii` for plain ASCII logs.
6. When adding fields, run `cora schema` (or `cora schema --out cora-schema.json`) — do not invent fields outside the schema.

## JSON error shape

`cora validate --format json` and `cora render --format json` (on validation/layout failure) print a **JSON array** on stdout:

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
| `MISSING_EDGE_TARGET` | Edge `from` or `to` references a node id that does not exist |
| `UNKNOWN_SERVICE` | Node has `service` without `provider`, malformed `icon`, or an unknown icon/service name |
| `MISSING_EXTENSION` | Node references an icon provider/set that is not installed |
| `PARSE_ERROR` | YAML/JSON syntax error |
| `LAYOUT_ERROR` | Layout mode failed (e.g. `layout: preserve` without positions) |
| `CHROMIUM_NOT_INSTALLED` | `--quality=high` requested but Chromium not installed and no install consent given |
| `RESVG_FONT_WARNING` | Default PDF lane (resvg) emitted font warnings in CI mode (diagram uses a non-bundled font) |

## TTY behavior

- Interactive terminal + default `--format text` → human-readable, colored validation/error lines.
- `--format json` **or** non-TTY stdout (piped/CI) on validation/error paths → JSON array only, no extra prose.
- Successful `cora render diagram.yaml` without `-o` prints the text diagram to stdout even when piped.

Use `--format json` in CI for reliable parsing.

## Renderer (Text)

`cora render` writes text output when `-o` ends in `.txt`. If no `-o` is provided, it prints the text diagram to stdout.

```bash
cora render diagram.yaml
cora render diagram.yaml -o diagram.txt
cora render diagram.yaml --charset ascii
```

Text output is a simplified graph-like terminal representation derived from the existing layouted IR. It preserves labels and directional relationships for terminals, Markdown, pull requests, and agent logs; it is not SVG/PDF visual parity and does not carry all styling.

## CI flags

- `--yes` — non-interactive mode for install prompts (currently: Chromium for `--quality=high`).
- `CORA_AUTO_INSTALL=1` — equivalent to `--yes` (read at startup).

## Renderer (PDF)

`cora render` writes a PDF when `-o` ends in `.pdf`. Two lanes:

**Default lane (zero browser deps)** — bundled resvg + pdf-lib + embedded Noto Sans. Selectable text. Ships in `npm install cora` with no postinstall download.

```bash
cora render diagram.yaml -o out.pdf
cora render diagram.yaml -o out.pdf --page=a4
cora render diagram.yaml -o out.pdf --page=letter-portrait
```

`--page=<size>` overrides the default fit-to-content page (diagram bbox + 24pt margin) with a fixed page that scales-to-fit on a single page. Valid values: `a4`, `letter`, `a4-portrait`, `letter-portrait`.

**High-quality lane** — Chromium via Playwright. First invocation downloads Chromium (~170MB) to `~/.config/cora/browsers/` (Linux/macOS) or `%LOCALAPPDATA%/cora/browsers/` (Windows). Cached after first install.

```bash
# Interactive: prompts once for consent, then installs and renders.
cora render diagram.yaml -o out.pdf --quality=high

# CI / non-interactive: explicit consent required, no silent fallback.
cora render diagram.yaml -o out.pdf --quality=high --yes
CORA_AUTO_INSTALL=1 cora render diagram.yaml -o out.pdf --quality=high
```

If Chromium is unavailable and no consent is given in a non-interactive context, the command fails with a structured `CHROMIUM_NOT_INSTALLED` error (no silent fallback to the default lane):

```json
[
  {
    "code": "CHROMIUM_NOT_INSTALLED",
    "path": "/quality",
    "message": "Chromium is required for --quality=high but is not installed. Pass --yes, set CORA_AUTO_INSTALL=1, or run interactively to accept the prompt.",
    "suggestion": "cora render … --quality=high --yes  (downloads Chromium to ~/.config/cora/browsers/)"
  }
]
```

The default lane can also surface a font-fallback warning when running with `CI=1`:

```json
[
  {
    "code": "RESVG_FONT_WARNING",
    "path": "/render/resvg",
    "message": "resvg font warnings: …"
  }
]
```

Fix: ensure diagram labels use the bundled Noto Sans family (the default theme already does — only custom themes that name a non-bundled font trigger this).

### CI integration

Default push pipeline — no Chromium download needed:

```yaml
- run: bun install
- run: bun run build
- run: bun x vitest run
  working-directory: packages/cora
- run: bash packages/cora/tests/smoke/clean-install.sh
```

To exercise `--quality=high` in a downstream CI workflow (note: ~170MB Chromium download on first run, then cached):

```yaml
- name: Render high-quality PDF
  run: cora render diagram.yaml -o out.pdf --quality=high --yes --format=json
  env:
    CORA_AUTO_INSTALL: '1'
```

Parse failures by reading the JSON array on stdout when exit code is non-zero; switch on the `code` field (`CHROMIUM_NOT_INSTALLED`, `RESVG_FONT_WARNING`, `LAYOUT_ERROR`, `SCHEMA_VIOLATION`, etc.).

## Spec contract

- **`version: 1`** required at document root.
- **One diagram per file** — single `diagram` object, no `diagrams` array.
- **Diagram kinds:** `box-arrows`, `flowchart`, `microservice`, `infra`, `database`.
- **YAML primary**; files ending in `.json` are parsed as JSON.
- **Layout modes:** `auto` (default), `preserve`, `hybrid`. Pinned nodes keep YAML `position` during auto/hybrid relayout.

## Getting the schema

```bash
cora schema
cora schema --out cora-schema.json
```

Schema id: `https://cora.dev/schema/v1/diagram.json`

Do not add fields that are not in the schema — validation will reject them.

## Renderer Components

Renderer component implementations live under `packages/cora/src/renderer/components/`.
Use `cora/renderer/components` for the supported v1 renderer contract:

```ts
import type {
  BoxStyleProps,
  MarkerType,
  SvgIconComponent,
} from 'cora/renderer/components';
import {
  AppNode,
  BoxNode,
  DocumentNode,
  Group,
  IconNode,
  LabelIconNode,
  LabelNode,
  Line,
  LineMarkerDefs,
  WebsiteNode,
} from 'cora/renderer/components';
```

YAML nodes use `component` as the catalog discriminator. Omit it for the default
`box`, or set one of: `box`, `label`, `icon`, `labelIcon`, `website`,
`document`, `app`.

Icon and label-icon nodes may set `icon` to an offline Iconify id such as
`material-symbols:database`. The legacy `provider: default` plus `service: database`
form remains supported as an alias for `material-symbols:database`.

Box-like renderer props use `BoxStyleProps`: `backgroundColor`, `radius`,
`borderStyle`, `borderColor`, `borderWidth`, `text`, `textColor`, and `size`.
`borderStyle` values are `none`, `solid`, `dashed`, or `dotted`. `size` accepts
explicit `{ width, height }` dimensions or `sm`, `md`, `lg`, `xl`, `xxl`.

Lines use explicit routed points and marker values `none`, `arrow`, `circle`,
and `filledCircle`. Keep component APIs behind `renderer/components/index.ts`;
do not re-export them from `packages/cora/src/index.ts`.

### Default Look

Cora defines a canonical locked default visual language for all built-in components to ensure a professional appearance when styling properties are omitted in YAML:

- **Palette**: A Tailwind-based neutral base using the `slate` scale for borders, default text, and layout backgrounds, without dynamic runtime Tailwind dependencies. Semantic hues map per component kind:
  - `slate-neutral`: Default box and label nodes
  - `violet`: Icon terminals (accent) and label-icons (violet-200 fill, violet-500 stroke)
  - `sky`: Document nodes
  - `emerald`: App nodes
  - `yellow`: Website nodes
- **Omission Defaults**: Box-like nodes default to white fills, a subtle `slate-300` 1px solid border, medium `8px` corner radius, and flat presentation (no default shadow filter). Edges default to 2px solid `slate-700` lines. Groups render as 1px dashed `slate-400` boundaries with no default fill.
- **Typography**: Uses Noto Sans with the following hierarchy:
  - Node titles: 12px SemiBold
  - Node subtitles: 10px Regular
  - Standalone labels: 11px SemiBold `slate-800`
  - Edge labels: 10px Regular `slate-600`
- **Single Source of Truth**: Handled centrally via `catalogDefaultProps()` in `packages/cora/src/renderer/themes/componentDefaults.ts`, shared exactly between both the pure SVG renderer and the preview controls.
- **When to Override**: Default look coordinates can be overridden directly using custom style/layout properties inside the diagram YAML document. Custom extension themes are deferred to Phase 5.

## Examples

| File | Purpose |
|------|---------|
| `examples/valid/minimal.yaml` | Smallest valid box-arrows diagram |
| `examples/valid/box-arrows.yaml` | Box-arrows with direction |
| `examples/valid/flowchart.yaml` | Flowchart with default process nodes |
| `examples/valid/microservice.yaml` | Microservice topology with groups |
| `examples/valid/infra.yaml` | Infra diagram with boundary group |
| `examples/valid/database.yaml` | Database kind with app and data nodes |
| `examples/invalid/missing-version.yaml` | Triggers `SCHEMA_VIOLATION` |
| `examples/invalid/missing-edge-target.yaml` | Triggers `MISSING_EDGE_TARGET` |
| `examples/invalid/unknown-service.yaml` | Triggers `MISSING_EXTENSION` |
| `examples/invalid/service-without-provider.yaml` | Triggers `UNKNOWN_SERVICE` |

## Deferred commands

`cora serve`, `cora ext`, and `cora doctor` are planned for later phases. Do not assume they exist yet.
