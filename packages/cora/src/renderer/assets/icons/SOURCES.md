# Default icon pack (Material)

The bundled **`default`** provider ships ~4k canonical **Material Symbols** filled icons
(Apache-2.0) under `../icon-packs/default/`. They are built automatically as the first step of
`bun run build` via `packages/cora/scripts/build-default-icon-pack.ts`.

## Source tree (optional, gitignored)

Place a local Material catalog at:

`packages/cora/src/renderer/assets/icons/material-design/`

The build script dedupes to one filled SVG per slug and writes:

- `icon-packs/default/manifest.json` — full catalog
- `icon-packs/default/manifest.agents.json` — slim agent index
- `icon-packs/default/icons/{slug}.svg`
- `icon-packs/catalog.json` — merged search index for preview/CLI

Category assignment uses `icon-category-rules.json` in this directory.

## YAML aliases

| Service slug | Canonical icon |
|--------------|----------------|
| `server` | `dns` |
| `network` | `lan` |
| `user` | `person` |
| `bug` | `bug-report` |

## Published package

npm tarballs include `dist/renderer/assets/icon-packs/default/` (not the raw `material-design/` tree).
