# Cora — Claude Code Instructions

## Project

Cora is an open-source diagram tool for AI coding agents. YAML in → professional SVG/PDF out.

**Planning docs:** `.planning/`
- `PROJECT.md` — context, constraints, decisions
- `REQUIREMENTS.md` — v1 requirements with REQ-IDs
- `ROADMAP.md` — 6-phase execution plan
- `STATE.md` — current position (read first each session)

## GSD Workflow

1. Read `.planning/STATE.md` before starting work
2. Use `/gsd:discuss-phase N` before planning a phase
3. Use `/gsd:plan-phase N` to create executable plans
4. Use `/gsd:execute-phase N` to implement
5. Update STATE.md after significant progress

**Current focus:** Phase 1 — Foundation (agent contract + JSON Schema)

## Architecture (summary)

Single `cora` npm package with internal modules: `core` → `renderer` → `web` → `cli`.

- **core:** parse, validate (AJV), ELK layout, theme resolution
- **renderer:** React → pure SVG (no foreignObject)
- **web:** interactive canvas (`cora serve`)
- **cli:** validate, render, serve, schema, ext, doctor

## Key Constraints

- Pure SVG only — required for resvg PDF
- YAML AST patch save — preserve comments on canvas save
- One diagram per file; `version: 1` required
- Extensions via separate `cora-extensions` repo (PR-curated)
- Config path: `$HOME/.config/cora/`
- Apache 2.0 license

## Stack

Node.js 22+, TypeScript 5, pnpm 9, Turborepo 2, tsdown, yaml (eemeli), ajv 8, elkjs, React 19, @resvg/resvg-js, commander 12, Vite 6 (web build only)

## Do Not (v1)

- Add MCP server, sequence/state/ER diagrams, or structural canvas editing
- Use foreignObject in SVG
- Bundle cloud provider icons in core
- Silent-fallback when extensions missing
