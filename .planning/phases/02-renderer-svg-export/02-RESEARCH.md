# Phase 2 Research: Core Renderer + SVG Export

**Researched:** 2026-05-21
**Confidence:** HIGH on stack choices; MEDIUM on exact ELK option tuning per kind

---

## User Constraints

Copied from `02-CONTEXT.md` — planner MUST honor these.

### Default theme aesthetic
- **D-01:** Visual quality bar is **polished and professional**
- **D-02:** Color approach is **soft pastels per shape or role**
- **D-03:** Visual depth is **subtle** — light shadow or inset border
- **D-04:** Spacing density is **balanced**

### Font strategy
- **D-05:** Primary font approach is **system font stack** — no bundled webfont unless research proves system stack cannot meet D-06
- **D-06:** Cross-platform output must be **pixel-identical SVG** across macOS, Linux, and Windows
- **D-07:** Base label font size is **14px**
- **D-08:** Typography hierarchy uses **regular + semibold**

### Claude's Discretion
- Per-kind layout personality, golden-image strictness, text measurement library (if not resolved here), exact pastel hex values, shadow implementation details

---

## Standard Stack

| Library | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| `elkjs` | `^0.11.1` (pin minor) | Graph layout (ELK_LAYERED primary) | HIGH [VERIFIED: npm registry] |
| `web-worker` | latest stable | ELK in worker thread (Node + future browser) | HIGH [CITED: ARCHITECTURE.md, elkjs README] |
| `react` + `react-dom` | `^19.0.0` | SVG component tree + `renderToStaticMarkup` | HIGH [VERIFIED: STACK.md] |
| `opentype.js` | `^1.3.5` | DOM-free text measurement from font bytes | HIGH [VERIFIED: npm registry, Node fs load] |
| `@fontsource/inter` files OR bundled `Inter-*.ttf` | static TTF | Single font for measure + render (D-06) | HIGH [CITED: PITFALLS.md Pitfall 10] |

### Font decision (D-05 vs D-06 resolution)

**Conclusion:** System font stack **cannot** satisfy D-06. OS default sans-serif metrics differ (SF Pro vs Segoe UI vs Liberation Sans). Measurement and SVG output would diverge across platforms and vs headless CI.

**Recommendation (prescriptive):**
1. Bundle **Inter** Regular (400) + SemiBold (600) TTF files in `packages/cora/src/renderer/assets/fonts/` (Inter is OFL, aligns with polished professional bar D-01).
2. Use `opentype.js` to load those TTF bytes in `core/measureText.ts` — same files used for all platforms.
3. In SVG output, set `font-family="'Inter', sans-serif"` on all `<text>` elements; optionally embed `@font-face` with base64 TTF in a `<defs>` block for standalone SVG portability (Phase 3 resvg benefits from explicit font paths).
4. Document in plan: satisfies D-06; D-05 overridden by research finding per CONTEXT.md escalation rule.

**Text measurement library:** Use **opentype.js**, not Pretext.js. Pretext targets canvas/DOM measurement [ASSUMED: pretextjs.dev positioning]; opentype.js runs headless in Node with `fs.readFile` + `font.getAdvanceWidth(text, size)` [VERIFIED: opentype.js npm readme]. No native deps; zero npm dependencies on opentype.js itself.

---

## Architecture Patterns

### Pipeline (strict order)

```
parse → validate → themeResolve → measureNodes → elkLayout → renderToSVG → write file
```

| Stage | Module | Input → Output |
|-------|--------|--------------|
| Parse/validate | `core/` | file → `DiagramFile` (existing) |
| Theme resolve | `core/themeResolver.ts` | `DiagramFile` → `ResolvedDiagram` (adds computed styles from default theme) |
| Measure | `core/measureText.ts` | labels + font tokens → `{ width, height }` per node |
| Layout | `core/layout.ts` | `ResolvedDiagram` + sizes → `LayoutedDiagram` |
| Render | `renderer/renderToSVG.ts` | `LayoutedDiagram` → SVG string |
| CLI | `cli/commands/render.ts` | orchestrates pipeline, writes `-o` path |

### Type contracts

Extend `core/types.ts`:

