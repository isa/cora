# Feature Landscape

**Domain:** Diagram-as-code / architecture diagram tooling (agent-first)
**Researched:** 2026-05-21
**Scope alignment:** Cora v1 as defined in PROJECT.md

---

## Table Stakes

Features users expect from any diagram-as-code tool. Absent → product feels incomplete or unprofessional.

| Feature | Why Expected | Complexity | In v1 Scope? |
|---------|--------------|------------|--------------|
| Text/YAML-based spec | Core DX promise; version-controllable | Low | Yes — YAML primary, JSON supported |
| CLI interface | Scriptable, CI-friendly, agent-callable | Low | Yes — `cora validate`, `render`, `serve`, `schema`, `ext`, `doctor` |
| Spec validation with clear errors | Agents and humans need feedback loops | Medium | Yes — JSON Schema, structured errors with codes |
| SVG export | Universal, lossless, diff-friendly artifact | Low | Yes — `renderToStaticMarkup` |
| PDF export | Required for docs, design reviews, sharing | Medium | Yes — resvg default; Playwright `--quality=high` |
| Auto-layout | Without it users hand-position every node | High | Yes — ELK |
| Multiple diagram kinds | Box-arrows, flowchart, infra, microservices are the bread-and-butter | Medium | Yes — box-arrows, flowcharts, microservice topology, cloud/infra, basic database |
| Node grouping / containers | Required for microservice and infra diagrams | Medium | Yes — `groups:` |
| Edge labels | Without them diagrams lose semantic meaning | Low | Yes |
| Themes / visual polish | Raw output must look professional, not like a homework diagram | Medium | Yes — built-in `default` theme |
| Live preview (`serve` mode) | Edit-and-see loop is table stakes for any diagram tool | Medium | Yes — `cora serve` with file watch |
| File watching / hot reload | Saves repeated manual re-renders | Low | Yes — built-in to `cora serve` |

---

## Differentiators

Features that set an agent-first diagram tool apart from Mermaid, D2, PlantUML, and draw.io. Not universally expected, but high value for the target users.

| Feature | Value Proposition | Complexity | In v1 Scope? |
|---------|-------------------|------------|--------------|
| JSON Schema as single source of truth | Agents call `cora schema` to get the exact contract; no hallucination of unknown fields | Medium | Yes — `cora schema` exports the schema |
| Structured validation errors with semantic codes | `UNKNOWN_SERVICE`, `MISSING_EDGE_TARGET` — parseable by agents, not just human-readable text | Medium | Yes — `cora validate --format json` |
| `AGENTS.md` + example gallery | Agents copy-paste canonical YAML; lowers error rate dramatically vs. free-form syntax | Low | Yes |
| AST-preserving YAML round-trip | Canvas edits patch back to YAML without destroying agent-authored comments, key order, or unknown fields | High | Yes — AST patch via `yaml-ast-parser` or equivalent |
| Hybrid layout: `auto` / `preserve` / `hybrid` | Agents use `auto`; humans pin individual nodes; CI is reproducible | Medium | Yes — `layout: auto | preserve | hybrid` with `pinned: true` per node |
| Unsaved-change guard on external edit | If agent re-generates YAML while human has canvas open, tool prompts instead of silently clobbering | Low | Yes — file watch guard in `serve` |
| Provider-specific icon/color themes via extensions | AWS Lambda looks like AWS Lambda, not a plain box | High | Yes — `cora-extensions` git registry |
| Compatibility-aware extension versioning + lockfile | CI reproduces exactly what dev rendered; no "worked on my machine" for diagrams | Medium | Yes — `cora.extensions.lock.json` |
| Hard fail on missing extensions | Agents get actionable install instructions; no silently wrong icons | Low | Yes — explicit policy |
| Bundled PDF renderer (resvg) | Zero extra install for the default path; no Puppeteer, no Chrome download | Medium | Yes — resvg bundled |
| CI non-interactive mode | `--yes` / `CORA_AUTO_INSTALL=1` for unattended pipelines | Low | Yes |
| Pure SVG output (no `foreignObject`) | Required for resvg PDF fidelity; also enables clean embedding in docs and design tools | Medium | Yes — design constraint |
| `cora doctor` | Self-diagnoses environment (Node version, extension cache, browser availability) | Low | Yes |

