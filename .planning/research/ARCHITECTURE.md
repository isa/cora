# Architecture Patterns

**Project:** Cora
**Researched:** 2026-05-21

---

## Recommended Architecture

Four internal modules inside a single `cora` npm package. Hard dependency direction: `cli` → `web` → `renderer` → `core`. No module reaches "up" the chain.

```
packages/cora/
  src/
    core/       # Parse, validate, layout (ELK), theme resolution, extension loader
    renderer/   # React → pure SVG components (no browser APIs)
    web/        # Interactive canvas (React app, Vite project)
    cli/        # Command dispatcher, Node.js process boundary
  dist/
    index.js    # Library entry (re-exports core + renderer public APIs)
    index.d.ts
    cli.js      # CLI binary (bin entry in package.json)
    web/        # Pre-built Vite assets (bundled before publish)
```

---

## Component Boundaries

| Module | Responsibility | Depends On | Must NOT import |
|--------|---------------|------------|-----------------|
| `core/` | Parse YAML/JSON → DiagramIR; validate; ELK layout; theme/style resolution; extension load/cache | `elkjs`, `yaml`, `ajv` | React, browser APIs |
| `renderer/` | Stateless React components: `DiagramIR + positions → <svg>` tree; `renderToSVG()` headless function | `core/` types, React | Browser DOM, Node.js fs, extension IO |
| `web/` | Interactive canvas (drag/pin, label edit, hot-reload); Vite project; communicates with `cli/serve` via WebSocket | `renderer/`, `core/` types | Node.js built-ins |
| `cli/` | Commands: validate, render, serve, schema, ext, doctor; owns file I/O, process exit, PDF export | `core/`, `renderer/`, Node.js built-ins, `express`, `@resvg/resvg-js`, `playwright` | Browser APIs |

**Key rule:** `renderer/` has no runtime dep on `core/` — it only imports its types. The caller (CLI or web canvas) runs `core.layout()` then passes the `LayoutedDiagram` into renderer. This keeps renderer pure and testable without layout being run.

---

## Data Flow

### Headless render (`cora render`)

```
YAML/JSON file
  → core/parser.parse()           → DiagramIR
  → core/validator.validate()     → throws StructuredError[] on failure
  → core/themeResolver.resolve()  → DiagramIR + resolved styles
  → core/layout.computeLayout()   → LayoutedDiagram (IR + x/y/w/h on every node)
  → renderer/renderToSVG()        → <svg> string via renderToStaticMarkup()
  → add xmlns="http://www.w3.org/2000/svg" (stripped by React, required for resvg)
  → .svg output: write to disk

PDF default path:
  → @resvg/resvg-js.render(svgString) → PNG buffer (Rust renderer, no system dep)
  → pdf-lib: embed PNG in PDF envelope, set page dimensions to diagram size
  → .pdf output: write to disk

PDF high-quality path (--quality=high):
  → playwright: launch bundled Chromium from ~/.config/cora/browsers/
  → load the SVG in a headless page
  → page.pdf() → .pdf output
```

### Interactive canvas (`cora serve`)

```
YAML file
  → core pipeline (same as above) → LayoutedDiagram
  → HTTP server (Express/Hono) sends LayoutedDiagram as JSON to browser via WS

Browser:
  → renderer/Diagram component receives LayoutedDiagram as props → renders <svg>
  → React event handlers: drag → optimistic position update (no re-layout)
  → label edit → optimistic label update
  → "Save" click → send { positions, labels } diff to server via WebSocket

Server (cli/serve):
  → receive diff → core/yamlAstPatch.patch(filepath, diff)
     uses eemeli/yaml AST API: parse preserving comments + field order
     mutates only position/pinned/label nodes in the AST → stringify → write
  → do NOT re-run layout (patched positions are already resolved)

File watcher (chokidar):
  → external change detected → re-run core pipeline → push updated LayoutedDiagram via WS
  → browser: if canvas has unsaved edits → prompt "External change — discard edits?"
             if clean → apply silently
```

