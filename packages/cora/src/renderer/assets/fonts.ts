import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DEFAULT_DIAGRAM_FONT } from '../themes/diagramFonts.js';

const base = dirname(fileURLToPath(import.meta.url));

/**
 * Resolve a bundled font file by name. Searches the two layouts that
 * the build pipeline produces:
 *
 *   1. `<base>/assets/fonts/<filename>` — flat dist layout
 *      (when this module lives at dist/renderer/assets/fonts.js, sibling
 *      to the assets/ dir copied by the build script).
 *   2. `<base>/../src/renderer/assets/fonts/<filename>` — dev layout
 *      (when running via tsx / source loader from outside dist).
 *
 * The two-candidate shape is the existing pattern lifted verbatim from
 * `renderToPNG.ts`; do not extend without a test proving necessity
 * (per 03-PATTERNS.md "Refactor action" point 1).
 */
export function resolveFontPath(filename: string): string {
  const candidates = [
    // dist flat layout: dist/renderer/assets/fonts/<filename>, when this
    // module compiles into dist/renderer/ alongside an `assets/` dir.
    join(base, 'assets/fonts', filename),
    // dev layout: this module is src/renderer/assets/fonts.ts and the
    // fonts live in a sibling `fonts/` dir (vitest, tsx — base ends in
    // assets/, so `<base>/fonts/<filename>` resolves correctly).
    join(base, 'fonts', filename),
    // dev fallback when the module is loaded with a different base:
    // src/renderer/<...>/assets/fonts/<filename> from dist/renderer/foo.
    join(base, '../src/renderer/assets/fonts', filename),
    // dist fallback when bundled in other entry points (e.g. dist/core/index.js)
    join(base, '../renderer/assets/fonts', filename),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Font not found: ${filename} (searched: ${candidates.join(', ')})`);
}

function bundledWoffFiles(): string[] {
  const fontsDir = dirname(resolveFontPath(`${DEFAULT_DIAGRAM_FONT.replace(/\s+/g, '')}-Regular.woff`));
  return readdirSync(fontsDir)
    .filter((name) => name.endsWith('.woff'))
    .sort();
}

let resvgFontBuffersCache: Buffer[] | undefined;

/**
 * Cached WOFF buffers for every bundled diagram face (Regular + SemiBold
 * per family) for `@resvg/resvg-js`.
 */
export function resvgFontBuffers(): Buffer[] {
  if (!resvgFontBuffersCache) {
    resvgFontBuffersCache = bundledWoffFiles().map((filename) =>
      readFileSync(resolveFontPath(filename)),
    );
  }
  return resvgFontBuffersCache;
}

let pdfLibFontBuffersCache: { regular: Buffer; semibold: Buffer } | undefined;

const defaultPrefix = DEFAULT_DIAGRAM_FONT.replace(/\s+/g, '');

/**
 * Cached TTF buffers for `pdf-lib` + `@pdf-lib/fontkit`. The default
 * diagram face (Poppins) ships as TTF for selectable-text embedding.
 */
export function pdfLibFontBuffers(): { regular: Buffer; semibold: Buffer } {
  if (!pdfLibFontBuffersCache) {
    pdfLibFontBuffersCache = {
      regular: readFileSync(resolveFontPath(`${defaultPrefix}-Regular.ttf`)),
      semibold: readFileSync(resolveFontPath(`${defaultPrefix}-SemiBold.ttf`)),
    };
  }
  return pdfLibFontBuffersCache;
}
