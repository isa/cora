# Walking Skeleton — Cora

**Phase:** 1 — Foundation
**Generated:** 2026-05-21

## Capability Proven End-to-End

An AI agent can install the `cora` npm package, run `cora schema` to obtain the v1 JSON Schema contract, and run `cora validate diagram.yaml --format json` to receive structured, code-addressable validation errors before any renderer exists.

## Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Publish surface | Single `cora` npm package at `packages/cora/` | PROJECT.md: no `@cora/*` sprawl; one install for agents |
| Module boundaries | `core` → `renderer` → `web` → `cli` (hard dependency direction) | ARCHITECTURE.md: cli imports core only in Phase 1; renderer/web are stubs |
| Runtime | Node.js 22+ (engines), TypeScript 5 strict | STACK.md + PROJECT.md |
| Monorepo | pnpm 9 workspaces + Turborepo 2 | Fast CI, single publish target |
| Library build | tsdown (ESM + `.d.ts`) for core + cli | STACK.md: tsup successor; zero-config |
| Web build (later) | Vite 6 — stub only in Phase 1 | Phase 4 concern; `web/` placeholder export |
| Spec contract | JSON Schema 2020-12 as source of truth | Agents consume `cora schema`; AJV 8 validates |
| Parse | `yaml` (eemeli) primary; `.json` extension → JSON.parse | SPEC-03; AST patch deferred to Phase 4 |
| Validation engine | `ajv` + `ajv-formats` | Structured `instancePath` → agent JSON errors |
| CLI framework | commander 12 | STACK.md: right complexity for 5–6 commands |
| Agent output | TTY → human text; non-TTY or `--format json` → JSON on stdout | ROADMAP pitfall: agent-hostile CLI avoided from day one |
| Config root | `$HOME/.config/cora/` | PROJECT.md; used in Phase 5+ |
| License | Apache 2.0 | PROJECT.md |
| Error model | `StructuredError { code, path, message, suggestion? }` | AGT-03 minimum codes in validator |

## Directory Layout (Phase 1)

```
cora/                          # repo root
  package.json                 # turbo scripts, engines
  pnpm-workspace.yaml
  turbo.json
  tsconfig.base.json
  LICENSE
  AGENTS.md                    # agent contract (draft in plan 04)
  packages/cora/
    package.json               # name: cora, bin: dist/cli.js
    tsdown.config.ts
    src/
      core/
        index.ts
        types.ts
        parser.ts
        validator.ts
        schema.ts
        schema/diagram.schema.json
      renderer/index.ts        # stub re-export (Phase 2)
      web/index.ts               # stub (Phase 4)
      cli/
        index.ts
        output.ts                # isTTY, formatters
        commands/validate.ts
        commands/schema.ts
    dist/                        # build output (not committed)
  examples/                      # minimal valid/invalid fixtures
```

## Build Order (Phase 1)

| Step | Target | Tool | Output |
|------|--------|------|--------|
| 1 | `core/` | tsdown | `dist/core/` |
| 2 | `cli/` (bundles core) | tsdown | `dist/cli.js` + shebang |
| 3 | package entry | tsdown | `dist/index.js` re-exports core public API |

Turborepo pipeline: `build` depends on `^build`; root `pnpm build` produces installable `cora` binary.

## Stack Touched in Phase 1

- [x] Project scaffold (pnpm, turbo, tsdown, TypeScript strict)
- [x] Core parse + validate pipeline (no ELK, no React render)
- [x] CLI — `validate`, `schema` (render/serve/ext/doctor stubbed or absent)
- [ ] Database — N/A (file-based diagrams only)
- [ ] UI — N/A (renderer/web stubs only)
- [ ] Deployment — local `pnpm build && node packages/cora/dist/cli.js` (npm publish in Phase 6)

## Out of Scope (Deferred to Later Phases)

- ELK layout (`layout.ts`, elkjs, web-worker)
- React renderer, pure SVG, `renderToStaticMarkup`
- `cora render`, `cora serve`, `cora ext`, `cora doctor` implementation
- Extension install/cache (`extensionLoader` full implementation)
- YAML AST patch save (`yamlAstPatch.ts`)
- PDF/SVG export (resvg, pdf-lib, playwright)
- MCP server, sequence/state/ER diagrams
- Multi-diagram files, `cora migrate`

## Subsequent Slice Plan

Each later phase adds one vertical capability on this skeleton without renegotiating module boundaries or publish surface:

- **Phase 2:** `cora render` — ELK layout + React pure SVG + default theme
- **Phase 3:** PDF export (resvg default, Playwright high)
- **Phase 4:** `cora serve` — canvas + YAML AST patch + file watch
- **Phase 5:** Extension system + lockfiles
- **Phase 6:** `cora doctor`, full AGENTS.md + examples gallery, release polish