### Extension loading (`cora ext install`)

```
User: cora ext install aws-theme

cli/ext:
  → fetch https://api.github.com/repos/cora-extensions/releases?tag=aws-theme-<version>
  → resolve compatible version against installed cora version (semver peerDep in extension manifest)
  → download tarball → extract to ~/.config/cora/extensions/aws-theme/
  → write entry to ~/.config/cora/extensions.json (global registry)
  → if cora.extensions.lock.json present in cwd: update lockfile

At render/serve time:
  → core/extensionLoader reads lockfile (project) or extensions.json (global)
  → verify each required extension is installed and compatible
  → hard fail with actionable error if missing (no silent fallback)
  → load theme manifest + icon set from extension directory
  → themeResolver merges extension theme over default theme
```

---

## Module-Level Design

### `core/` internals

```
core/
  parser.ts          # YAML/JSON → DiagramIR (auto-detect by extension)
  validator.ts        # AJV + JSON Schema; returns StructuredError[]
  schema.ts          # Exports JSON Schema object (used by cora schema command too)
  layout.ts          # ELK wrapper; respects node.pinned and layout: preserve/hybrid/auto
  themeResolver.ts   # Merge default theme + extension theme + per-node style overrides
  extensionLoader.ts # Fetch, cache, verify, load extensions
  yamlAstPatch.ts    # AST-preserving patch for position/pinned/label fields
  types.ts           # DiagramIR, LayoutedDiagram, StructuredError, etc.
  index.ts           # Public re-exports
```

`layout.ts` runs ELK in a **worker thread** (`web-worker` package provides browser-compatible Worker API in Node.js). ELK's JS bundle is large and CPU-bound; isolating it prevents blocking the serve command's event loop.

### `renderer/` internals

```
renderer/
  Diagram.tsx        # Root component: receives LayoutedDiagram, delegates to kind-specific layout
  nodes/
    BoxNode.tsx
    RoundedNode.tsx
    CylinderNode.tsx # database
    ...
  edges/
    Arrow.tsx        # with label, routing points from ELK
  groups/
    Group.tsx        # swimlane / cloud boundary
  themes/
    default.ts       # Built-in polished theme tokens
  renderToSVG.ts     # Headless: renderToStaticMarkup(<Diagram />) + xmlns inject
  index.ts
```

All components are pure functions of their props. No `useState`, no `useEffect`, no `useRef` — renderer is intentionally stateless so it can run in both headless (server) and interactive (browser) contexts. Interaction state lives in `web/`.

### `web/` internals

```
web/
  vite.config.ts     # outDir: ../../dist/web, build.target: modules
  Canvas.tsx         # Wraps <Diagram />; adds drag handlers, selection, label edit input
  useYamlSync.ts     # WebSocket: send diffs on save; receive updates on external change
  DirtyGuard.tsx     # Prompts user before applying external changes over unsaved edits
  DevServer.ts       # NOT in web/; this is cli/serve.ts that launches Express + WS
```

`web/` is a standalone Vite project. During `npm run build`, Vite bundles it to `dist/web/`. The CLI's `serve` command serves those static files from Express. The browser app fetches its initial diagram state from `GET /api/diagram` and connects to `ws://localhost:<port>/ws`.

### `cli/` internals

```
cli/
  index.ts           # commander setup; registers all commands
  commands/
    validate.ts      # core.parse + core.validate; --format json|human
    render.ts        # full pipeline → SVG/PDF
    serve.ts         # Express + WS + chokidar; serves dist/web/
    schema.ts        # core.schema → stdout or file
    ext/
      install.ts
      list.ts
      remove.ts
    doctor.ts        # Check Node version, extension health, config paths
```

---

## Build Order

Build each module in dependency order. Downstream modules consume the `dist/` output of upstream modules during development (via `package.json` `exports` pointing to `dist/`).