- `ResolvedDiagram` — nodes with `measuredWidth`, `measuredHeight`, resolved fill/stroke/font tokens
- `LayoutedDiagram` — adds `x`, `y` on nodes/groups; edge routing points from ELK
- Renderer imports **types only** from core (no runtime core import in renderer per ARCHITECTURE.md)

### ELK integration

- Algorithm: `layered` (`org.eclipse.elk.layered`) for all v1 kinds initially; kind-specific direction overrides only [Claude discretion — unified first]
- **Explicit options** (never rely on defaults) [CITED: PITFALLS.md Pitfall 4]:
  - `elk.algorithm`: `layered`
  - `elk.direction`: `DOWN` (flowchart, box-arrows, microservice); `RIGHT` optional for box-arrows only if kind profile added later
  - `elk.layered.nodePlacement.strategy`: `BRANDES_KOEPF`
  - `elk.layered.edgeRouting`: `ORTHOGONAL`
  - `elk.hierarchyHandling`: `INCLUDE_CHILDREN`
  - `elk.spacing.nodeNode`: `40` (balanced density D-04)
  - `elk.padding`: `[top, left, bottom, right]` on groups

### Layout modes (LAY-02, LAY-03)

| Mode | Behavior |
|------|----------|
| `auto` | ELK computes all positions; ignore YAML `position` unless `pinned: true` |
| `preserve` | Skip ELK; use YAML `position` only; error if missing positions |
| `hybrid` | Pinned nodes fixed via `elk.position` + `layoutOptions: 'org.eclipse.elk.fixed'`: true`; ELK lays out unpinned |

### Worker thread (LAY-04)

- `core/layoutWorker.ts` — instantiate `ELK` from `elkjs/lib/elk-api.js` with `workerUrl: new URL('elkjs/lib/elk-worker.min.js', import.meta.url)` pattern [CITED: elkjs README Node section]
- `web-worker` package wraps Node worker_threads for same API as browser Worker
- CLI `render` can await worker; serve (Phase 4) reuses same module

### Renderer rules (REN-01–03)

- Stateless function components only — no `useState`, `useEffect`, `useLayoutEffect`, no `window`/`document`
- Pure SVG: `<svg>`, `<g>`, `<rect>`, `<path>`, `<text>`, `<polygon>`, `<ellipse>` — **no `foreignObject`**
- Root `<svg xmlns="http://www.w3.org/2000/svg">` — React strips xmlns; inject post-`renderToStaticMarkup` [CITED: PITFALLS.md Pitfall 11]
- All `<text>` at diagram root level or direct children of root `<g>` — not nested in inner `<svg>` [CITED: PITFALLS Pitfall 3, Phase 3 prep]
- ViewBox padding: compute bbox of all elements + 24px margin [REN-07]

### Default theme tokens (`renderer/themes/default.ts`)

Per D-01–D-04, D-07–D-08:

```typescript
// Shape → soft pastel fills (examples — planner picks final hex)
rounded:  { fill: '#E8F4FD', stroke: '#7EB8DA' }
rectangle:{ fill: '#F0E6FF', stroke: '#B39DDB' }
diamond:  { fill: '#FFF3E0', stroke: '#FFB74D' }
cylinder: { fill: '#E8F5E9', stroke: '#81C784' }
cloud:    { fill: '#FCE4EC', stroke: '#F48FB1' }
hexagon:  { fill: '#E0F7FA', stroke: '#4DD0E1' }
group:    { fill: 'none', stroke: '#B0BEC5', strokeDasharray: '4 4' }
edge:     { stroke: '#78909C', strokeWidth: 1.5 }
nodeLabel:{ fontSize: 14, fontWeight: 600 }
edgeLabel:{ fontSize: 14, fontWeight: 400 }
shadow:   { filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.08))' } // subtle D-03
```

---

## Don't Hand-Roll

| Problem | Use instead |
|---------|-------------|
| Text width/height in headless Node | `opentype.js` + bundled Inter TTF |
| Graph layout | `elkjs` — not manual coordinates or d3-force |
| SVG string from React | `renderToStaticMarkup` — not template strings |
| Orthogonal edge routing | ELK edge sections — not manual path math |
| Font discovery in PDF (Phase 3) | Top-level `<text>` + explicit font-family (design now) |

---

## Common Pitfalls

1. **Zero-size nodes to ELK** — measure BEFORE layout; verify no node has w/h 0 in layout input [PITFALLS Pitfall 1]
2. **Canvas vs headless divergence** — ban hooks/DOM in renderer; same components for serve later [Pitfall 5]
3. **ELK version drift** — pin `elkjs@0.11.1`; golden SVG suite catches routing regressions [Pitfall 4]
4. **Missing xmlns** — post-process SVG string [Pitfall 11]
5. **Clipped diagram** — viewBox padding [Pitfall 9]
6. **System fonts for measurement** — rejected; use bundled Inter [Pitfall 10]

---

## Code Examples

### opentype.js measure (Node)

```typescript
import opentype from 'opentype.js';
import { readFileSync } from 'node:fs';

