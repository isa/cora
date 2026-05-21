# Cora

Open-source diagram tool for AI coding agents and the humans who review their output. Agents author architectural diagrams as YAML; the CLI validates and (in later phases) renders professional SVG/PDF artifacts.

> **AI agents: read [AGENTS.md](./AGENTS.md) first** — it documents the validate loop, JSON error shape, and schema contract.

## Status

**Phase 1 — Foundation:** `cora validate` and `cora schema` are implemented. Render, serve, and extensions are not available yet.

## Install

Requirements: **Node.js 22+** or **Bun 1.x** (recommended for local development).

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

## Commands (Phase 1)

| Command | Purpose |
|---------|---------|
| `cora validate [file]` | Validate a diagram against the JSON Schema |
| `cora validate [file] --format json` | Machine-readable error array (use in CI) |
| `cora schema` | Print the v1 JSON Schema to stdout |
| `cora schema --out schema.json` | Write schema to a file |

```bash
bun run cora validate examples/valid/box-arrows.yaml --format json
bun run cora schema
```

## Minimal diagram

```yaml
version: 1

diagram:
  kind: box-arrows
  nodes:
    - id: client
      label: Client
      shape: rounded
    - id: server
      label: Server
      shape: rectangle
  edges:
    - from: client
      to: server
```

See `examples/valid/` for all five v1 diagram kinds.

## Architecture

Single published `cora` npm package with internal modules: `core` → `renderer` → `web` → `cli`.

## Development

```bash
bun install
bun run build
bun run typecheck
```

## License

Apache 2.0 — see [LICENSE](./LICENSE).

## Related

- [AGENTS.md](./AGENTS.md) — agent contract and error codes
- [PROJECT.md](./PROJECT.md) — requirements and scope
