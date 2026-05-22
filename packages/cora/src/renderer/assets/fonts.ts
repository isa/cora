import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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

let resvgFontBuffersCache: Buffer[] | undefined;

/**
 * Cached WOFF buffers in renderer-stable order (Regular, SemiBold) for
 * `@resvg/resvg-js`. resvg-js does not load WOFF via `fontFiles`; pass
 * the buffers directly through `font.fontBuffers`.
 */
export function resvgFontBuffers(): Buffer[] {
  if (!resvgFontBuffersCache) {
    resvgFontBuffersCache = [
      readFileSync(resolveFontPath('NotoSans-Regular.woff')),
      readFileSync(resolveFontPath('NotoSans-SemiBold.woff')),
    ];
  }
  return resvgFontBuffersCache;
}

let pdfLibFontBuffersCache: { regular: Buffer; semibold: Buffer } | undefined;

/**
 * Cached TTF buffers for `pdf-lib` + `@pdf-lib/fontkit`. TTF is the
 * format pdf-lib/fontkit handles most reliably for selectable-text
 * embedding (see SOURCES.md "Why TTF").
 */
export function pdfLibFontBuffers(): { regular: Buffer; semibold: Buffer } {
  if (!pdfLibFontBuffersCache) {
    pdfLibFontBuffersCache = {
      regular: readFileSync(resolveFontPath('NotoSans-Regular.ttf')),
      semibold: readFileSync(resolveFontPath('NotoSans-SemiBold.ttf')),
    };
  }
  return pdfLibFontBuffersCache;
}
