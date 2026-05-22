# Phase 3: PDF Export - Research

**Researched:** 2026-05-22
**Domain:** Vector PDF generation from SVG; lazy browser binary management
**Confidence:** HIGH on default path (pdf-lib + resvg, verified APIs and code paths); MEDIUM on Playwright lazy-install plumbing (single supported API surface — spawn `npx playwright install` — but rarely documented for app-vendor use cases)

## Summary

The phase has two render paths that share zero code beyond the SVG string and the layouted IR. The **default path** combines two well-understood libraries: `@resvg/resvg-js@~2.6.2` (already bundled) for vector/shape rasterisation, and `pdf-lib@1.17.1` + `@pdf-lib/fontkit@1.1.1` for selectable-text overlay. The single non-obvious decision is to **bypass SVG re-parsing entirely** and drive the PDF writer directly from `LayoutedDiagram` (the IR that Phase 2's renderer already exposes via `computeLayout`). The IR has absolute node positions, edge label positions, group positions, and theme tokens — everything pdf-lib needs to emit text objects at coordinates that match the SVG within fractional points.

The **`--quality=high` path** uses `playwright-core` plus a child-process call to the `playwright` CLI's `install chromium` subcommand, with `PLAYWRIGHT_BROWSERS_PATH` pointing at Cora's cache directory. Vendoring `playwright` (not `playwright-core`) is required at install time because only the `playwright` package ships the `install` CLI; the postinstall browser download is disabled with `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` in the consumer's npm environment. This keeps `npm install cora` fast while preserving a single supported install entry point.

The two highest-risk items are: (1) Noto Sans embedding — fontkit *does* parse WOFF, but the bundled font files are needed in a path pdf-lib can read at runtime (currently they only ship to `dist/renderer/assets/` per the build script), and (2) resvg font warnings — they come out on stderr at `logLevel: 'warn'` with no programmatic hook, so CI detection requires piping stderr through a Node `Writable` and string-matching.

**Primary recommendation:** Build `renderToPDF(layouted: LayoutedDiagram, options)` as a sibling to `renderToSVG` and `renderToPNG`. Drive vector shapes by rasterising a *text-stripped* SVG through resvg-js → PNG → `embedPng` background layer; drive text by walking the IR and emitting `drawText` calls with Y-flipped coordinates. Add TTF variants of Noto Sans to `assets/fonts/` (current WOFF works for fontkit, but TTF is the universally-tested format for pdf-lib and avoids a class of "did fontkit's WOFF inflater regress in this version" bugs).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Extension dispatch (`.pdf`) | CLI (`render.ts`) | — | Existing `outputFormat()` already owns `.svg`/`.png` — `.pdf` is the same shape |
| Default PDF assembly | Renderer (`renderToPDF.ts`) | — | Pure function of `LayoutedDiagram` + SVG string, no I/O beyond reading bundled fonts (mirrors `renderToPNG`) |
| Vector shape rasterisation | Renderer (resvg-js) | — | Reuse Phase 2's `Resvg` + `fontBuffers` plumbing; same code path as PNG export |
| Text-as-text overlay | Renderer (pdf-lib) | — | New responsibility; coordinate translation lives here |
| Page sizing / scale-to-fit | Renderer (helper in `renderToPDF.ts`) | — | Pure math over IR dimensions; no CLI concerns |
| Playwright lazy install | CLI (`highQualityInstall.ts`) | — | Touches filesystem + child_process + TTY prompt — strictly a CLI concern |
| `--quality=high` render | Renderer (`renderToPDFHighQuality.ts`) | CLI (lazy-imports it) | Render is pure; CLI controls when to dynamic-import it |
| Cache path resolution | CLI (`paths.ts` helper) | Renderer (consumes path) | Cross-platform XDG/`%LOCALAPPDATA%` resolution; reused by Phase 5/6 too |
| Non-interactive predicate | CLI (`output.ts` extension) | — | Already half-implemented as `isJsonOutput`; extend to `isNonInteractive` |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `pdf-lib` | `^1.17.1` (Apr 2022, current latest) | PDF document assembly, text, image embedding | Pure-JS, zero native deps, the de facto pdf-lib choice; same library `cora`'s STACK.md already names [CITED: STACK.md] |
| `@pdf-lib/fontkit` | `^1.1.1` (Apr 2022, current latest) | Custom font (TTF/OTF/WOFF) embedding for pdf-lib | Required to `registerFontkit()` before `embedFont` accepts non-Standard14 fonts [CITED: pdf-lib.js.org] |
| `@resvg/resvg-js` | `~2.6.2` (already installed, exact-minor pinned) | SVG → PNG rasterisation for vector layer | Already vetted in Phase 2; same WOFF/font-buffer plumbing [VERIFIED: codebase] |
| `playwright` | `^1.60.0` (current latest as of 2026-01) | Headless Chromium for high-quality PDF | The `playwright` package ships the `install` CLI; `playwright-core` does not (despite STACK.md's earlier note — see Alternatives below) [VERIFIED: npm registry + npmjs.com/package/playwright docs] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `env-paths` | `^4.0.0` | Cross-platform cache dir resolution | When computing `$HOME/.config/cora/browsers/` on Linux/mac and `%LOCALAPPDATA%/cora/browsers/` on Windows [VERIFIED: npm registry] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pdf-lib + text overlay | `svg-to-pdfkit` | Re-parses SVG in pure JS, poor fidelity on complex paths, no resvg-style font rendering — already rejected in STACK.md [CITED: STACK.md] |
| pdf-lib + text overlay | Vector-translate SVG paths via `pdfkit` | Larger surface area, similar fidelity gap as svg-to-pdfkit |
| `playwright` package | `playwright-core` (STACK.md's preference) | `playwright-core` does NOT ship the `install` CLI. Lazy installation requires either (a) the `playwright` package, or (b) reimplementing the Chromium-binary downloader, which is fragile across Playwright versions. **Recommendation: amend STACK.md to use `playwright`, paired with `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` in the published package's environment to skip postinstall.** [VERIFIED: WebSearch + playwright.dev/docs/browsers] |
| `env-paths` | Hand-rolled XDG resolution | env-paths is 4KB and exactly does this; hand-rolling is a code-review hazard for cross-platform path correctness |

**Installation:**

```bash
bun add pdf-lib @pdf-lib/fontkit playwright env-paths
```

**Critical env-var for clean install:**

```json
// packages/cora/package.json — add to allow `playwright` postinstall to be a no-op
{
  "scripts": {
    "postinstall": "echo \"playwright browser binaries are downloaded on first --quality=high use\""
  }
}
```

The downstream consumer running `npm install cora` will hit Playwright's postinstall script unless we set `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`. Two options:

1. Ship a `.npmrc` in the published package: `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` (most reliable).
2. Vendor `playwright` as an `optionalDependencies` entry — only installed if not blocked; risky because CI users may have `--no-optional` set.

**Recommendation:** ship `.npmrc` with `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`. Verify by `npm install cora` in a clean dir and confirming no `~/.cache/ms-playwright` directory appears. [VERIFIED: playwright.dev/docs/browsers]

**Version verification:** All four runtime packages confirmed via `npm view <pkg> version`:

| Package | Verified Version | Published | Status |
|---------|------------------|-----------|--------|
| `pdf-lib` | 1.17.1 | 2022-05 | Stable (no newer release; widely used) |
| `@pdf-lib/fontkit` | 1.1.1 | 2022-04 | Stable (sister module to pdf-lib; no newer release) |
| `@resvg/resvg-js` | 2.6.2 | 2024-03 | Already installed; `2.7.0-alpha.x` is prerelease, ignore |
| `playwright` | 1.60.0 | 2026 (current latest) | Stable |
| `env-paths` | 4.0.0 | Current latest | Stable |

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `pdf-lib` | npm | 9 yrs | ~700k/wk | github.com/Hopding/pdf-lib | not run (unavailable in env) | Approved — well-known, widely used, named in STACK.md [ASSUMED slopcheck — confirm at planner gate] |
| `@pdf-lib/fontkit` | npm | 4 yrs | ~600k/wk | github.com/Hopding/pdf-lib | not run | Approved — official sister package under same author/org [ASSUMED slopcheck] |
| `playwright` | npm | 6 yrs | ~10M/wk | github.com/microsoft/playwright | not run | Approved — Microsoft-maintained [ASSUMED slopcheck] |
| `env-paths` | npm | 8 yrs | ~80M/wk | github.com/sindresorhus/env-paths | not run | Approved — sindresorhus, ubiquitous [ASSUMED slopcheck] |

slopcheck was not available in this research environment. Planner should add a `checkpoint:human-verify` task before the first install command runs, OR run slopcheck during plan execution. None of the packages above carry the typical slop signals (all multi-year-old, multi-million-weekly-download, source repo visible, no suspicious postinstall scripts beyond Playwright's documented Chromium download).

## Architecture Patterns

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│ cora render diagram.yaml -o out.pdf [--quality=high] [--page=a4]   │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                               ▼
                  ┌───────────────────────────┐
                  │ render.ts CLI command     │
                  │ outputFormat() ext switch │
                  └───────────────┬───────────┘
                                  │ .pdf
                                  ▼
       ┌──────────────────────────────────────────────┐
       │ parseFile → validate → measure → layout      │
       │ → renderToSVG(layouted) → svg string         │
       │ (shared with .svg / .png paths)              │
       └──────────────────────────┬───────────────────┘
                                  │
            ┌─────────────────────┴────────────────────┐
            │                                          │
            │  --quality=high                          │ default (no flag)
            │                                          │
            ▼                                          ▼
┌────────────────────────────┐         ┌──────────────────────────────────┐
│ Chromium presence check    │         │ renderToPDF(layouted, svg, opts) │
│  ↓ missing + non-TTY +     │         │                                  │
│   no --yes / CORA_AUTO… ?  │         │ 1. Strip <text> from svg →       │
│   → exit CHROMIUM_NOT_…    │         │    svgVectorOnly                 │
│  ↓ missing + interactive   │         │ 2. resvg(svgVectorOnly) → PNG    │
│   → prompt + install       │         │    (with logLevel:'warn' capture)│
│  ↓ present                 │         │ 3. PDFDocument.create()          │
│                            │         │ 4. registerFontkit(fontkit)      │
│ spawn `npx playwright      │         │ 5. embedFont(NotoSans regular +  │
│  install chromium` with    │         │    semibold)                     │
│  PLAYWRIGHT_BROWSERS_PATH  │         │ 6. compute page bbox (fit-to-    │
│  =<cora cache dir>         │         │    content + margin OR --page)   │
└──────────────┬─────────────┘         │ 7. addPage([w,h])                │
               │                       │ 8. drawImage(png) full-bleed     │
               ▼                       │ 9. for each layouted node/edge/  │
┌────────────────────────────┐         │    group label:                  │
│ chromium.launch({          │         │      drawText(label, {           │
│   executablePath: …,       │         │        x: ir.x + offset,         │
│   headless: true })        │         │        y: pageH - ir.y - offset, │
│ page.setContent(<html      │         │        font: regular|semibold,   │
│   wrapping svg, print-     │         │        size: theme.fontSize })   │
│   media CSS>)              │         │ 10. doc.save() → write file      │
│ page.pdf({                 │         └──────────────┬───────────────────┘
│   width: '<w>pt',          │                        │
│   height: '<h>pt',         │                        │
│   printBackground:true })  │                        │
└──────────────┬─────────────┘                        │
               │                                      │
               └──────────────────┬───────────────────┘
                                  ▼
                       ┌────────────────────┐
                       │ writeFileSync(.pdf)│
                       └────────────────────┘
                                  │
                                  ▼
                       resvg warnings captured?
                                  │
                                  ▼
                       CI && warnings ? exit 1
```

Data flow: YAML enters the CLI; the existing parse→validate→layout pipeline produces `LayoutedDiagram` + an SVG string; `.pdf` extension routes to either the default writer (which uses both IR and SVG) or the high-quality writer (which uses only the SVG); both end at `writeFileSync`. The resvg warning capture wraps the default-path rasterisation and influences the process exit code.

### Recommended Project Structure

```
packages/cora/src/
├── cli/
│   ├── commands/
│   │   └── render.ts          # extend outputFormat() to include 'pdf'
│   ├── paths.ts               # NEW: env-paths wrapper, cora cache dir
│   ├── output.ts              # extend: isNonInteractive() predicate
│   └── playwrightInstall.ts   # NEW: lazy install + prompt + JSON-error
└── renderer/
    ├── renderToPDF.ts                  # NEW: default path (resvg + pdf-lib)
    ├── renderToPDFHighQuality.ts       # NEW: Playwright path (dynamic import)
    ├── pdf/
    │   ├── pageSize.ts                 # PAGE_SIZES table, fit-to-content, scale-to-fit
    │   ├── coords.ts                   # SVG y-down → PDF y-up helpers
    │   └── textOverlay.ts              # walk LayoutedDiagram → text emit list
    └── assets/fonts/
        ├── NotoSans-Regular.woff       # existing — keep for resvg
        ├── NotoSans-SemiBold.woff      # existing — keep for resvg
        ├── NotoSans-Regular.ttf        # NEW — pdf-lib via fontkit
        └── NotoSans-SemiBold.ttf       # NEW — pdf-lib via fontkit
```

### Pattern 1: Drive PDF text from the IR, not from the SVG

**What:** Walk `LayoutedDiagram.nodes`, `.edges`, `.groups` and emit `drawText` calls. Never reach into the SVG string for text positions.

**When to use:** Always, for the default PDF path. The IR holds the same coordinates the renderer used to emit `<text>` elements — re-deriving them from the SVG by xml-parsing is duplicate work that drifts from the renderer.

**Why:** Phase 2's renderer (`packages/cora/src/renderer/Diagram.tsx`, `nodes/*.tsx`, `edges/EdgeLabel.tsx`) computes label positions from `node.x + node.measuredWidth/2`, `edge.labelX/labelY`, `group.x + group.width/2`. The IR is the source of truth; the SVG is one consumer of it. The PDF writer is a second, parallel consumer.

**Example:**
```typescript
// renderToPDF.ts (sketch)
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { readFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import type { LayoutedDiagram, LayoutedNode } from '../layout-ir.js';

export interface PdfOptions {
  page?: 'a4' | 'letter' | 'a4-portrait' | 'letter-portrait';
  margin?: number;              // points; default 24
  ciMode?: boolean;             // if true, resvg warnings → throw
}

export async function renderToPDF(
  layouted: LayoutedDiagram,
  svg: string,
  options: PdfOptions = {},
): Promise<Uint8Array> {
  const margin = options.margin ?? 24;
  const { pageW, pageH, scale, offsetX, offsetY } = computePageGeometry(layouted, options);

  // 1. Strip <text> from SVG so resvg only rasterises shapes/paths
  const svgVectorOnly = svg.replace(/<text\b[^>]*>[\s\S]*?<\/text>/g, '');
  const svgScaled = scaleSvgToPage(svgVectorOnly, scale);

  // 2. Rasterise vector layer (capture stderr warnings, see Pitfall 2)
  const { png, warnings } = rasteriseWithWarningCapture(svgScaled, {
    fontBuffers: loadResvgFontBuffers(),
    defaultFontFamily: 'Noto Sans',
    loadSystemFonts: false,
    logLevel: 'warn',
  });
  if (options.ciMode && warnings.length > 0) {
    throw new Error(`resvg font warnings in CI mode: ${warnings.join('; ')}`);
  }

  // 3. Build PDF
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const [regular, semibold] = await Promise.all([
    doc.embedFont(readFileSync(resolveFontPath('NotoSans-Regular.ttf'))),
    doc.embedFont(readFileSync(resolveFontPath('NotoSans-SemiBold.ttf'))),
  ]);
  const page = doc.addPage([pageW, pageH]);
  const image = await doc.embedPng(png);
  page.drawImage(image, { x: offsetX, y: offsetY, width: image.width / 2, height: image.height / 2 });
  // ^ image was rasterised at 2× for quality; downscale to page coords

  // 4. Walk IR for text
  for (const node of layouted.nodes) {
    const { fontSize, fontWeight, fill } = layouted.theme.nodeLabel;
    const font = fontWeight >= 600 ? semibold : regular;
    const textWidth = font.widthOfTextAtSize(node.label, fontSize);
    const px = offsetX + (node.x + node.measuredWidth / 2 - textWidth / 2) * scale;
    const py = pageH - (offsetY + (node.y + node.measuredHeight / 2 + fontSize / 2) * scale);
    // ^ Y-flip: SVG y-down → PDF y-up; baseline lives slightly below visual centre
    page.drawText(node.label, { x: px, y: py, font, size: fontSize * scale, color: hexToRgb(fill) });
  }
  for (const edge of layouted.edges) {
    if (!edge.label || edge.labelX == null || edge.labelY == null) continue;
    // … same pattern with theme.edgeLabel
  }
  for (const group of layouted.groups ?? []) {
    // … group title at top-centre
  }

  return doc.save();
}
```

### Pattern 2: Scale-to-fit single page

**What:** When `--page` is set, compute a uniform scale so the diagram fits inside `(pageW - 2*margin, pageH - 2*margin)`, then centre.

**Why:** D-03 forbids multi-page tiling in v1. Single-page scale is the only correct fallback for diagrams larger than the requested page.

**Example:**
```typescript
// renderer/pdf/pageSize.ts
export const PAGE_SIZES: Record<string, [number, number]> = {
  // points (1 inch = 72 pt). Width × Height.
  'a4':              [841.89, 595.28],   // landscape
  'a4-portrait':     [595.28, 841.89],
  'letter':          [792, 612],         // landscape
  'letter-portrait': [612, 792],
};
// All values verified against ISO 216 (A4 = 210×297mm = 595.28×841.89pt)
// and ANSI/ASME Y14.1 (Letter = 8.5×11in = 612×792pt). [CITED: pdf-lib.js.org PageSizes, ISO 216]

export function computePageGeometry(
  layouted: LayoutedDiagram,
  opts: PdfOptions,
): { pageW: number; pageH: number; scale: number; offsetX: number; offsetY: number } {
  const margin = opts.margin ?? 24;
  if (!opts.page) {
    // fit-to-content
    return {
      pageW: layouted.width + margin * 2,
      pageH: layouted.height + margin * 2,
      scale: 1,
      offsetX: margin,
      offsetY: margin,
    };
  }
  const [pageW, pageH] = PAGE_SIZES[opts.page];
  const usableW = pageW - margin * 2;
  const usableH = pageH - margin * 2;
  const scale = Math.min(usableW / layouted.width, usableH / layouted.height, 1);
  const scaledW = layouted.width * scale;
  const scaledH = layouted.height * scale;
  return {
    pageW, pageH, scale,
    offsetX: (pageW - scaledW) / 2,
    offsetY: (pageH - scaledH) / 2,
  };
}
```

### Pattern 3: Coordinate Y-flip in one place

**What:** SVG uses y-down origin-at-top-left. PDF uses y-up origin-at-bottom-left. Convert once, at the drawing-call site.

**When to use:** Every `drawText` and `drawImage` call in the default PDF writer.

**Formula:** `pdfY = pageHeight - (svgY + svgHeight)` for objects with a bounding box; `pdfY = pageHeight - svgY - fontBaselineOffset` for text. Encapsulate in a single `svgToPdfCoords(layouted, pageH, scale, offset)` helper.

**Example:**
```typescript
// renderer/pdf/coords.ts
export function svgToPdf(
  svgX: number, svgY: number,
  pageH: number, scale: number,
  offsetX: number, offsetY: number,
): { x: number; y: number } {
  return {
    x: offsetX + svgX * scale,
    y: pageH - (offsetY + svgY * scale),
  };
}
```

### Pattern 4: Lazy-install Chromium via vendored CLI

**What:** Spawn `playwright install chromium` as a child process with `PLAYWRIGHT_BROWSERS_PATH` pointed at the cora cache dir. After install, locate the chromium executable via `chromium.executablePath()` (set by the env var).

**When to use:** Only on first `--quality=high` invocation. Cache directory presence is the install marker.

**Example:**
```typescript
// cli/playwrightInstall.ts
import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import envPaths from 'env-paths';

const paths = envPaths('cora', { suffix: '' });
// Linux/mac → ~/.config/cora
// Windows  → %APPDATA%/cora/Config
// env-paths uses XDG_CONFIG_HOME on Linux/mac. We override to match STATE.md:
export const CORA_CONFIG_DIR =
  process.env.CORA_CONFIG_DIR ??
  (process.platform === 'win32'
    ? join(process.env.LOCALAPPDATA ?? paths.cache, 'cora')
    : join(process.env.HOME ?? '~', '.config', 'cora'));

export const CHROMIUM_DIR = join(CORA_CONFIG_DIR, 'browsers');

export function chromiumInstalled(): boolean {
  return existsSync(CHROMIUM_DIR) && readdirSync(CHROMIUM_DIR).length > 0;
}

export async function installChromium(opts: { quiet: boolean }): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      'npx',
      ['playwright', 'install', 'chromium'],
      {
        env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: CHROMIUM_DIR },
        stdio: opts.quiet ? 'pipe' : 'inherit',
      },
    );
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`playwright install exited ${code}`)));
  });
}
```

```typescript
// renderer/renderToPDFHighQuality.ts (dynamic-imported by CLI on demand)
import { chromium } from 'playwright';
import { CHROMIUM_DIR } from '../cli/playwrightInstall.js';

export async function renderToPDFHighQuality(svg: string, opts: PdfOptions): Promise<Buffer> {
  process.env.PLAYWRIGHT_BROWSERS_PATH = CHROMIUM_DIR;
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const { pageW, pageH } = computePageGeometry(/* … */);
    const html = `<!doctype html>
<html><head><style>
  @page { size: ${pageW}pt ${pageH}pt; margin: 0; }
  html, body { margin: 0; padding: 0; }
  svg { display: block; width: ${pageW}pt; height: ${pageH}pt; }
</style></head><body>${svg}</body></html>`;
    await page.setContent(html, { waitUntil: 'networkidle' });
    return await page.pdf({
      width: `${pageW}pt`, height: `${pageH}pt`,
      printBackground: true, preferCSSPageSize: true,
    });
  } finally {
    await browser.close();
  }
}
```

### Anti-Patterns to Avoid

- **Parsing the SVG to find text coordinates.** The IR has them; SVG parsing is a regression vector and adds a `sax`/`xmldom` dependency.
- **Embedding the SVG into pdf-lib via `embedSvg`.** pdf-lib does **not** ship SVG vector support — only PNG/JPG embed. Don't search for one.
- **Using `playwright-core` for lazy install.** It does not ship the `install` CLI. You'd have to reimplement the binary downloader.
- **Skipping the `<text>`-stripping step before resvg.** If resvg renders text, you get two overlapping text layers (one raster, one selectable) which looks blurry and breaks copy-paste anchor consistency.
- **Drawing image at full PNG resolution.** The PNG is rasterised at 2× for crispness; you must downscale when calling `drawImage`, or the image overflows the page.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF structure (xref, trailer, streams) | A pure-JS PDF writer | `pdf-lib` | PDF is a 1000-page spec with surprising edge cases (font subsetting, cross-reference streams, encryption stubs) |
| Custom font embedding in PDF | A CFF/TrueType parser | `@pdf-lib/fontkit` | Font subsetting + cmap building is its own discipline; getting it wrong breaks text searchability |
| SVG → raster conversion | A canvas-based path rasteriser | `@resvg/resvg-js` (already in stack) | Already handled by Phase 2; reusing is free correctness |
| Chromium binary download | `https.get` + tar extraction | `playwright install chromium` CLI | Playwright tracks Chromium revision pinning, channel updates, and platform-specific binaries |
| Cross-platform cache paths | `path.join` + `os.homedir` heuristics | `env-paths` (with manual XDG override for our naming) | Windows `%LOCALAPPDATA%` semantics, macOS XDG-vs-Library nuances |
| Page-size lookup | Inline width/height numbers in CLI parser | `PAGE_SIZES` table in `renderer/pdf/pageSize.ts` | Reused by both default and high-quality paths; single source of truth |

**Key insight:** Phase 3's heaviest temptation is to write "a small SVG-to-PDF converter." Every project that does this regrets it within 6 months. The chosen split — resvg for vector, pdf-lib + IR for text — sidesteps every known SVG-translation bug class.

## Runtime State Inventory

Phase 3 is greenfield — adds new files, adds new CLI options, does not rename anything. No runtime state inventory required.

## Common Pitfalls

### Pitfall 1: pdf-lib font path must work in both `src/` (dev) and `dist/` (production)

**What goes wrong:** `renderToPNG.ts` already solves this for WOFF files via the `resolveFontPath` helper with `src/` + `dist/` candidates. The build script (`packages/cora/package.json:scripts.build`) is `tsdown && cp -r src/renderer/assets dist/renderer/`. New TTF files must be in `src/renderer/assets/fonts/` for tsdown's `cp` to pick them up.

**Why it happens:** Forget to add TTF files to `src/`, build "works" because nothing complains at compile time, but `bun run cora render -o foo.pdf` from the dist build crashes with `ENOENT` only on the first PDF render.

**How to avoid:** (1) Reuse the existing `resolveFontPath` helper from `renderToPNG.ts` — refactor it into `renderer/assets/fonts.ts` and import from both writers. (2) Add a smoke test: `fs.existsSync` for every font file in `dist/renderer/assets/fonts/` after build. (3) Run `bun run build && node dist/cli.js render examples/valid/minimal.yaml -o /tmp/smoke.pdf` in CI.

**Warning signs:** Tests pass locally with `bun run cora` (which executes from `src/`) but `npm pack` artefacts fail with font-not-found.

### Pitfall 2: resvg warnings only surface on stderr, not in the API

**What goes wrong:** resvg-js has no `warnings` property on `RenderedImage`. The `logLevel: 'warn'` option enables console output but provides no callback or accumulator. CI detection of "did font fallback happen?" requires capturing stderr.

**Why it happens:** resvg-js is a thin wrapper over the Rust crate; warnings flow through Rust's `log` crate into stderr, never through the napi boundary back to JS. [VERIFIED: WebFetch of index.d.ts]

**How to avoid:** Wrap the `new Resvg(...).render()` call inside a function that redirects `process.stderr.write` to a string accumulator, runs the render, restores stderr, and inspects the captured string for `No match for font-family`. Pattern:

```typescript
// renderer/pdf/resvgCapture.ts
export function rasteriseWithWarningCapture(svg: string, opts: ResvgRenderOptions): { png: Buffer; warnings: string[] } {
  const warnings: string[] = [];
  const originalWrite = process.stderr.write.bind(process.stderr);
  process.stderr.write = ((chunk: string | Uint8Array, ...rest: any[]) => {
    const text = typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
    if (/No match for font-family|warn/i.test(text)) warnings.push(text.trim());
    return originalWrite(chunk, ...rest);
  }) as typeof process.stderr.write;
  try {
    const resvg = new Resvg(svg, { ...opts, logLevel: 'warn' });
    const png = resvg.render().asPng();
    return { png, warnings };
  } finally {
    process.stderr.write = originalWrite;
  }
}
```

**Warning signs:** PDF text overlay sits correctly but the rasterised background shows wrong glyphs at high zoom. Or worse — only catches in visual diff review (per PITFALLS.md #3).

### Pitfall 3: Coordinate Y-flip applied in two places

**What goes wrong:** You apply `pageH - y` in the helper, then again in the call site, getting upside-down text. Or you apply scale before flip, when you should flip after scale.

**How to avoid:** Make a single `svgToPdf(x, y, ctx)` helper (Pattern 3 above). Never inline the formula at a call site. Write a unit test: `svgToPdf(0, 0, {pageH:100, scale:1, ox:0, oy:0}) === {x:0, y:100}`.

### Pitfall 4: Playwright postinstall fires on `npm install cora`

**What goes wrong:** The user runs `npm install cora`, npm runs Playwright's postinstall, which downloads ~170MB of Chromium to their global cache — defeating the entire "lazy install" requirement (EXP-05).

**How to avoid:** Ship a `.npmrc` in the published `cora` package with:
```
playwright_skip_browser_download=1
```
(env-var equivalent, npm reads `.npmrc` as kebab-case env). Confirm with a clean-install integration test that asserts `~/.cache/ms-playwright` does not appear after `npm install cora`.

**Warning signs:** Phase 3 CI green, but a user reports `npm install cora` taking 90 seconds.

### Pitfall 5: `--quality=high` HTML harness layout drift

**What goes wrong:** Chromium renders the SVG inside `<body>`, applies default `body { margin: 8px }`, and the PDF has a white border that doesn't match the resvg path.

**How to avoid:** Always emit a `<style>` with explicit reset: `html, body { margin: 0; padding: 0 }` and use `@page { size: <w>pt <h>pt; margin: 0 }`. Test by overlaying a default and high-quality PDF of the same diagram in a pixel diff tool and asserting < 1% delta.

### Pitfall 6: env-paths returns the wrong directory layout vs PROJECT.md

**What goes wrong:** `env-paths('cora')` returns `~/Library/Application Support/cora-nodejs/` on macOS, not `~/.config/cora/`. PROJECT.md mandates `$HOME/.config/cora/`.

**How to avoid:** Don't use `env-paths` as the source of truth — use it only for Windows. Hardcode the Linux/mac path to `$HOME/.config/cora/` per PROJECT.md. See `cli/paths.ts` sketch in Pattern 4.

## Code Examples

### Detecting non-interactive mode (extending `output.ts`)

```typescript
// cli/output.ts (extend existing module)
export function isNonInteractive(opts: OutputOptions = {}): boolean {
  if (opts.format === 'json') return true;
  if (process.env.CI === '1' || process.env.CI === 'true') return true;
  if (!process.stdout.isTTY) return true;
  return false;
}

