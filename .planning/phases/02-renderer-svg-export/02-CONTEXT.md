# Phase 2: Core Renderer + SVG Export - Context

**Gathered:** 2026-05-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver `cora render <file> -o diagram.svg` producing professional pure-SVG diagrams for all five v1 kinds (box-arrows, flowchart, microservice, infra, database) using the built-in `default` theme — no extensions required. Includes ELK auto-layout (`layout: auto | preserve | hybrid`, `pinned: true`), DOM-free text measurement, React renderer via `renderToStaticMarkup`, and a golden-image regression suite (≥1 diagram per kind).

Out of scope for this phase: PDF export, `cora serve`, extension themes/icons, provider/service rendering (Phase 1 already hard-fails missing extensions at validate time).

</domain>

<decisions>
## Implementation Decisions

### Default theme aesthetic
- **D-01:** Visual quality bar is **polished and professional** — not minimal sketch-style, not dense technical documentation. First impression matters for agent-authored diagrams without extensions.
- **D-02:** Color approach is **soft pastels per shape or role** — nodes, edges, and groups get gentle differentiated hues rather than neutral grays or high-contrast monochrome.
- **D-03:** Visual depth is **subtle** — light shadow or inset border acceptable; avoid flat-only and avoid heavy layered elevation.
- **D-04:** Spacing density is **balanced** — readable labels and comfortable whitespace without wasting canvas; not compact or presentation-airy extremes.

### Font strategy
- **D-05:** Primary font approach is **system font stack** — no bundled webfont in the default theme unless research proves system stack cannot meet D-06.
- **D-06:** Cross-platform output must be **pixel-identical SVG** across macOS, Linux, and Windows. Research/planning must reconcile D-05 and D-06; if system stack cannot satisfy exact parity, present the tradeoff before implementation (embedded font as fallback).
- **D-07:** Base label font size is **14px** for node and edge text.
- **D-08:** Typography hierarchy uses **regular + semibold** — semibold for node titles/labels, regular weight for edge labels and secondary text.

### Claude's Discretion
- **Per-kind layout personality** — unified visual language vs kind-specific spacing/direction defaults (not discussed; planner may propose defaults aligned with ELK kind profiles).
- **Golden-image regression strictness** — pixel-perfect diff threshold, baseline update policy (roadmap minimum: ≥1 golden SVG per kind; exact tooling left to planner).
- **Text measurement library** — Pretext.js vs alternatives (flagged for research phase per ROADMAP; user did not override research recommendation).
- **Specific pastel palette values** — exact hex tokens within the soft-pastel direction.
- **Shadow/border implementation details** — pure SVG filters vs stroke tricks, within the "subtle depth" constraint.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` — Phase 2 goal, success criteria, research flag (text measurement spike)
- `.planning/REQUIREMENTS.md` — LAY-01–04, REN-01–08, CLI-05, EXP-01
- `.planning/PROJECT.md` — Architecture (core → renderer → cli), pure SVG constraint, default theme requirement, ELK + pinned positions

### Research and pitfalls
- `.planning/research/STACK.md` — elkjs 0.11.1, React 19, renderToStaticMarkup, dependency install list
- `.planning/research/PITFALLS.md` — Pitfall 1 (text measurement), 4 (ELK pinning), 5 (canvas/headless divergence), 9 (viewBox padding), 10 (font embedding)
- `.planning/research/SUMMARY.md` — Phase 2 risk summary, renderer pipeline ordering rationale

### Agent contract and fixtures
- `AGENTS.md` — Validate workflow; Phase 2 adds `cora render` (not yet documented)
- `examples/valid/box-arrows.yaml` — Box-arrows fixture
- `examples/valid/flowchart.yaml` — Flowchart with diamond decision node
- `examples/valid/microservice.yaml` — Microservice topology fixture
- `examples/valid/infra.yaml` — Infra with groups/boundary
- `examples/valid/database.yaml` — Database kind with cylinder node
- `packages/cora/src/core/schema/diagram.schema.json` — v1 schema (shapes, kinds, layout enum)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/cora/src/core/parser.ts` — YAML/JSON parse pipeline; reuse for render input
- `packages/cora/src/core/validator.ts` + `errors.ts` — Validation before layout/render
- `packages/cora/src/core/types.ts` — `DiagramFile`, `DiagramNode`, `DiagramKind` types for DiagramIR contract
- `packages/cora/src/core/schema/diagram.schema.json` — Shape enum (rectangle, rounded, cylinder, cloud, diamond, hexagon, group), layout enum
- `examples/valid/*.yaml` — Six valid fixtures covering all five kinds (plus minimal)

### Established Patterns
- Phase 1 CLI: `--format json` TTY detection, structured error codes, global `--yes` / `CORA_AUTO_INSTALL` in `cli/index.ts`
- Monorepo stub modules: `packages/cora/src/renderer/index.ts` and `web/index.ts` are empty placeholders awaiting Phase 2/4
- No elkjs, react, or text-measurement deps in `package.json` yet — greenfield renderer install

### Integration Points
- New `cora render` command in `packages/cora/src/cli/` (alongside validate/schema)
- `core/` gains layout + theme resolution; `renderer/` gains React SVG components
- Public API surface via `packages/cora/src/index.ts` (currently exports core only)

</code_context>

<specifics>
## Specific Ideas

- Target feel: **polished professional** diagrams with **soft pastel** role/shape coloring and **subtle depth** — suitable for architecture docs and agent output without extension packs.
- Typography: **14px base**, **semibold node labels** + **regular edge labels**, **system fonts** preferred but **exact cross-platform SVG parity** is non-negotiable (resolve tension in research).

</specifics>

<deferred>
## Deferred Ideas

### Not discussed (available for future discuss or planner defaults)
- **Per-kind layout personality** — whether flowchart, infra, microservice kinds get distinct default directions/spacing vs one unified theme
- **Golden-image regression bar** — strictness and baseline approval workflow beyond roadmap minimum

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 2-Core Renderer + SVG Export*
*Context gathered: 2026-05-21*
