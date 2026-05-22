# Phase 3: PDF Export - Pattern Map

**Mapped:** 2026-05-22
**Files analyzed:** 13 (10 new, 3 modified)
**Analogs found:** 10 / 13

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `packages/cora/src/renderer/renderToPDF.ts` | renderer module | transform (IR + SVG → bytes) | `packages/cora/src/renderer/renderToPNG.ts` | exact (same shape, same resvg+font plumbing) |
| `packages/cora/src/renderer/renderToPDFHighQuality.ts` | renderer module (dynamic-imported) | transform (SVG → bytes via subprocess+browser) | `packages/cora/src/renderer/renderToPNG.ts` | role-match (different pipeline, same module export shape) |
| `packages/cora/src/renderer/pdf/pageSize.ts` | helper (pure) | transform (IR + opts → geometry) | `packages/cora/src/renderer/viewBox.ts` | role-match (pure geometry helper) |
| `packages/cora/src/renderer/pdf/coords.ts` | helper (pure) | transform (xy → xy) | `packages/cora/src/renderer/utils.ts` | role-match (small pure utility module) |
| `packages/cora/src/renderer/pdf/textOverlay.ts` | helper | transform (LayoutedDiagram → drawText list) | `packages/cora/src/renderer/edges/EdgeLabel.tsx` (label placement walker) | partial (same domain: label-from-IR; different output: data vs JSX) |
| `packages/cora/src/renderer/pdf/resvgCapture.ts` | helper | side-effect wrap (stderr capture) | `packages/cora/src/renderer/renderToPNG.ts` (lines 90-103, Resvg invocation) | role-match (wraps the same Resvg call) |
| `packages/cora/src/renderer/assets/fonts.ts` | shared utility (refactor) | file I/O (resolve + read) | inline `resolveFontPath` in `renderToPNG.ts` (lines 54-81) | exact (extract-as-is) |
| `packages/cora/src/cli/paths.ts` | CLI helper (greenfield) | config (env → path) | `packages/cora/src/cli/output.ts` (small predicate/helper module) | partial (similar size/shape, different domain) |
| `packages/cora/src/cli/playwrightInstall.ts` | CLI helper (greenfield) | event-driven (spawn + exit code) | none in src — closest is `packages/cora/tests/render-golden.mjs` (lines 5, 60-62, `execFileSync` pattern) | greenfield (no in-src child_process usage yet) |
| `packages/cora/src/cli/commands/render.ts` (MODIFY) | CLI command | request-response | self (extend extension switch + flags) | self (existing pattern, lines 24-35, 37-53) |
| `packages/cora/src/cli/output.ts` (MODIFY) | CLI helper | predicate | self — add `isNonInteractive` next to `isJsonOutput` (lines 10-15) | self |
| `packages/cora/src/renderer/assets/fonts/NotoSans-Regular.ttf` + `NotoSans-SemiBold.ttf` + `SOURCES.md` | asset | static file | sibling WOFF files in same dir | exact (sibling assets) |
| `packages/cora/tests/pdf/*.test.ts` | test | golden / integration | `packages/cora/tests/render-golden.mjs` | role-match (existing test harness uses bespoke `.mjs` + `execFileSync`; phase introduces vitest) |

## Pattern Assignments

### `packages/cora/src/renderer/renderToPDF.ts` (renderer, transform)

**Analog:** `packages/cora/src/renderer/renderToPNG.ts`

**Imports pattern** (renderToPNG.ts lines 1-5):
```typescript
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Resvg, type ResvgRenderOptions } from '@resvg/resvg-js';
```
Copy verbatim, then add `import { PDFDocument } from 'pdf-lib';` and `import fontkit from '@pdf-lib/fontkit';` and `import type { LayoutedDiagram } from '../layout-ir.js';`.