| Step | Module | Tool | Output | Notes |
|------|--------|------|--------|-------|
| 1 | `core/` | tsdown | `dist/core/` | TypeScript only, no JSX |
| 2 | `renderer/` | tsdown (+ TSX) | `dist/renderer/` | Depends on `core/` types only |
| 3 | `web/` | Vite | `dist/web/` | Full browser bundle; consumes `core/` + `renderer/` |
| 4 | `cli/` | tsdown | `dist/cli.js` | Bundle as single file; depends on all above |
| 5 | package root | — | `dist/index.js` | Re-exports from `core/` + `renderer/` for library consumers |

`prepack` script in `package.json` runs steps 1–5 in order so `dist/web/` is always fresh before publish.

**Build tool: `tsdown`** (successor to `tsup`, built on Rolldown). Zero-config, esbuild-fast, supports ESM + CJS dual output + `.d.ts` generation. Vite is used only for `web/` (browser app).

```json
// package.json exports field
{
  "exports": {
    ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" },
    "./core": { "import": "./dist/core/index.js", "types": "./dist/core/index.d.ts" },
    "./renderer": { "import": "./dist/renderer/index.js", "types": "./dist/renderer/index.d.ts" }
  },
  "bin": { "cora": "./dist/cli.js" }
}
```

---

## Key Patterns

### Pattern: DiagramIR as the contract between modules

`core/` always produces a `DiagramIR` and `LayoutedDiagram` as plain TypeScript objects. `renderer/` accepts a `LayoutedDiagram`. No module passes raw YAML or DOM objects across boundaries — the typed IR is the shared language.

```typescript
// core/types.ts — the contract
export interface LayoutedDiagram {
  kind: DiagramKind;
  theme: ResolvedTheme;
  nodes: LayoutedNode[];   // includes x, y, width, height
  edges: LayoutedEdge[];   // includes routing points
  groups: LayoutedGroup[];
}
```

### Pattern: Structured validation errors for agents

`core/validator` throws `StructuredError[]`, not plain strings. Each error has a `code`, `path`, `message`, and optional `suggestion`. `cora validate --format json` emits these as JSON on stdout. Agents parse this reliably; `--format human` is the readable default.

### Pattern: YAML AST patching (not round-trip serialization)

When `cora serve` saves back to YAML, it NEVER fully serializes the in-memory diagram. It only patches the AST nodes that changed (positions, pinned flags, labels). This preserves comments, field order, extra fields, and any agent-authored annotations.

```typescript
// core/yamlAstPatch.ts
import { parseDocument } from 'yaml';

export function patchDiagram(source: string, diff: PositionLabelDiff): string {
  const doc = parseDocument(source);  // returns CST, preserves all formatting
  for (const [nodeId, pos] of Object.entries(diff.positions)) {
    setNestedValue(doc, ['diagram', 'nodes', nodeId, 'position'], pos);
  }
  return doc.toString();  // re-serialized preserving original structure
}
```

### Pattern: Extension hard-fail contract

Extensions are resolved at the start of any pipeline run. If a diagram references `provider: aws` and the `aws-theme` extension is not installed, `core/extensionLoader` throws a `MissingExtensionError` with a structured install command. No silent fallback — agents need to know their diagram rendered exactly as intended.

### Pattern: Layered hybrid diagram model

All diagram kinds share a common `{ nodes, edges, groups }` vocabulary in `DiagramIR`. Kind-specific behavior (e.g. `infra` diagrams have cloud boundary groups; `flowchart` has decision diamond shapes) is expressed as:
1. A `kind` field that selects a renderer profile (layout hints, default shapes, group styles)
2. Per-node `shape` and optional `provider`/`service` for semantic icon resolution
3. Per-node `style` overrides (last to apply, highest specificity)

This avoids a separate IR per diagram kind while still giving each kind a distinct visual vocabulary.

---

## Anti-Patterns to Avoid

### Anti-Pattern: Browser APIs in `renderer/`
**What:** Using `window`, `document`, `getBBox()`, `getComputedStyle()` in any renderer component
**Why bad:** Breaks `renderToStaticMarkup()` (Node.js context); breaks resvg pipeline
**Instead:** All geometry comes from ELK output in `LayoutedDiagram`; no runtime DOM measurement

