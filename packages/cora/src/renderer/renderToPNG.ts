import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Resvg, type ResvgRenderOptions } from '@resvg/resvg-js';

export type PngSize = 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

export const PNG_SIZE_SCALE: Record<PngSize, number> = {
  sm: 1,
  md: 2,
  lg: 3,
  xl: 4,
  xxl: 6,
};

const DEFAULT_SIZE: PngSize = 'md';

export function resolvePngScale(size?: string): number {
  if (!size) {
    return PNG_SIZE_SCALE[DEFAULT_SIZE];
  }
  const key = size as PngSize;
  if (!(key in PNG_SIZE_SCALE)) {
    throw new Error(
      `Invalid PNG size "${size}". Use one of: ${Object.keys(PNG_SIZE_SCALE).join(', ')}.`,
    );
  }
  return PNG_SIZE_SCALE[key];
}

/** resvg-js ignores fitTo when using fontBuffers; set explicit SVG dimensions instead. */
function scaleSvgDimensions(svg: string, scale: number): string {
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