export function shouldAutoInstall(flags: { yes?: boolean }): boolean {
  return flags.yes === true || process.env.CORA_AUTO_INSTALL === '1';
}
```

### CHROMIUM_NOT_INSTALLED JSON error

```typescript
// In render.ts CLI command, --quality=high branch
if (!chromiumInstalled()) {
  if (shouldAutoInstall(globalFlags)) {
    await installChromium({ quiet: isNonInteractive({ format: options.format }) });
  } else if (isNonInteractive({ format: options.format })) {
    const err = {
      code: 'CHROMIUM_NOT_INSTALLED' as const,
      path: '/quality',
      message:
        'Chromium is required for --quality=high but is not installed. ' +
        'Pass --yes, set CORA_AUTO_INSTALL=1, or run interactively to accept the install prompt.',
      suggestion: `cora render … --quality=high --yes  (downloads Chromium to ${CHROMIUM_DIR})`,
    };
    if (isJsonOutput({ format: options.format })) {
      process.stdout.write(JSON.stringify([err], null, 2) + '\n');
    } else {
      console.error(pc.red(`✖ ${err.message}`));
    }
    process.exitCode = 1;
    return;
  } else {
    // interactive TTY path
    const confirmed = await promptUser(
      `Cora needs to download Chromium (~170MB) to ${CHROMIUM_DIR}. Proceed?`,
    );
    if (!confirmed) { process.exitCode = 1; return; }
    await installChromium({ quiet: false });
  }
}
```

### Font path resolution (refactor to shared helper)

```typescript
// renderer/assets/fonts.ts (NEW; both renderToPNG and renderToPDF import)
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const base = dirname(fileURLToPath(import.meta.url));

