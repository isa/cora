# Technology Stack

**Project:** Cora — open-source AI-agent diagram tool
**Researched:** 2026-05-21
**Confidence:** HIGH (all major choices verified against npm registry / official docs)

---

## Recommended Stack

### Runtime & Language

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Node.js | 20 LTS (min), 22 LTS (recommended) | Runtime | LTS with native `fetch`, ESM, stable `fs.watch`; required by chokidar v5 |
| TypeScript | 5.x (latest stable) | Language | Strict mode throughout; project references for monorepo |

> **Do NOT target Node.js 18.** chokidar v5 (the file-watcher you'll use) dropped Node 18 support. Node 20 is the floor.

---

### Monorepo Tooling

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Bun | 1.x | Package manager + runtime | Fast installs, native TypeScript, first-class workspace support; recommended for local development |
| Turborepo | 2.x | Task orchestration + caching | Minimal config, fast incremental builds; better fit than Nx (too much scaffolding) for a single-publish repo |
| tsdown | latest (0.x beta, stabilising) | Library bundler | ESM-first Rolldown-powered replacement for tsup; tsup announced end-of-maintenance Nov 2025; tsdown migration is a one-command `npx tsdown-migrate` |
| @changesets/cli | 2.x | Version management + publish | Industry standard for monorepos; OIDC-based trusted publishing eliminates long-lived NPM_TOKEN |

**Internal package structure (Bun workspace):**
```
packages/cora/
  core/     → tsdown builds to dist/
  renderer/ → tsdown builds to dist/
  web/      → Vite builds to dist/
  cli/      → tsdown builds to dist/ (entry + shebang)
```

Root `package.json` workspaces:
```json
{
  "workspaces": ["packages/*"],
  "packageManager": "bun@1.x"
}
```

**Do NOT use:**
- `npm workspaces` alone — weaker tooling vs Bun for local dev (npm still used for global publish)
- `nx` — heavy scaffolding, opinionated generators; overkill for a single publishable
- `lerna` — maintenance mode; use Changesets instead
- `tsup` — explicitly transitioning to maintenance-only as of 2025

---

### YAML Parsing + AST Patching

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| yaml | 2.x | YAML parse + Document AST | Only YAML library with full AST access; comment preservation; `visit()` API; used for both reading and patching |

**Why `yaml` (eemeli/yaml) and not alternatives:**

- `js-yaml` — fast parser but NO AST layer; comments are discarded; impossible to do the YAML save-back requirement without touching comment/order preservation. Hard no.
- `yaml-diff-patch` — built on top of `yaml`, useful for JSON-patch-style operations but adds unnecessary abstraction; use the `yaml` Document API directly instead.
- `@yaml-ast-parser` — unmaintained (last publish 2019); avoid.

**AST patching pattern for `cora serve` save:**
```typescript
import { parseDocument, visit } from 'yaml'

const doc = parseDocument(rawYaml)  // preserves comments, order, blank lines
// mutate specific nodes via visit() or doc.getIn() / doc.setIn()
const patched = String(doc)         // emits back to YAML preserving everything else
```

The `yaml` package preserves comments, field order, unknown fields, and blank lines when you modify the Document AST rather than parsing to plain JS and re-serialising. This is the only correct approach for `cora serve` save-back.

---

### JSON Schema Validation

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| ajv | 8.x (8.20.0 as of Apr 2026) | JSON Schema validation | 305M weekly downloads; compiles schemas to JS functions; supports drafts 04/07/2019-09/2020-12; TypeScript-native; structured error output |
| ajv-formats | 3.x | Format validators (`uri`, `date-time`, etc.) | AJV plugin; required for any format keywords in the diagram schema |

**Why AJV and not Zod:**
Zod defines a TypeScript-first schema; AJV validates against JSON Schema. The Cora contract is JSON Schema — agents consume `cora schema` output and the schema file is the ground truth. AJV's error messages are structured and machine-readable, which is what `cora validate --format json` requires. Zod could coexist for internal type inference (via `z.infer`) but is not the validation engine.

**Structured validation error shape** (AJV default, no transformation needed):
```json
{ "instancePath": "/nodes/0/id", "keyword": "required", "message": "..." }
```

---

### Graph Layout

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| elkjs | 0.11.1 (Mar 2026) | Automatic graph layout | Based on Eclipse Layout Kernel; handles layered, force, tree topologies; TypeScript definitions included; 2.4M weekly downloads; zero npm dependencies |

**Notes:**
- elkjs runs the ELK engine compiled to JS (WebAssembly-compatible but npm version runs in Node/browser JS)
- Supports `ELK_LAYERED`, `ELK_FORCE`, `ELK_TREE`, `ELK_RADIAL` algorithms — pick per diagram kind
- Port-based routing is supported (useful for microservice topology diagrams)
- Layout can run in a Worker to unblock the main thread in `cora serve`

**`layout: hybrid` implementation strategy:**
1. Parse positions from YAML: nodes with `pinned: true` have fixed coordinates
2. Feed non-pinned nodes to ELK with the pinned nodes as "fixed" hints (ELK supports `elk.position` property)
3. Apply ELK output to unpinned nodes only; keep pinned coordinates

**Do NOT use:**
- `dagre` — last release 2018, maintenance-only; less capable than ELK for complex topologies
- `d3-dag` — good for DAGs but no general graph layout; no port routing
- `graphviz` (viz.js) — native binary, poor Node.js integration, WASM build is heavy

---

### React Renderer

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| react | 19.x | Component rendering | Current stable (released Dec 2024); `renderToStaticMarkup` unchanged; concurrent features not needed for SVG export |
| react-dom | 19.x | DOM + server rendering | `renderToStaticMarkup` for headless SVG; `createRoot` for interactive canvas |

**SVG export pipeline:**
```typescript
import { renderToStaticMarkup } from 'react-dom/server'
import { DiagramSVG } from '../renderer'

const svg = renderToStaticMarkup(<DiagramSVG diagram={resolved} />)
// prefix with XML declaration + SVG doctype if needed
await fs.writeFile(outPath, svg, 'utf-8')
```

**Critical constraints for the renderer (already in PROJECT.md, restating for stack clarity):**
- **No `foreignObject`** anywhere in the SVG tree — resvg-js will skip or corrupt it during PDF rasterisation
- **No CSS class names linked to external stylesheets** — inline all styles as `style` attributes or SVG presentation attributes
- **No `<image href="...url">` with external URLs** — resvg-js supports local font files and data URIs, not arbitrary HTTP URLs

**React 18 vs 19:** No API changes to `renderToStaticMarkup` between versions. React 19 is chosen because it's the current stable and avoids a future forced migration. React 18 is fine if you hit React 19 compatibility issues with any dep.

---

### SVG → PDF Pipeline

#### Default path: resvg-js + pdf-lib (bundled, raster)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @resvg/resvg-js | 2.6.2 (stable) / 2.7.0-alpha (prerelease) | SVG → PNG rasterisation | Rust-based, pre-compiled binaries for all platforms, no node-gyp, no Chromium; 2–3× faster than canvas-based alternatives |
| pdf-lib | 1.17.x | PNG → PDF embedding | Pure JS, no native deps, embeds raster images, sets PDF page size from SVG viewport |

**PDF generation flow (default `cora render --format pdf`):**
```
SVG string
  → resvg-js: Resvg(svg, { fitTo: { mode: 'zoom', value: 2 } }).render().asPng()
  → PDF: PDFDocument.create() → embedPng(pngBuffer) → drawImage on page
  → PDFDocument.save() → write to file
```

**Scale recommendation:** `fitTo: { mode: 'zoom', value: 2 }` (2× logical pixels) for print-quality output at standard paper sizes. The SVG viewport maps to the PDF page size; set page dimensions accordingly.

**Important:** resvg-js v2.6.2 outputs **PNG only**, not vector PDF. The default PDF is raster-embedded. This is fine for most agent/CI use cases. The Playwright path (below) produces a true vector PDF.

**Do NOT use:**
- `svg-to-pdfkit` / `SVG-to-PDFKit` — attempts to re-parse SVG paths in JS; poor fidelity with complex paths and text; no resvg font rendering
- `jsPDF` — HTML-only rendering flow, not suited for React-generated SVG
- `rsvg-convert` (system binary) — requires system dependency; breaks portable npm install
- `Inkscape CLI` — same problem; adds 150 MB system requirement

#### High-quality path: Playwright (optional, lazy download)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| playwright-core | 1.x (latest) | Headless Chromium PDF | True vector PDF via `page.pdf()`; Chromium download deferred to `~/.config/cora/browsers/` on first use |

**Why `playwright-core` (not `playwright`):** `playwright` pulls Chromium at install time; `playwright-core` does not — you control the download explicitly via `chromium.launch({ executablePath })`. This keeps `npm install cora` fast.

**High-quality PDF flow:**
```typescript
import { chromium } from 'playwright-core'
// On first --quality=high: download Chromium to ~/.config/cora/browsers/
const browser = await chromium.launch({ executablePath: localChromiumPath })
const page = await browser.newPage()
await page.setContent(`<html><body>${svgMarkup}</body></html>`)
const pdf = await page.pdf({ format: 'A4', printBackground: true })
```

**Do NOT use:**
- `puppeteer` — same capability as Playwright but less ergonomic API; no advantage; community has converged on Playwright
- Playwright full package at install time — breaks the "small core install" constraint

---

### Interactive Canvas (`cora serve`)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| vite | 6.x | Build + dev server for canvas UI | Fast HMR, ESM-native, excellent React plugin; `cora serve` bundles the canvas app into the `cora` package |
| @vitejs/plugin-react | 4.x | React + JSX transform for Vite | Babel-less fast refresh via SWC/oxc |
| express | 5.x | Backend HTTP server for `cora serve` | Minimal; serves bundled Vite output + REST API for YAML save + WebSocket upgrade |
| ws | 8.x | WebSocket server | Lightweight; no Socket.io overhead; used for YAML change notifications to canvas |
| chokidar | 5.x | File watching | ESM-only, Node 20+, 178M weekly downloads; watches source YAML for `cora serve` hot-reload |

**`cora serve` architecture:**
```
cora serve diagram.yaml
  ├── Express HTTP server (port 3000, configurable)
  │   ├── GET /  → serve pre-bundled Vite canvas (static files baked into npm package)
  │   ├── GET /api/diagram → return parsed diagram JSON
  │   ├── POST /api/diagram/save → YAML AST patch + write file
  │   └── WebSocket upgrade → notify canvas of file changes
  └── chokidar watch(diagram.yaml)
       └── on change → ws.send({ type: 'FILE_CHANGED' }) to all clients
```

**Canvas pre-bundling strategy:**
The `web/` package is built with `vite build` during `bun run build`. The resulting `dist/` is committed into the published npm package. `cora serve` serves these assets from within the installed package — no Vite runtime dependency at serve time. This keeps the production package clean.

**Do NOT use:**
- `webpack-dev-server` — slow, complex config; Vite is the modern default
- `parcel` — less control over the bundle; Vite's explicit config is better here
- `socket.io` — 40+ transports and reconnection overhead unnecessary for a local file server
- `http-server` or `serve` — static only; can't serve the YAML save API

---

### CLI Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| commander | 12.x | CLI command/option parsing | 35M weekly downloads (vs oclif's 200K); minimal, zero extra deps; first-class TypeScript; exactly right complexity for 5-command CLI |

**Why Commander and not oclif:**
oclif is built for enterprise CLIs with plugin systems, generators, and auto-update installers. Cora has 5-6 top-level commands (`validate`, `render`, `serve`, `schema`, `ext`, `doctor`). Commander handles this cleanly with 300 fewer transitive dependencies. oclif's code-generation scaffolding is irrelevant here.

**Why Commander and not yargs:**
yargs has a more verbose builder API; commander's fluent API is more readable for a small command set.

**Command structure:**
```typescript
import { Command } from 'commander'

const program = new Command('cora')
program.command('validate <file>').option('--format <fmt>', 'json|text', 'text')
program.command('render <file>').option('-o, --output <path>').option('--quality <q>', 'standard|high', 'standard')
program.command('serve <file>').option('-p, --port <n>', '3000')
program.command('schema').option('--out <path>')
program.command('ext').addCommand(extInstall).addCommand(extList)
program.command('doctor')
```

---

### Development Runtime

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| tsx | 4.x | Run TypeScript files directly in Node.js | esbuild-backed; replaces `ts-node`; used for `bun run dev` scripts and local testing of CLI |
| vitest | 2.x | Unit testing | Vite-aligned, fast, ESM-native; same config as the Vite build |

> `tsx` is a dev dependency only — it does NOT ship in the published package. The published CLI runs compiled JS.

---

### Supporting Utilities

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| picocolors | 1.x | Terminal colour | Tiny (2KB); replaces chalk for CLI output; use for error/warning colouring in `validate` output |
| ora | 8.x | CLI spinner | ESM-only; shows progress during ELK layout and PDF render |
| semver | 7.x | Semver parsing | Extension compatibility checks (`>=1.0.0 <2.0.0`); already transitive in most stacks |
| node-fetch / native `fetch` | built-in | HTTP for extension downloads | Node.js 20+ has `fetch` built in; no need for `got` or `node-fetch` |
| tar | 7.x | Tarball extraction | Extension installs from GitHub releases (`.tar.gz`); pure JS, no binary |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Package manager | Bun | npm / yarn | Valid alternatives; Bun chosen for local dev speed and native TypeScript |
| Task runner | Turborepo | Nx | Nx is heavily opinionated with generators; overkill for single publishable |
| Library bundler | tsdown | tsup | tsup is entering maintenance-only; tsdown is the recommended successor |
| Library bundler | tsdown | esbuild direct | No tree-shaking of unused exports; no declaration file emission |
| YAML | yaml (eemeli) | js-yaml | No AST; comments discarded; cannot satisfy the save-back requirement |
| Schema validation | AJV | Zod | Zod produces TypeScript types, not JSON Schema; agents need a machine-readable schema |
| Schema validation | AJV | @sinclair/typebox | Good alternative (JSON Schema + TypeScript duality) but smaller ecosystem; AJV's structured errors are battle-tested |
| Graph layout | elkjs | dagre | dagre last released 2018; ELK handles more topology types |
| Graph layout | elkjs | d3-force | Force simulation ≠ deterministic layout; bad for architectural diagrams |
| PDF (default) | resvg-js + pdf-lib | svg-to-pdfkit | Complex re-parsing; poor fidelity for non-trivial SVG |
| PDF (default) | resvg-js + pdf-lib | rsvg-convert | System binary; breaks portable npm install |
| PDF (high) | playwright-core | puppeteer | Identical capability; Playwright is the community-converged choice |
| CLI | commander | oclif | oclif is 175× less downloaded; plugin system unnecessary; too much scaffolding |
| CLI | commander | yargs | More verbose builder API; no advantage for 5-command CLI |
| File watching | chokidar | node `fs.watch` | `fs.watch` unreliable cross-platform (misses events on macOS, no recursive on Linux) |
| Dev bundler | Vite | Webpack | Vite is faster, simpler config; Webpack's ecosystem advantage irrelevant here |
| Terminal colour | picocolors | chalk | chalk v5 is ESM-only fine, but picocolors is 14× smaller with identical API |

---

## Installation

```bash
# Core runtime dependencies (from packages/cora)
bun add yaml ajv ajv-formats elkjs react react-dom commander picocolors ora semver tar

# PDF pipeline
bun add @resvg/resvg-js pdf-lib

# serve command
bun add express ws chokidar

# Playwright (optional; only imported if --quality=high invoked)
bun add playwright-core

# Dev tooling (root workspace)
bun add -d typescript tsx vite @vitejs/plugin-react tsdown @changesets/cli turbo vitest
```

**Playwright note:** Add `playwright-core` to `dependencies` (not devDependencies) because the high-quality PDF path needs it at runtime. However, the Chromium browser binary is NOT downloaded at install time — Cora manages the download lazily.

---

## Version Pinning Strategy

- **Monorepo internal packages:** `workspace:*` in package.json (Bun workspaces)
- **External runtime deps:** `^` (minor-compatible) except native addons
- **resvg-js and playwright-core:** pin to exact minor (`~2.6.2`) — native addons and browser control; minor bumps can break binary compatibility
- **elkjs:** `^0.11.1` (minor-compatible; API is stable but major bumps do exist)

---

## Sources

- elkjs npm registry: https://www.npmjs.com/package/elkjs (v0.11.1, Mar 2026) — HIGH confidence
- yaml package: https://github.com/eemeli/yaml — HIGH confidence (official repo)
- AJV: https://ajv.js.org — HIGH confidence (official docs)
- resvg-js: https://github.com/thx/resvg-js (v2.6.2 stable, v2.7.0-alpha.2 prerelease) — HIGH confidence
- chokidar v5: https://github.com/paulmillr/chokidar/releases/tag/5.0.0 — HIGH confidence
- tsdown: https://tsdown.dev — HIGH confidence (official site)
- commander: https://npmtrends.com/commander-vs-oclif (35M vs 200K downloads) — HIGH confidence
- Bun + Turborepo: https://bun.sh/docs/install/workspaces — HIGH confidence (official docs)