const font = opentype.parse(readFileSync(interSemiBoldPath));
const width = font.getAdvanceWidth(label, 14);
// Height: ascender/descender from font.tables.os2 or use lineHeight = 14 * 1.4
```

### ELK hybrid pinned node

```typescript
{
  id: node.id,
  width: measured.width,
  height: measured.height,
  x: node.position?.x,
  y: node.position?.y,
  layoutOptions: node.pinned ? { 'org.eclipse.elk.fixed': 'true' } : {},
}
```

### renderToStaticMarkup + xmlns

```typescript
import { renderToStaticMarkup } from 'react-dom/server';
let svg = renderToStaticMarkup(<Diagram diagram={layouted} />);
if (!svg.includes('xmlns=')) {
  svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
}
```

---

## Validation Architecture

### Dimensions

| Dimension | What to verify | Tool/command |
|-----------|----------------|--------------|
| Text measurement | Known string width within 1px of opentype ground truth | Unit test: `"API Gateway"` at 14px semibold |
| Layout | All 5 kind fixtures produce finite x/y on every node | `cora render examples/valid/*.yaml -o /tmp/out.svg` exit 0 |
| SVG structure | No `foreignObject`; has xmlns; viewBox present | grep/assert in test script |
| Visual regression | ≥1 golden SVG per kind; byte-stable with embedded font | `tests/golden/*.svg` snapshot diff (string compare, not raster) |
| CLI | `cora render -o out.svg` writes file | exit 0 + file exists |

### Golden SVG strategy

- **String snapshot** (not pixel raster) — embedded Inter + deterministic ELK options → stable SVG text across OS
- Store under `packages/cora/tests/golden/{kind}.svg`
- CI: render fixture → normalize whitespace → compare to golden
- Update policy: intentional visual change requires explicit golden refresh in PR description

### Manual UAT checklist (post-execute)

1. `cora render examples/valid/flowchart.yaml -o /tmp/fc.svg` — diamond node visible, edge label "yes"
2. `cora render examples/valid/infra.yaml -o /tmp/infra.svg` — group boundary around nodes
3. Open SVG in browser — soft pastels, subtle shadow, 14px labels

---

## Requirement Mapping

| ID | Research answer |
|----|-----------------|
| LAY-01 | elkjs layered algorithm |
| LAY-02 | auto/preserve/hybrid in layout.ts |
| LAY-03 | elk.fixed on pinned nodes |
| LAY-04 | elkjs via web-worker |
| REN-01 | pure SVG components |
| REN-02 | same Diagram component tree (serve Phase 4) |
| REN-03 | stateless props-only components |
| REN-04 | default.ts theme tokens |
| REN-05 | BoxNode, RoundedNode, CylinderNode, CloudNode, DiamondNode, HexagonNode, Group |
| REN-06 | ELK edge sections → path + textPath or positioned text |
| REN-07 | viewBox padding helper |
| REN-08 | opentype.js + Inter TTF |
| CLI-05 | render command |
| EXP-01 | renderToStaticMarkup → write file |

---

## Project Constraints (from AGENTS.md / PROJECT.md)

- Pure SVG only — no foreignObject
- Single `cora` npm package
- Node 22+, Bun workspaces
- Phase 2 scope: render SVG only — no PDF, serve, extensions rendering
- Validate before render (reuse existing validator)

---

*Phase 2 research complete*
