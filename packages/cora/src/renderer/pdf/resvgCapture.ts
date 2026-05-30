import { Resvg, type ResvgRenderOptions } from '@resvg/resvg-js';

import { DIAGRAM_FONT_OPTIONS } from '../themes/diagramFonts.js';

/**
 * Capture resvg font-family warnings.
 *
 * 03-RESEARCH.md Pitfall 2 prescribed a `process.stderr.write` swap as
 * the capture mechanism. In practice with `@resvg/resvg-js@~2.6.2` the
 * Rust `log` crate writes directly to fd 2 (libc-level), bypassing
 * Node's `process.stderr.write` JS hook — verified empirically. The
 * stderr hook is kept (cheap; will start working again if a future
 * resvg-js routes warnings through a Node-visible writer), but the
 * primary detection path is a structural pre-check of the SVG against
 * the loaded font set.
 *
 * Detection rule: if the SVG declares a `font-family="X"` for any
 * family name not in the resolvable set (loaded buffers +
 * defaultFontFamily + sansSerifFamily), record a warning. This matches
 * D-11's intent ("if a font-family warning fires in Phase 3, something
 * regressed") and is robust across resvg-js patch versions.
 *
 * Returns `{ png, warnings }`. The stderr hook is always restored,
 * even on error.
 */
export function rasteriseWithWarningCapture(
  svg: string,
  opts: ResvgRenderOptions,
): { png: Buffer; warnings: string[] } {
  const warnings: string[] = [];

  // -- Primary path: structural pre-check ----------------------------
  const resolvable = collectResolvableFamilies(opts);
  for (const family of extractFontFamilies(svg)) {
    if (resolvable.size === 0) {
      // No fonts available at all: any text triggers a warning.
      warnings.push(`No match for font-family: '${family}'`);
      continue;
    }
    if (!resolvable.has(family.toLowerCase())) {
      warnings.push(`No match for font-family: '${family}'`);
    }
  }

  // -- Secondary path: stderr hook (kept as a forward-compat probe) --
  const originalWrite = process.stderr.write;
  process.stderr.write = ((chunk: string | Uint8Array, ...rest: unknown[]) => {
    const text =
      typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
    if (/No match for font-family/i.test(text)) {
      warnings.push(text.trim());
    }
    return (originalWrite as (...args: unknown[]) => boolean).apply(
      process.stderr,
      [chunk, ...rest],
    );
  }) as typeof process.stderr.write;

  try {
    const resvg = new Resvg(svg, { ...opts, logLevel: 'warn' });
    const png = resvg.render().asPng();
    return { png, warnings };
  } finally {
    process.stderr.write = originalWrite;
  }
}

/**
 * Pull every `font-family="..."` (and CSS-style `font-family:`) name
 * the SVG references. Generic CSS keywords (`sans-serif`, `serif`,
 * `monospace`, `inherit`) are treated as always-resolvable.
 */
function extractFontFamilies(svg: string): string[] {
  const out: string[] = [];
  const GENERIC = new Set([
    'sans-serif',
    'serif',
    'monospace',
    'cursive',
    'fantasy',
    'inherit',
    'initial',
    'unset',
    '',
  ]);
  const seen = new Set<string>();

  const attrRe = /font-family="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = attrRe.exec(svg)) !== null) {
    for (const raw of m[1]!.split(',')) {
      const name = raw.trim().replace(/^['"]|['"]$/g, '');
      const key = name.toLowerCase();
      if (GENERIC.has(key) || seen.has(key)) continue;
      seen.add(key);
      out.push(name);
    }
  }

  const cssRe = /font-family\s*:\s*([^;"]+)/g;
  while ((m = cssRe.exec(svg)) !== null) {
    for (const raw of m[1]!.split(',')) {
      const name = raw.trim().replace(/^['"]|['"]$/g, '');
      const key = name.toLowerCase();
      if (GENERIC.has(key) || seen.has(key)) continue;
      seen.add(key);
      out.push(name);
    }
  }

  return out;
}

/**
 * Best-effort set of resolvable family names: `defaultFontFamily`,
 * `sansSerifFamily`, and (heuristically) the family of every TTF/WOFF
 * buffer name we can detect via the font's `name` table. We do NOT
 * parse fontkit here to keep this module free of pdf-lib coupling; in
 * practice the project only ships Noto Sans, so we whitelist that.
 */
function collectResolvableFamilies(opts: ResvgRenderOptions): Set<string> {
  const set = new Set<string>();
  const font = opts.font;
  if (!font) return set;
  if (font.defaultFontFamily) set.add(font.defaultFontFamily.toLowerCase());
  if (font.sansSerifFamily) set.add(font.sansSerifFamily.toLowerCase());
  if (font.serifFamily) set.add(font.serifFamily.toLowerCase());
  if (font.cursiveFamily) set.add(font.cursiveFamily.toLowerCase());
  if (font.fantasyFamily) set.add(font.fantasyFamily.toLowerCase());
  if (font.monospaceFamily) set.add(font.monospaceFamily.toLowerCase());
  // Bundled diagram fonts (see assets/fonts/ and scripts/sync-diagram-fonts.mjs).
  // If fontBuffers are present, treat every shipped diagram face as resolvable.
  const buffers = (font as { fontBuffers?: unknown }).fontBuffers;
  if (Array.isArray(buffers) && buffers.length > 0) {
    for (const family of DIAGRAM_FONT_OPTIONS) {
      set.add(family.toLowerCase());
    }
  }
  return set;
}
