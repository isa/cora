/**
 * Page-geometry helpers for the default PDF render path.
 *
 * - `PAGE_SIZES`  : ISO 216 (A4) + ANSI Y14.1 (Letter) dimensions in points.
 * - `computePageGeometry` : derives pageW/pageH/scale/offsetX/offsetY for
 *   either fit-to-content (no `page` set) or scale-to-fit a chosen page.
 * - `scaleSvgToPage` : injects width/height attributes onto an SVG root
 *   (lifted from renderToPNG.ts's `scaleSvgDimensions` so the rasterised
 *   output is crisp).
 * - `extractSvgDimensions` : pulls viewBox or width/height attrs back out
 *   of an SVG string. Plan 03 reuses this from `./pdf/pageSize.js`.
 */

export type PageName = 'a4' | 'letter' | 'a4-portrait' | 'letter-portrait';

/**
 * Page dimensions in PDF points (1 inch = 72pt). Width × Height.
 * A4   verified against ISO 216 (210×297mm = 595.28×841.89pt).
 * Letter verified against ANSI/ASME Y14.1 (8.5×11in = 612×792pt).
 * Landscape variants are the default; `*-portrait` swaps width/height.
 */
export const PAGE_SIZES: Record<PageName, [number, number]> = {
  'a4': [841.89, 595.28],
  'a4-portrait': [595.28, 841.89],
  'letter': [792, 612],
  'letter-portrait': [612, 792],
};

const DEFAULT_MARGIN = 24;

export interface PageGeometry {
  pageW: number;
  pageH: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface PageGeometryOptions {
  page?: PageName;
  margin?: number;
}

export function computePageGeometry(
  layouted: { width: number; height: number },
  opts: PageGeometryOptions,
): PageGeometry {
  const margin = opts.margin ?? DEFAULT_MARGIN;
  if (!opts.page) {
    // Fit-to-content: page = diagram bbox + 2*margin, no scaling.
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
    pageW,
    pageH,
    scale,
    offsetX: (pageW - scaledW) / 2,
    offsetY: (pageH - scaledH) / 2,
  };
}

/**
 * Inject (or replace) `width`/`height` attributes on the root <svg> tag
 * so resvg rasterises at the requested scale. Mirrors
 * `scaleSvgDimensions` in renderToPNG.ts.
 */
export function scaleSvgToPage(svg: string, scale: number): string {
  const svgTagMatch = svg.match(/^<svg[^>]*>/);
  const viewBoxMatch = svg.match(/<svg[^>]*viewBox="([^"]+)"/);
  if (!svgTagMatch || !viewBoxMatch) {
    return svg;
  }

  const dimensions = viewBoxMatch[1]!.split(/\s+/).map(Number);
  const width = dimensions[2]! * scale;
  const height = dimensions[3]! * scale;
  const svgTag = svgTagMatch[0];

  const scaledTag = /\bwidth="/.test(svgTag)
    ? svgTag
        .replace(/\bwidth="[^"]*"/, `width="${width}"`)
        .replace(/\bheight="[^"]*"/, `height="${height}"`)
    : svgTag.replace('<svg', `<svg width="${width}" height="${height}"`);

  return svg.replace(svgTag, scaledTag);
}

/**
 * Extract logical SVG dimensions in user-space units. Prefer viewBox
 * (the renderer always emits one); fall back to explicit width/height
 * attrs. Throws if neither is parseable so callers fail loud rather
 * than silently rendering a 0×0 page.
 */
export function extractSvgDimensions(svg: string): { width: number; height: number } {
  const vb = svg.match(/<svg[^>]*viewBox="([^"]+)"/);
  if (vb) {
    const parts = vb[1]!.trim().split(/\s+/).map(Number);
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      return { width: parts[2]!, height: parts[3]! };
    }
  }
  const widthMatch = svg.match(/<svg[^>]*\bwidth="([\d.]+)"/);
  const heightMatch = svg.match(/<svg[^>]*\bheight="([\d.]+)"/);
  if (widthMatch && heightMatch) {
    const width = Number(widthMatch[1]);
    const height = Number(heightMatch[1]);
    if (Number.isFinite(width) && Number.isFinite(height)) {
      return { width, height };
    }
  }
  throw new Error(
    'extractSvgDimensions: SVG has neither a parseable viewBox nor width/height attributes',
  );
}
