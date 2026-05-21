# Cora — Agent Contract (Phase 1)

Cora validates YAML architecture diagrams for AI coding agents. **Phase 1 provides `validate` and `schema` only** — no render, serve, ext, or doctor yet.

## Quick start

```bash
bun install
bun run build
```

Run the CLI from the repo:

```bash
bun run cora validate diagram.yaml --format json
bun run cora schema
```

After `bun link` in `packages/cora`, you can use `cora` directly.

## Recommended agent loop

1. Write or edit a diagram YAML file (`version: 1` required).
2. Run `cora validate path.yaml --format json`.
3. Fix errors using `code` and `path` from the JSON array.
4. When adding fields, run `cora schema` (or `cora schema --out cora-schema.json`) — do not invent fields outside the schema.

## JSON error shape

`cora validate --format json` prints a **JSON array** on stdout (empty array `[]` when valid):

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
| `UNKNOWN_SERVICE` | Node has `service` without `provider`, or service unknown for provider |
| `MISSING_EXTENSION` | Node sets `provider` but that extension is not installed |
| `PARSE_ERROR` | YAML/JSON syntax error |

## TTY behavior

- Interactive terminal + default `--format text` → human-readable, colored lines.
- `--format json` **or** non-TTY stdout (piped/CI) → JSON array only, no extra prose.

Use `--format json` in CI for reliable parsing.

## CI flags

- `--yes` — non-interactive mode for future install prompts.
- `CORA_AUTO_INSTALL=1` — equivalent to `--yes` (read at startup).

## Spec contract

- **`version: 1`** required at document root.
- **One diagram per file** — single `diagram` object, no `diagrams` array.
- **Diagram kinds:** `box-arrows`, `flowchart`, `microservice`, `infra`, `database`.
- **YAML primary**; files ending in `.json` are parsed as JSON.

## Getting the schema

```bash
cora schema
cora schema --out cora-schema.json
```

Schema id: `https://cora.dev/schema/v1/diagram.json`

Do not add fields that are not in the schema — validation will reject them.

## Examples

| File | Purpose |
|------|---------|
| `examples/valid/minimal.yaml` | Smallest valid box-arrows diagram |
| `examples/valid/box-arrows.yaml` | Box-arrows with direction |
| `examples/valid/flowchart.yaml` | Flowchart with diamond decision node |
| `examples/valid/microservice.yaml` | Microservice topology with groups |
| `examples/valid/infra.yaml` | Infra diagram with boundary group |
| `examples/valid/database.yaml` | Database kind with cylinder node |
| `examples/invalid/missing-version.yaml` | Triggers `SCHEMA_VIOLATION` |
| `examples/invalid/missing-edge-target.yaml` | Triggers `MISSING_EDGE_TARGET` |
| `examples/invalid/unknown-service.yaml` | Triggers `MISSING_EXTENSION` |
| `examples/invalid/service-without-provider.yaml` | Triggers `UNKNOWN_SERVICE` |

## Deferred commands (not in Phase 1)

`cora render`, `cora serve`, `cora ext`, and `cora doctor` are planned for later phases. Do not assume they exist yet.