**Options + default export pattern** (renderToPNG.ts lines 83-103):
```typescript
export interface RenderToPNGOptions {
  /** Logical pixel scale (overrides `size` when set). */
  scale?: number;
  /** Named PNG scale preset (default md). */
  size?: PngSize;
}

export function renderToPNG(svg: string, options: RenderToPNGOptions = {}): Buffer {
  const scale = options.scale ?? resolvePngScale(options.size);
  const scaledSvg = scaleSvgDimensions(svg, scale);
  const resvgOptions = {
    font: {
      fontBuffers: renderFontBuffers(),
      loadSystemFonts: false,
      defaultFontFamily: 'Noto Sans',
      sansSerifFamily: 'Noto Sans',
    },
  } as ResvgRenderOptions;
  const resvg = new Resvg(scaledSvg, resvgOptions);
  return resvg.render().asPng();
}
```
Mirror as `export async function renderToPDF(layouted, svg, options): Promise<Uint8Array>`. Reuse the exact `font: { fontBuffers, loadSystemFonts:false, defaultFontFamily:'Noto Sans', sansSerifFamily:'Noto Sans' }` block — D-11 requires `loadSystemFonts:false` so font-family warnings actually fire.

**SVG dimension scaling pattern** (renderToPNG.ts lines 33-52): Copy as-is into `pdf/pageSize.ts` (function `scaleSvgToPage` in RESEARCH.md sketch line 230) — same viewBox parsing logic, different output dimensions (pt instead of px).

---

### `packages/cora/src/renderer/renderToPDFHighQuality.ts` (renderer, transform via subprocess)

**Analog:** `packages/cora/src/renderer/renderToPNG.ts` (module shape only)

**Pattern to copy:** Same single-named-export shape and the `RenderToPNGOptions`-style `RenderToPDFOptions` interface. Body diverges entirely — see RESEARCH.md Pattern 4 (lines 393-419) for the Playwright sketch.

**Key constraint:** Must `import { chromium } from 'playwright'` at module top level so dynamic `await import('./renderToPDFHighQuality.js')` in `render.ts` is what triggers Playwright's lazy load (keeps resvg-only users from paying the cost).

---

### `packages/cora/src/renderer/pdf/pageSize.ts` (helper, pure transform)

**Analog:** `packages/cora/src/renderer/viewBox.ts` (sibling pure geometry helper)

**Module-shape pattern:** Single exported function returning a small typed record (`{x, y, width, height}` style), no I/O, no logging. Use RESEARCH.md Pattern 2 (lines 285-323) for the body — `PAGE_SIZES` table + `computePageGeometry`.

---

### `packages/cora/src/renderer/pdf/coords.ts` (helper, pure)

**Analog:** `packages/cora/src/renderer/utils.ts`

**Pattern:** One named export, pure function, no imports beyond types. See RESEARCH.md Pattern 3 (lines 334-346) for the body. Keep the Y-flip in this single file (Pitfall 3).

---

### `packages/cora/src/renderer/pdf/textOverlay.ts` (helper, IR walker)

**Analog:** `packages/cora/src/renderer/edges/EdgeLabel.tsx` (walks edge IR to produce label JSX). Same data source (`LayoutedDiagram`), same `node.label`, `edge.labelX`, `edge.labelY`, `group.x/width` accessors per `layout-ir.ts` lines 50-60.

**Pattern to follow:** Iterate `layouted.nodes`, then `layouted.edges`, then `layouted.groups`. For each, compute label position from IR (same accessors EdgeLabel uses) and emit a record `{x, y, text, font, size, color}` instead of JSX. Theme tokens come from `layouted.theme.nodeLabel` and `layouted.theme.edgeLabel` (see `layout-ir.ts` lines 17-29).

---

### `packages/cora/src/renderer/pdf/resvgCapture.ts` (helper, stderr wrapper)

**Analog:** `packages/cora/src/renderer/renderToPNG.ts` lines 90-103 (the Resvg invocation it wraps).

**Pattern:** Mirror renderToPNG's `renderToPNG()` body almost verbatim — same `new Resvg(svg, resvgOptions).render().asPng()` core — but wrapped in the stderr-capture block from RESEARCH.md Pitfall 2 (lines 466-484). Returns `{ png: Buffer, warnings: string[] }` instead of `Buffer`.

---

### `packages/cora/src/renderer/assets/fonts.ts` (refactor: extract shared helper)

**Analog (to extract from):** `packages/cora/src/renderer/renderToPNG.ts` lines 54-81 — the existing `resolveFontPath`, `fontBuffersCache`, and `renderFontBuffers` block.