export function resolveFontPath(filename: string): string {
  for (const candidate of [
    join(base, '../assets/fonts', filename),       // dist/renderer/foo.js → dist/renderer/assets/fonts/
    join(base, 'assets/fonts', filename),          // dist/renderer/assets/fonts/ flat
    join(base, '../../src/renderer/assets/fonts', filename), // dev (tsx)
  ]) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(`Font not found: ${filename}`);
}

export const fontBuffers = {
  resvgWoff: () => [
    readFileSync(resolveFontPath('NotoSans-Regular.woff')),
    readFileSync(resolveFontPath('NotoSans-SemiBold.woff')),
  ],
  pdfLibTtf: () => ({
    regular: readFileSync(resolveFontPath('NotoSans-Regular.ttf')),
    semibold: readFileSync(resolveFontPath('NotoSans-SemiBold.ttf')),
  }),
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `svg-to-pdfkit` (re-parse SVG paths in JS) | resvg + pdf-lib hybrid (raster vector + text overlay) | ~2021 onward as resvg-js stabilised | Higher fidelity, ~3× faster, no SVG-feature gaps |
| `puppeteer` for HTML→PDF | `playwright` | ~2023 community converged | Same capability; better API; Microsoft-backed |
| Bundled Chromium at install | Lazy download via `playwright install` CLI | 2022 with `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` | Keeps `npm install` fast for tools that only sometimes need a browser |
| `tsup` for library bundling | `tsdown` | Nov 2025 (tsup maintenance-only) | Already adopted in repo |

**Deprecated/outdated:**
- `playwright-core` for lazy install — does not ship `install` CLI. STACK.md's recommendation needs amendment for this phase.
- `puppeteer-extra` plugin ecosystem — irrelevant here; we're not scraping.

## Project Constraints (from CLAUDE.md)

No `./CLAUDE.md` file exists in the project root (verified by `cat`). No project-level skill directory found at `.claude/skills/` or `.agents/skills/`. No additional constraints beyond those in CONTEXT.md / STATE.md / PROJECT.md.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EXP-02 | `cora render -o out.pdf` produces PDF via bundled resvg + pdf-lib (default) | Pattern 1, 2, 3; renderToPDF.ts sketch; existing resvg plumbing in renderToPNG.ts |
| EXP-03 | `--quality=high` uses Playwright for high-fidelity PDF | Pattern 4; renderToPDFHighQuality.ts sketch |
| EXP-04 | First `--quality=high` use prompts to download Chromium to `$HOME/.config/cora/browsers/` | playwrightInstall.ts + paths.ts sketch; CHROMIUM_NOT_INSTALLED JSON error |
| EXP-05 | resvg PDF path works on normal `npm install` without extra browser deps | `.npmrc` with `playwright_skip_browser_download=1`; pdf-lib + fontkit are pure JS, no native deps |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | pdf-lib's `embedFont` reliably accepts WOFF via fontkit | Standard Stack | Low — we're shipping TTF anyway as the primary path; WOFF is fallback. [ASSUMED based on fontkit's documented format list] |
| A2 | `playwright install chromium` exits non-zero on download failure (network, disk full) | Pattern 4 | Medium — if it silently succeeds with no binary, our `chromiumInstalled()` check still catches the gap on the next launch attempt |
| A3 | resvg-js writes font-family warnings to `process.stderr` (not to a napi-internal log sink) | Pitfall 2 | Medium — verify with a deliberate broken-SVG test in Wave 0. If it goes elsewhere, the stderr-capture approach silently misses warnings and CI never fails |
| A4 | `playwright_skip_browser_download=1` in `.npmrc` is honored by npm 9+ (which propagates it as `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` env var to scripts) | Pitfall 4 | Medium — fallback is to gate Playwright behind `optionalDependencies` and accept that some users won't get it |
| A5 | The `playwright` package's postinstall is the only mechanism that downloads Chromium at install time (i.e., simply installing the `playwright` npm package doesn't pull a binary if env var is set) | Standard Stack | Low — verify by smoke install in a clean container in Wave 0 |
| A6 | macOS/Linux `$HOME/.config/cora/browsers/` works as `PLAYWRIGHT_BROWSERS_PATH` without permission issues | Pattern 4 | Low — Playwright explicitly documents user-writable paths as supported |
| A7 | The output of `chromium.executablePath()` after `playwright install chromium` with `PLAYWRIGHT_BROWSERS_PATH` set points into our cache dir, not into `~/.cache/ms-playwright/` | Pattern 4 | Medium — verify in Wave 0 smoke test |

User confirmation needed: A1, A3, A4 are the load-bearing assumptions. Wave 0 of the plan should resolve these empirically rather than locking them in.

## Open Questions

1. **TTF source for Noto Sans.**
   - What we know: Noto Sans is OFL 1.1, available from notofonts.github.io (TTF) and Google Fonts (TTF/variable).
   - What's unclear: Whether to bundle full TTF (~600KB each) or use static subsets. pdf-lib's `embedFont(buf, { subset: true })` does the subsetting at PDF-build time, so file size on disk is the only concern.
   - Recommendation: Vendor `NotoSans-Regular.ttf` + `NotoSans-SemiBold.ttf` from `notofonts/notofonts.github.io` repo (static OpenType folder). ~600KB extra in published npm tarball is acceptable; the alternative is to depend on `@fontsource/noto-sans` at runtime, which adds a dependency for a static asset.

2. **resvg warning text matching.**
   - What we know: Warning format is approximately `Warning: No match for font-family: ...`.
   - What's unclear: Whether the exact substring is stable across resvg-js patch versions, or whether other warning categories (e.g., unsupported SVG filters) should also fail CI.
   - Recommendation: Match the broad pattern `/^Warning: /` for CI failure (per D-11: "treat as errors"). Document the exact substrings observed in tests.

3. **Should `--page=auto` exist?**
   - What we know: D-01 says fit-to-content is the default *behavior* (no flag).
   - What's unclear: Whether `--page=auto` should also be accepted as an alias for "explicit fit-to-content," for symmetry with `--page=a4`.
   - Recommendation: Skip — adding alias complicates docs and tests for no user benefit. Just omit `--page` to get fit-to-content.

4. **Should `--quality=high` work without `-o`?**
   - What we know: render command already requires `-o`.
   - Recommendation: Same constraint applies; no change needed.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All paths | ✓ (`engines.node >=22`) | per packages/cora/package.json | — |
| `bun` | Dev install | ✓ (project uses bun workspaces) | 1.x | npm install also works |
| Internet access | First `--quality=high` install | requires CI/dev to allow | — | Pre-seed `PLAYWRIGHT_BROWSERS_PATH` in air-gapped CI |
| `~/.config/cora/` writable | Chromium cache | assumed (user home) | — | Honor `CORA_CONFIG_DIR` override per Pattern 4 |
| `npx` | `playwright install chromium` invocation | ✓ (bundled with npm) | — | Direct binary path: `node_modules/.bin/playwright install chromium` |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None blocking; Playwright lane requires network only on first use, by design.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Custom Node scripts under `packages/cora/tests/` (no vitest yet) — `test:golden` is `node tests/render-golden.mjs` per `package.json`. Wave 0 should adopt `vitest` per STACK.md, or extend the bespoke runner. **Recommendation: introduce vitest in Wave 0** for cleaner PDF-specific test ergonomics. |
| Config file | none — Wave 0 must add `vitest.config.ts` or extend `tests/render-golden.mjs` |
| Quick run command | `bun x vitest run packages/cora/tests/pdf/` (after vitest adoption) OR `node packages/cora/tests/render-golden.mjs --pdf` |
| Full suite command | `bun x vitest run` OR `bun run test:golden` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EXP-02 | `.pdf` extension produces valid PDF byte stream | integration | `vitest run tests/pdf/render-pdf.test.ts` — parses output with `pdf-parse` or pdf-lib, asserts page count + content | ❌ Wave 0 |
| EXP-02 | Text is selectable (PDF text extraction returns labels) | integration | same file — uses `pdf-parse` to extract text, asserts every `node.label` appears | ❌ Wave 0 |
| EXP-02 | Text position matches SVG within 1pt tolerance | integration | parses `<text>` from SVG output of same diagram, compares to PDF text positions via pdf-lib's page operators | ❌ Wave 0 |
| EXP-02 | Fit-to-content page size = layouted bbox + margin*2 | unit | `tests/pdf/page-size.test.ts` — calls `computePageGeometry`, asserts width/height | ❌ Wave 0 |
| EXP-02 | `--page=a4` scales diagram to fit | unit | same file — pass over-sized layouted diagram, assert scale < 1 and centred | ❌ Wave 0 |
| EXP-03 | `--quality=high` invokes Playwright and produces a valid PDF | integration (gated) | `vitest run tests/pdf/high-quality.test.ts` — only runs if `CORA_TEST_PLAYWRIGHT=1` (so default CI doesn't download 170MB) | ❌ Wave 0 |
| EXP-04 | Missing Chromium + non-interactive + no `--yes` → exits with `CHROMIUM_NOT_INSTALLED` JSON error | integration | `tests/pdf/chromium-prompt.test.ts` — sets `CORA_CONFIG_DIR=/tmp/empty`, runs `cora render … --quality=high --format=json`, asserts exit code != 0 and JSON shape | ❌ Wave 0 |
| EXP-04 | `--yes` triggers install (mocked via env to a test stub) | integration | same file, with `CORA_TEST_PLAYWRIGHT_INSTALL_STUB=/path/to/echo-script` to avoid real download | ❌ Wave 0 |
| EXP-05 | `npm install cora` does not download Chromium | manual / CI smoke | shell script: clean container, `npm install`, assert `~/.cache/ms-playwright` does not exist | ❌ Wave 0 — add `tests/smoke/clean-install.sh` |
| D-11 | resvg font warning → non-zero exit when `CI=1` | integration | synthetic SVG with bogus font-family, run through `rasteriseWithWarningCapture`, assert warnings array non-empty; then full CLI invocation with `CI=1` asserts exit != 0 | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `bun x vitest run packages/cora/tests/pdf/` (skips the gated Playwright lane)
- **Per wave merge:** Same + `tests/smoke/clean-install.sh` once
- **Phase gate:** Full suite green, plus one full `CORA_TEST_PLAYWRIGHT=1 vitest run` against the high-quality lane

### Wave 0 Gaps

- [ ] `packages/cora/tests/pdf/render-pdf.test.ts` — covers EXP-02 (PDF validity, text selectability, position tolerance)
- [ ] `packages/cora/tests/pdf/page-size.test.ts` — covers EXP-02 (sizing math, scale-to-fit)
- [ ] `packages/cora/tests/pdf/high-quality.test.ts` — covers EXP-03 (Playwright lane, gated)
- [ ] `packages/cora/tests/pdf/chromium-prompt.test.ts` — covers EXP-04 (JSON error, `--yes` triggers install, predicate split)
- [ ] `packages/cora/tests/pdf/resvg-warning.test.ts` — covers D-11 (warning capture + CI exit)
- [ ] `packages/cora/tests/smoke/clean-install.sh` — covers EXP-05
- [ ] `vitest.config.ts` (project root or `packages/cora/`) — Wave 0 framework introduction
- [ ] Framework install: `bun add -d vitest pdf-parse` — pdf-parse for PDF text extraction in assertions
- [ ] `packages/cora/src/renderer/assets/fonts/NotoSans-Regular.ttf` + `NotoSans-SemiBold.ttf` — required runtime assets

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — (CLI tool, no auth) |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes | YAML parse + AJV JSON Schema (already in Phase 1); SVG produced by renderer is internal (not user-supplied as a string to resvg) — so SVG-injection vectors don't apply |
| V6 Cryptography | no | — (no secrets, no encryption) |
| V12 Files & Resources | yes | (1) `-o` path is user-supplied — ensure no path traversal beyond intent (existing `mkdirSync(dirname(out), {recursive:true})` is fine, this is a local CLI). (2) Chromium binary integrity: rely on Playwright's signed-download mechanism; do not implement custom URL fetch |
| V14 Configuration | yes | Spawning `npx playwright install chromium` invokes a child process — pass an allowlist env (don't forward arbitrary user env that could redirect npm registry to attacker) |

### Known Threat Patterns for `cora` PDF stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious diagram label injected via YAML triggers PDF reader exploit | Tampering | pdf-lib does its own encoding; user content goes through `drawText` (no PDF operator injection vector); fontkit handles glyph mapping safely |
| Path traversal via `-o ../../../../etc/cora.pdf` | Tampering | This is a local CLI tool the user invokes themselves; not a server context. No mitigation beyond not running cora as root. |
| Child process env injection (e.g., `NODE_OPTIONS=--require=evil.js` inherited into `playwright install`) | Elevation | Pass an explicit env to `spawn()` — `{ ...process.env, PLAYWRIGHT_BROWSERS_PATH: ... }` is acceptable for a user-invoked CLI; the threat model here is the user's own machine |
| Chromium download MITM | Spoofing | Playwright downloads from `playwright.azureedge.net` over HTTPS with SHA checks — we inherit this guarantee by using the `playwright install` CLI instead of a hand-rolled downloader |
| Font supply-chain (compromised Noto Sans TTF in our repo) | Tampering | Pin TTF files to a specific upstream commit/release; document the source in `assets/fonts/SOURCES.md` |

## Sources

### Primary (HIGH confidence)

- pdf-lib official docs: https://pdf-lib.js.org/docs/api/classes/pdfdocument — embedding, drawing API
- pdf-lib drawText: https://pdf-lib.js.org/docs/api/classes/pdfpage — Y-up bottom-left origin confirmed via example
- @pdf-lib/fontkit npm: `npm view @pdf-lib/fontkit version` → 1.1.1
- pdf-lib npm: `npm view pdf-lib version` → 1.17.1
- @resvg/resvg-js TypeScript definitions: https://github.com/yisibl/resvg-js/blob/main/index.d.ts (no warnings field, only logLevel)
- Playwright browsers docs: https://playwright.dev/docs/browsers (`PLAYWRIGHT_BROWSERS_PATH`, postinstall download)
- env-paths: https://www.npmjs.com/package/env-paths
- Existing repo code: `packages/cora/src/renderer/renderToPNG.ts`, `cli/commands/render.ts`, `cli/output.ts`, `layout-ir.ts`
- Phase 2 + project context: `.planning/PROJECT.md`, `.planning/research/STACK.md`, `.planning/research/PITFALLS.md`
- Page-size dimensions: ISO 216 (A4) + ANSI Y14.1 (Letter), cross-checked against pdf-lib's `PageSizes` constant

### Secondary (MEDIUM confidence)

- WebSearch: Playwright lazy-install patterns (multiple sources converging on `PLAYWRIGHT_BROWSERS_PATH` + CLI spawn)
- WebSearch: resvg-js `logLevel` writes to stderr (npm package page confirms; not directly confirmed by reading resvg-js src this session)
- WebSearch: fontkit accepts WOFF (multiple sources, including official fontkit README)

### Tertiary (LOW confidence)

- Exact substring of resvg font-family warning ("No match for font-family") — observed in PITFALLS.md and resvg issue tracker but not in 2026; Wave 0 must verify empirically

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — every package version verified against npm registry; pdf-lib/fontkit ecosystem is mature
- Architecture (IR-driven text overlay): HIGH — the IR exposes everything needed; no SVG re-parsing required
- Playwright lazy install: MEDIUM — single supported entry point (spawn `playwright install`) but the `playwright-core` vs `playwright` distinction matters and contradicts STACK.md (which can be amended)
- Pitfalls: HIGH — pitfalls are well-known patterns documented in PITFALLS.md + project codebase
- resvg warning capture: MEDIUM — strategy (stderr piping) is correct; exact warning string needs empirical verification in Wave 0
- TTF asset addition: HIGH — Noto Sans is OFL-licensed and freely vendorable

**Research date:** 2026-05-22
**Valid until:** 2026-06-22 (Playwright versioning and Chromium download URL conventions move on quarter timescales; pdf-lib + resvg are stable)