---

## Anti-Features

Features to explicitly NOT build in v1, with rationale. These are tempting but actively harmful.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Full structural canvas editor (add/remove nodes/edges in UI) | Agents own structure; a visual structural editor invites humans to diverge from YAML, breaking the agent contract | Canvas handles position + label only; structural changes stay in YAML |
| Silent fallback when extensions missing | Silently rendering with the wrong icon/color is worse than failing; agents can't detect it | Hard fail with `MISSING_EXTENSION` error and install command |
| Sequence diagrams at v1 quality cut | ELK doesn't handle sequence layout; shipping at mediocre quality hurts the brand | Defer explicitly; v1.x with a custom layout engine |
| State diagrams at v1 | Same issue as sequence — requires custom layout | Defer to v1.x |
| Advanced ER diagrams at v1 | Crow's foot notation requires precise edge routing ELK doesn't support | Defer to v1.x |
| MCP server in v1 | Premature; CLI is runtime-agnostic and works with all agents today | Ship CLI; MCP is a v1.x addon |
| Multiple diagram formats per file | Ambiguous render target; agents can't tell which diagram `cora render` will produce | One diagram per YAML file in v1 |
| `@cora/*` npm package sprawl | Complicates install, versioning, and user mental model | Single `cora` publish; extensions via git |
| Bundled cloud provider icons in core | AWS/Azure/GCP icons carry trademark restrictions; bundling creates legal exposure | Icons live in `cora-extensions` with explicit licensing per pack |
| npm-published community extensions | Uncontrolled quality, naming collisions, trademark risk | Contributions via PR to `cora-extensions` only; curated gate |
| Forgiving / silent-fallback parser | Mermaid/D2 try to render partial input — useful for humans, dangerous for agents (masks schema violations) | Validate strictly; fail loudly; provide fix suggestions |
| Real-time collaboration | Out of scope for v1; significant infra and UX complexity | Single-user canvas with file-based sync is sufficient |
| Export to draw.io / Figma / other formats | Competing formats fragment the ecosystem and require maintaining N export paths | Own SVG/PDF; let consumers import SVG |
| LaTeX / code snippet embedding in nodes | Academic feature; not needed for architecture diagrams | Plain text labels; Markdown in labels is a possible v1.x addition |
| `cora migrate` for schema version bumps | No schema v2 exists yet; premature | Deferred until `version: 2` is actually defined |
| Implicit agent interface (no AGENTS.md) | Agents without structured guidance hallucinate invalid YAML | Ship `AGENTS.md` and `cora schema` as first-class features |

---

## Feature Dependencies

```
JSON Schema (core)
  └→ cora validate --format json       (requires schema to exist)
  └→ cora schema                       (exports it)
  └→ AGENTS.md examples                (must align with schema)

ELK auto-layout
  └→ layout: auto / preserve / hybrid  (requires layout engine)
  └→ pinned: true per node             (requires hybrid layout pass)

React renderer (pure SVG)
  └→ cora render .svg                  (renderToStaticMarkup)
  └→ cora serve canvas                 (same render tree, interactive)
  └→ resvg PDF export                  (requires no foreignObject)
  └→ Playwright --quality=high PDF     (same SVG input, higher fidelity rasterization)

Extension system
  └→ cora ext install                  (requires registry protocol)
  └→ Provider icons/colors in themes   (requires extension loader)
  └→ cora.extensions.lock.json         (requires versioned extensions)
  └→ Compatibility-aware versioning    (requires cora version awareness)
  └→ Hard fail on missing ext          (requires extension resolution at validate time)

AST YAML parser
  └→ cora serve "save" action          (patches position/label back without mangling)
  └→ Unsaved-change guard              (detects external edits to watched file)

cora serve (live canvas)
  └→ File watch                        (detects external YAML changes)
  └→ Unsaved-change guard             (depends on file watch)
  └→ Drag/pin nodes                   (updates position fields via AST patch)
  └→ Inline label edits               (updates label fields via AST patch)
```