### Anti-Pattern: React state in renderer components
**What:** `useState`, `useRef`, `useEffect` in `renderer/` components
**Why bad:** Renderer must be a pure function of `LayoutedDiagram` for headless correctness
**Instead:** All interaction state lives in `web/Canvas.tsx`; renderer receives complete, pre-computed props

### Anti-Pattern: `foreignObject` in SVG output
**What:** Embedding HTML inside SVG with `<foreignObject>`
**Why bad:** resvg does not support `foreignObject`; PDF default path breaks
**Instead:** All text uses `<text>` elements with manual wrapping; all layout geometry comes from ELK

### Anti-Pattern: Re-running ELK layout on every save
**What:** Running the full `core.layout()` pipeline after YAML AST patch in serve mode
**Why bad:** ELK layout is non-deterministic for `layout: auto`; positions would shift on every save
**Instead:** After AST patch, the file has explicit positions; next load respects them as `layout: preserve`

### Anti-Pattern: Publishing `web/` source or `dist/web/` separately
**What:** Exposing `web/` internals as a library export or separate package
**Why bad:** Tight coupling to serve internals; violates single-package publish constraint
**Instead:** `dist/web/` is an internal implementation detail of the `serve` command only

---

## Scalability Considerations

| Concern | Current design handles it? | If needed later |
|---------|---------------------------|-----------------|
| Large diagrams (200+ nodes) | ELK in worker thread avoids blocking | Incremental layout (ELK supports sub-graph layout) |
| Many extensions installed | Lazy-load: only parse extensions needed by current diagram | Extension manifest index, skip unused |
| CI parallel renders | Stateless CLI; each invocation is independent | No changes needed |
| Web canvas performance | React key-based reconciliation; SVG DOM is fast at this scale | Virtual canvas (canvas 2d) only at 1000+ nodes |

---

## Library Choices

| Concern | Chosen Library | Rationale |
|---------|---------------|-----------|
| YAML parse + AST patch | `yaml` (eemeli) | Full AST API; preserves comments, ordering |
| JSON Schema validation | `ajv` (v8) | Fastest validator; used by every major Node.js JSON Schema ecosystem |
| ELK layout | `elkjs` + `web-worker` | Only mature JS graph layout engine; worker isolates CPU-bound transpiled Java code |
| File watching | `chokidar` | Standard; cross-platform; debounced |
| CLI framework | `commander` | Simple, well-maintained; sufficient for Cora's command surface |
| HTTP + WebSocket (serve) | `express` + `ws` | Minimal; no framework overhead needed for a local dev server |
| SVG → PNG (PDF default) | `@resvg/resvg-js` | Bundled Rust binaries; zero system deps; fast |
| PNG → PDF wrapper | `pdf-lib` | Pure JS; no native deps; pairs with resvg PNG output |
| PDF high-quality | `playwright` | Lazy-installed to `~/.config/cora/browsers/`; not bundled |
| Web build | Vite | Best-in-class browser bundler; assets land in `dist/web/` at build time |
| TS library build | `tsdown` | tsup successor; esbuild/Rolldown core; zero config |

---

## Sources

- elkjs README and DeepWiki: architecture patterns for Node.js worker thread usage
- React official docs: `renderToStaticMarkup` constraints and SVG xmlns requirement
- `@resvg/resvg-js` npm: PNG-only output (PDF = resvg PNG + pdf-lib wrapping)
- `yaml` (eemeli) GitHub: AST-preserving parse/modify/stringify
- `yaml-diff-patch` npm: YAML patch pattern using RFC6902 operations over eemeli/yaml AST
- Gemini CLI GitHub: git-based extension loading via GitHub releases API
- tsdown GitHub: tsup successor, current recommended bundler
- PROJECT.md (2026-05-21): architecture sketch, constraints, key decisions
