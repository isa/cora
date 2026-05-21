# Roadmap: Cora

**Project:** Cora — open-source AI-agent diagram tool
**Created:** 2026-05-21
**Granularity:** Standard (6 phases)
**Mode:** Vertical MVP slices

---

## Overview

| # | Phase | Goal | Requirements |
|---|-------|------|--------------|
| 1 | Foundation | Agent contract + monorepo skeleton | SPEC-*, CLI-01–04, CLI-08, AGT-01, AGT-03 |
| 2 | Renderer + SVG | Professional diagrams from YAML | LAY-*, REN-*, CLI-05, EXP-01 |
| 3 | PDF Export | Shareable PDF artifacts | EXP-02–05 |
| 4 | Interactive Canvas | Human layout polish loop | CLI-06, SRV-* |
| 5 | Extension System | Provider themes & icons | EXT-* |
| 6 | Hardening | v1 release readiness | CLI-07, AGT-02 |

---

### Phase 1: Foundation — Agent Contract + Core Schema
**Goal:** Agents can validate YAML diagrams against a published JSON Schema before rendering exists.
**Mode:** mvp
**Requirements:** SPEC-01–06, CLI-01–04, CLI-08, AGT-01, AGT-03
**UI hint:** no

**Success Criteria:**
1. Monorepo scaffold builds with pnpm + Turborepo + tsdown (`packages/cora/` single publish target)
2. `cora validate diagram.yaml --format json` returns structured errors with stable codes on invalid input
3. `cora schema` exports JSON Schema matching the v1 YAML spec
4. `AGENTS.md` draft documents validate workflow and JSON error shape
5. All five v1 diagram kinds are expressible in the schema (even if not yet renderable)

**Research flag:** Standard patterns — skip research-phase

**Pitfalls to address:** Agent-hostile CLI output (TTY detection, JSON path established from day one)

---

### Phase 2: Core Renderer + SVG Export
**Goal:** `cora render -o diagram.svg` produces professional diagrams for all v1 kinds using the built-in default theme.
**Mode:** mvp
**Requirements:** LAY-01–04, REN-01–08, CLI-05, EXP-01
**UI hint:** no

**Success Criteria:**
1. ELK auto-layout positions nodes for box-arrows, flowchart, microservice, infra, and basic database diagrams
2. `layout: auto | preserve | hybrid` and `pinned: true` behave correctly
3. React renderer outputs pure SVG via `renderToStaticMarkup` with polished `default` theme
4. DOM-free text measurement produces accurate node dimensions in headless context
5. Golden-image regression suite exists for at least one diagram per kind

**Research flag:** **Needs research-phase** — DOM-free text measurement library selection (spike before implementation)

**Pitfalls to address:** Text measurement without DOM, ELK version pinning, pure-function renderer rule, viewBox padding, font strategy

---

### Phase 3: PDF Export
**Goal:** `cora render -o diagram.pdf` works out of the box; `--quality=high` optionally uses Playwright.
**Mode:** mvp
**Requirements:** EXP-02–05
**UI hint:** no

**Success Criteria:**
1. Default PDF path uses resvg + pdf-lib without browser dependencies
2. PDF output matches SVG content at 2× scale for print quality
3. `--quality=high` prompts once to download Chromium to `$HOME/.config/cora/browsers/`
4. `--yes` / `CORA_AUTO_INSTALL=1` enables non-interactive high-quality PDF in CI
5. CI fails on resvg font-family warnings

**Research flag:** Standard patterns — skip research-phase

**Pitfalls to address:** resvg top-level `<text>` requirement, font loading

---

### Phase 4: Interactive Canvas (`cora serve`)
**Goal:** Humans can drag/pin nodes, edit labels, and save back to YAML without destroying agent-authored content.
**Mode:** mvp
**Requirements:** CLI-06, SRV-01–07
**UI hint:** yes

**Success Criteria:**
1. `cora serve diagram.yaml` opens browser canvas with pre-built bundled assets
2. Drag/pin and inline label edits persist via YAML AST patch (comments preserved)
3. External file changes trigger hot-reload with unsaved-change guard (content-hash based)
4. `cora render` does not modify YAML and does not trigger unsaved guard
5. Round-trip test: comment-rich YAML survives position save unchanged except patched fields

**Research flag:** Light research recommended — YAML AST comment transplanting spike before implementation

**Pitfalls to address:** YAML AST formatting loss, file-watch race condition, ELK performance (worker + cache)

---

### Phase 5: Extension System
**Goal:** Provider themes and icons install from `cora-extensions` with reproducible CI rendering.
**Mode:** mvp
**Requirements:** EXT-01–08
**UI hint:** no

**Success Criteria:**
1. `cora ext install aws-theme` fetches tagged release and caches to `$HOME/.config/cora/extensions/`
2. `cora.extensions.lock.json` pins versions; project lock overrides global config
3. Diagram referencing missing extension hard-fails with install command in error
4. `provider: aws` + `service: lambda` resolves icon and styling when extension installed
5. `cora-extensions` repo structure documented with PR contribution guide

**Research flag:** Standard patterns — Gemini CLI git-extension model as reference

**Pitfalls to address:** Extension version drift (`coraSchemaVersion` validation at load time)

---

### Phase 6: Hardening + Agent Polish
**Goal:** v1 release-ready with complete agent docs, examples, and environment diagnostics.
**Mode:** mvp
**Requirements:** CLI-07, AGT-02
**UI hint:** no

**Success Criteria:**
1. `cora doctor` reports Node version, extension cache health, and browser availability
2. `AGENTS.md` documents all error codes, JSON schemas, and CI integration patterns
3. Canonical example diagram exists for each v1 kind in `examples/`
4. README covers install, validate, render, serve, and extension workflows
5. Apache 2.0 LICENSE present; npm package publishes as `cora`

**Research flag:** Standard patterns — skip research-phase

**Pitfalls to address:** Final validation of agent JSON output paths

---

## Phase Ordering Rationale

1. **Schema before renderer** — agents consume `cora validate` immediately
2. **Renderer before PDF** — resvg requires specific SVG structure enforced in Phase 2
3. **Renderer before canvas** — same React tree; pure-function rule established first
4. **Canvas before extensions** — core pipeline stable before adding theme variables
5. **Extensions before hardening** — `cora doctor` and docs reference extension errors

## v1.x Backlog (Post-Roadmap)

- Sequence diagrams (custom layout engine)
- State diagrams (custom layout engine)
- Advanced ER diagrams
- MCP server
- Multi-diagram project config
- `cora migrate` for schema v2

---
*Roadmap created: 2026-05-21*
