import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Font } from 'fontkit';

import {
  EDGE_FONT_SIZE,
  NODE_FONT_SIZE,
} from '../renderer/themes/fontTokens.js';

import type { DiagramNode, MeasuredNode } from './types.js';

const require = createRequire(import.meta.url);
const fontkit = require('fontkit') as typeof import('fontkit');

const FONT_SIZE_BY_ROLE = { node: NODE_FONT_SIZE, edge: EDGE_FONT_SIZE } as const;
const NODE_PADDING_X = 11;
const NODE_PADDING_Y = 6;
const DECISION_EXTRA_PADDING_Y = 8;

function resolveFontPath(filename: string): string {
  const base = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(base, 'renderer/assets/fonts', filename),
    join(base, '../renderer/assets/fonts', filename),
    join(base, '../../src/renderer/assets/fonts', filename),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Font not found: ${filename} (searched: ${candidates.join(', ')})`);
}

const fontPaths = {
  node: () => resolveFontPath('NotoSans-SemiBold.woff'),
  edge: () => resolveFontPath('NotoSans-Regular.woff'),
};

const fontCache: Partial<Record<'node' | 'edge', Font>> = {};

interface FontWithMetrics extends Font {
  ascent: number;
  descent: number;
  unitsPerEm: number;
}

function loadFont(role: 'node' | 'edge'): Font {
  const cached = fontCache[role];
  if (cached) {
    return cached;
  }

  const font = fontkit.openSync(fontPaths[role]());
  fontCache[role] = font;
  return font;
}

function fontMetrics(font: Font): FontWithMetrics {
  return font as FontWithMetrics;
}

function measureTextWidth(font: Font, text: string, size: number): number {
  const run = font.layout(text);
  return (run.advanceWidth * size) / fontMetrics(font).unitsPerEm;
}

export function measureLabel(
  text: string,
  role: 'node' | 'edge',
): { width: number; height: number } {
  const fontSize = FONT_SIZE_BY_ROLE[role];
  const font = loadFont(role);
  const width = measureTextWidth(font, text, fontSize);
  const metrics = fontMetrics(font);
  const scale = fontSize / metrics.unitsPerEm;
  const height = (metrics.ascent - metrics.descent) * scale;
  return { width, height };
}

/** Map a visual center Y to the SVG text baseline for resvg-accurate vertical centering. */
export function baselineYForVisualCenter(
  centerY: number,
  fontSize: number,
  role: 'node' | 'edge',
): number {
  const font = loadFont(role);
  const metrics = fontMetrics(font);
  const scale = fontSize / metrics.unitsPerEm;
  return centerY + ((metrics.ascent + metrics.descent) * scale) / 2;
}

export function measureNodes(nodes: DiagramNode[]): MeasuredNode[] {
  return nodes.map((node) => {
    const { width, height } = measureLabel(node.label, 'node');
    let measuredWidth = width + NODE_PADDING_X * 2;
    let measuredHeight = height + NODE_PADDING_Y * 2;

    const component = node.component ?? 'box';
    if (component === 'decision') {
      measuredHeight = height + (NODE_PADDING_Y + DECISION_EXTRA_PADDING_Y) * 2;
      const side = Math.max(measuredWidth, measuredHeight);
      measuredWidth = side;
      measuredHeight = side;
    }

    return {
      ...node,
      measuredWidth,
      measuredHeight,
    };
  });
}