---

## MVP Recommendation

The v1 scope in PROJECT.md already reflects a well-calibrated MVP. Priority ordering within v1:

**Must land for any value:**
1. YAML spec + JSON Schema validation (agent contract exists)
2. `cora validate --format json` + semantic error codes (agent loop works)
3. ELK auto-layout + SVG export (produces artifact)
4. Built-in `default` theme at polished quality (first impression)

**Must land before human engineers adopt:**
5. `cora serve` with interactive canvas (position/label polish)
6. AST-preserving YAML save (humans can polish without breaking agent output)
7. PDF export via resvg (artifact is shareable without extra installs)

**Must land before CI/team workflows:**
8. Extension system + lockfile (reproducible provider icons)
9. `cora doctor` + CI flags (`--yes`, `CORA_AUTO_INSTALL=1`)
10. `AGENTS.md` + example gallery (agent onboarding)

**Defer without quality compromise:**
- Sequence, state, advanced ER diagrams → v1.x
- MCP server → v1.x
- Multi-diagram files → v1.x
- `cora migrate` → when schema v2 is defined

---

## Ecosystem Comparison Notes

| Tool | Agent-Friendly? | Pro Visual Output? | Extension Themes? | Interactive Canvas? | CI-First? |
|------|----------------|-------------------|-------------------|---------------------|-----------|
| **Mermaid** | Partial (validation is weak, errors cryptic) | No (GitHub-style only) | No | No (Mermaid Chart is separate SaaS) | Yes (CLI) |
| **D2** | Partial (friendly errors, no schema) | Good | Via themes config | No | Yes (CLI) |
| **PlantUML** | No (imperative syntax, Java runtime) | Decent | Via skinparam | No | Brittle (Java dep) |
| **Structurizr DSL** | Partial (models not validated as agents consume) | Good | AWS/Azure/GCP built-in | Manual layout editor | Yes |
| **Arc** | Yes (built for LLMs, `--format json`) | Basic | No | No | Yes |
| **Cora (target)** | Yes — JSON Schema contract + structured errors | Excellent (design bar) | via `cora-extensions` | Yes — position+label only | Yes — resvg bundled |

The gap Cora fills: **agent-grade structured spec + professional visual quality + curated provider themes + lightweight CI path**. No existing tool combines all four.

---

## Sources

- D2 documentation: https://d2lang.com/tour/themes, https://d2lang.com/tour/design/
- text-to-diagram.com feature comparison matrix: https://text-to-diagram.com/
- Structurizr features: https://docs.structurizr.com/features
- Arc (LLM-native diagram language): https://crates.io/crates/arc-lang
- Maid (Mermaid validator for agents): https://probeai.dev/maid
- ELK layout options and hierarchy: https://eclipse.dev/elk/reference/options.html
- Eraser draggable edits: https://docs.eraser.io/docs/draggable-edits-beta
- LikeC4 CLI serve command: https://likec4.dev/tooling/cli/
- Agent output format enforcement: https://dev.to/dowhatmatters/output-format-enforcement-for-agents-json-schema-or-it-didnt-happen-1pbi
- diagrams.so comparison: https://diagrams.so/learn/diagram-as-code-comparison

**Confidence:** HIGH for table stakes (well-established category patterns); HIGH for differentiators (directly derived from PROJECT.md decisions); MEDIUM for anti-feature rationale (partially from training knowledge + verified against ecosystem patterns above).