**Exact code to lift** (renderToPNG.ts lines 54-81):
```typescript
function resolveFontPath(filename: string): string {
  const base = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(base, 'assets/fonts', filename),
    join(base, '../src/renderer/assets/fonts', filename),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Font not found: ${filename} (searched: ${candidates.join(', ')})`);
}

let fontBuffersCache: Buffer[] | undefined;

/** resvg-js does not load WOFF via fontFiles; pass buffers instead. */
function renderFontBuffers(): Buffer[] {
  if (!fontBuffersCache) {
    fontBuffersCache = [
      readFileSync(resolveFontPath('NotoSans-Regular.woff')),
      readFileSync(resolveFontPath('NotoSans-SemiBold.woff')),
    ];
  }
  return fontBuffersCache;
}
```

**Refactor action:**
1. Move this block verbatim into `renderer/assets/fonts.ts`, exporting `resolveFontPath`, `resvgFontBuffers` (rename `renderFontBuffers`), and add `pdfLibFontBuffers()` returning `{regular, semibold}` reading the new TTF files (see RESEARCH.md "Font path resolution" lines 573-601 — but reuse the existing 2-candidate path resolution shape, do NOT introduce the 3rd `../../src/...` candidate from the RESEARCH sketch unless tests prove it necessary).
2. In `renderToPNG.ts`, replace the lifted block with `import { resvgFontBuffers } from './assets/fonts.js';` and `fontBuffers: resvgFontBuffers()`.

**Build-asset constraint (Pitfall 1):** TTF files MUST live in `src/renderer/assets/fonts/` for the build's `cp -r src/renderer/assets dist/renderer/` to pick them up.

---

### `packages/cora/src/cli/paths.ts` (CLI helper, greenfield)

**Analog:** `packages/cora/src/cli/output.ts` (small, focused, named-exports-only CLI helper).

**Module-shape pattern** (output.ts lines 1-15):
```typescript
import pc from 'picocolors';

import type { StructuredError } from '../core/types.js';

export interface OutputOptions {
  format?: string;
}

/** True when --format json or stdout is not a TTY (CI / piped). */
export function isJsonOutput(opts: OutputOptions = {}): boolean {
  if (opts.format === 'json') {
    return true;
  }
  return !process.stdout.isTTY;
}
```
Match this style: top-level `const` exports for paths, plus small named functions like `chromiumInstalled()`. Body content per RESEARCH.md Pattern 4 (lines 362-376), but honor Pitfall 6 — do NOT use `env-paths` as source of truth on macOS/Linux; hardcode `$HOME/.config/cora/` per PROJECT.md.

---

### `packages/cora/src/cli/playwrightInstall.ts` (CLI helper, greenfield child_process)

**Analog:** `packages/cora/tests/render-golden.mjs` (only in-repo child_process call site) — minimal pattern only.

**`execFileSync` pattern from render-golden.mjs** (line 5, 60-62):
```javascript
import { execFileSync } from 'node:child_process';
// …
execFileSync(process.execPath, [cliPath, 'render', input, '-o', output], {
  stdio: 'pipe',
});
```
Phase 3 needs async `spawn` (long-running install with stdio inheritance / quiet pipe), not `execFileSync` — see RESEARCH.md Pattern 4 lines 378-391. The repo precedent confirms only: use `node:child_process`, pass an explicit `args[]` array (not a shell string), pass an explicit `env` object (V14 ASVS — RESEARCH.md line 743).

---

### `packages/cora/src/cli/commands/render.ts` (MODIFY) — extend extension dispatch

**Existing extension switch to extend** (render.ts lines 24-35):
```typescript
function outputFormat(path: string): 'svg' | 'png' {
  const ext = extname(path).toLowerCase();
  if (ext === '.png') {
    return 'png';
  }
  if (ext === '.svg' || ext === '') {
    return 'svg';
  }
  throw new Error(
    `Unsupported output extension "${ext}". Use .svg or .png (e.g. diagram.png).`,
  );
}
```
Extend to return `'svg' | 'png' | 'pdf'`, add `if (ext === '.pdf') return 'pdf';`, update error message.

**Existing option-registration pattern** (render.ts lines 37-53): Mirror existing `.option(...)` calls to add `--quality <level>` (with validation: only `high` is valid; absence = default), `--page <size>`, and rely on global `--yes` (already established Phase 1).

**Existing format-branch pattern** (render.ts lines 115-129):
```typescript
if (format === 'png') {
  try {
    resolvePngScale(options.size);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    program.error(message);
  }
  writeFileSync(
    options.output,
    renderToPNG(svg, { size: options.size as PngSize }),
  );
} else {
  writeFileSync(options.output, svg, 'utf8');
}
```
Add a third branch `else if (format === 'pdf') { … }` that:
1. Branches further on `options.quality === 'high'` — dynamic-import `./renderToPDFHighQuality.js` only in that branch (see RESEARCH.md "Architectural Responsibility Map" line 27).
2. Default branch calls `renderToPDF(layouted, svg, { page, margin, ciMode: process.env.CI === '1' || process.env.CI === 'true' })`.
3. Calls `writeFileSync(options.output, await renderToPDF(...))`.

**Existing error-shape pattern** (render.ts lines 130-152) — the `LayoutError` JSON branch is the template for the new `CHROMIUM_NOT_INSTALLED` JSON branch. Copy the structure:
```typescript
if (isJsonOutput({ format: options.format })) {
  process.stdout.write(
    JSON.stringify(
      [
        {
          code: 'LAYOUT_ERROR',
          path: '/diagram/layout',
          message,
        },
      ],
      null,
      2,
    ) + '\n',
  );
} else {
  console.error(pc.red(`✖ ${message}`));
}
process.exitCode = 1;
return;
```
Use `code: 'CHROMIUM_NOT_INSTALLED'`, `path: '/quality'`, message + suggestion per RESEARCH.md lines 544-551.

---

### `packages/cora/src/cli/output.ts` (MODIFY) — add `isNonInteractive`

**Insertion point:** Right after `isJsonOutput` (line 15).

**Existing predicate to mirror** (output.ts lines 9-15):
```typescript
/** True when --format json or stdout is not a TTY (CI / piped). */
export function isJsonOutput(opts: OutputOptions = {}): boolean {
  if (opts.format === 'json') {
    return true;
  }
  return !process.stdout.isTTY;
}
```
Add `isNonInteractive` and `shouldAutoInstall` in the same module-local style — see RESEARCH.md "Detecting non-interactive mode" lines 524-534. Reuse the existing `OutputOptions` interface from line 5.

---

### `packages/cora/src/renderer/assets/fonts/NotoSans-Regular.ttf` + `NotoSans-SemiBold.ttf` + `SOURCES.md`

**Analog:** sibling `NotoSans-Regular.woff`, `NotoSans-SemiBold.woff` (already in dir).

**Pattern:** Drop TTF files alongside existing WOFFs in `src/renderer/assets/fonts/`. The build script `tsdown && cp -r src/renderer/assets dist/renderer/` (per Pitfall 1) auto-publishes them. Add `SOURCES.md` in same dir documenting upstream commit/release per security mitigation table (RESEARCH.md line 744).

---

### `packages/cora/tests/pdf/*.test.ts` (NEW tests)

**Analog:** `packages/cora/tests/render-golden.mjs` (existing test harness).

**Existing harness pattern** (render-golden.mjs lines 5-19, 51-65):
```javascript
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, '..');
const repoRoot = join(packageRoot, '../..');
const cliPath = join(packageRoot, 'dist/cli.js');

function renderFixture(kind) {
  if (!existsSync(cliPath)) {
    throw new Error(`Build required: missing ${cliPath}. Run bun run build first.`);
  }
  const input = join(repoRoot, 'examples/valid', `${kind}.yaml`);
  const tmpDir = mkdtempSync(join(tmpdir(), 'cora-golden-'));
  const output = join(tmpDir, `${kind}.svg`);
  execFileSync(process.execPath, [cliPath, 'render', input, '-o', output], {
    stdio: 'pipe',
  });
  return readFileSync(output, 'utf8');
}
```
**Pattern application:**
- Reuse the `cliPath` + `execFileSync(process.execPath, [cliPath, 'render', …])` invocation pattern for any integration test that goes through the CLI.
- Reuse the `mkdtempSync(join(tmpdir(), 'cora-…-'))` per-test scratch dir convention.
- Reuse the `examples/valid/<kind>.yaml` fixture corpus already used by golden tests.
- Phase 3 introduces vitest (per RESEARCH.md Wave 0 line 718). New `tests/pdf/*.test.ts` files use vitest's `describe`/`it` but call the same `execFileSync` CLI pattern for integration tests; unit tests for `pageSize.ts`/`coords.ts` are direct function imports (no CLI).

---

## Shared Patterns

### Bundled-font resolution
**Source (current):** `packages/cora/src/renderer/renderToPNG.ts` lines 54-81 (inline).
**Refactor target:** `packages/cora/src/renderer/assets/fonts.ts`.
**Apply to:** `renderToPNG.ts`, `renderToPDF.ts`, `pdf/resvgCapture.ts`.
**Excerpt:** See "renderer/assets/fonts.ts" section above for the exact block to lift.

### Resvg invocation (font config)
**Source:** `packages/cora/src/renderer/renderToPNG.ts` lines 92-101.
**Apply to:** `renderToPDF.ts` (via `pdf/resvgCapture.ts`).
```typescript
const resvgOptions = {
  font: {
    fontBuffers: renderFontBuffers(),
    loadSystemFonts: false,
    defaultFontFamily: 'Noto Sans',
    sansSerifFamily: 'Noto Sans',
  },
} as ResvgRenderOptions;
const resvg = new Resvg(scaledSvg, resvgOptions);
```
`loadSystemFonts: false` is load-bearing for D-11 (warnings must fire for unknown families).

### JSON-vs-text error output (CLI)
**Source:** `packages/cora/src/cli/output.ts` lines 10-15 (`isJsonOutput`) + `packages/cora/src/cli/commands/render.ts` lines 132-150 (`LayoutError` JSON branch).
**Apply to:** Every new error path in `render.ts` PDF branch, especially `CHROMIUM_NOT_INSTALLED` and resvg-warning failures.

### Output-file writing
**Source:** `packages/cora/src/cli/commands/render.ts` lines 114, 123-128.
```typescript
mkdirSync(dirname(options.output), { recursive: true });
// …
writeFileSync(options.output, renderToPNG(svg, …));
```
**Apply to:** Both PDF render paths (default + high-quality).

### Module/export shape for renderer pure functions
**Source:** `packages/cora/src/renderer/renderToPNG.ts` (file shape: one `RenderToXOptions` interface + one `renderToX(svg, options)` named export).
**Apply to:** `renderToPDF.ts`, `renderToPDFHighQuality.ts`.

### Small CLI-helper module shape
**Source:** `packages/cora/src/cli/output.ts` (interface + 1-3 named exports, no default export, no class).
**Apply to:** `cli/paths.ts`, `cli/playwrightInstall.ts`, additions to `cli/output.ts`.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `packages/cora/src/cli/playwrightInstall.ts` (spawn + TTY prompt logic) | CLI helper | event-driven | No async `spawn`-with-TTY-prompt pattern exists yet in `src/`. Tests use `execFileSync` but that's sync + no prompt. Planner should treat the spawn body (RESEARCH.md lines 378-391) as net-new and add a unit test that mocks `spawn`. |
| `packages/cora/src/cli/paths.ts` (XDG / `%LOCALAPPDATA%` resolution) | CLI helper | config | No cross-platform path resolution exists in repo yet. Greenfield. |
| `vitest.config.ts` (Wave 0 framework introduction) | config | n/a | Repo currently has no vitest config; existing tests are bespoke `.mjs` scripts under `tests/`. Planner picks config shape from vitest defaults. |
| TTY confirm prompt (`promptUser` in RESEARCH.md line 561) | CLI helper | request-response | No `readline`/prompt utility exists in repo. Greenfield — planner picks lib (`@inquirer/prompts` or `node:readline/promises`). |

## Metadata

**Analog search scope:** `packages/cora/src/`, `packages/cora/tests/`, `packages/cora/src/renderer/**`, `packages/cora/src/cli/**`.
**Files scanned:** 38 (full TS file listing under `packages/cora/src` + tests directory).
**Pattern extraction date:** 2026-05-22.
