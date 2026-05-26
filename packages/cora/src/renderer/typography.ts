import {
  EDGE_LABEL_SIZE,
  NODE_TITLE_SIZE,
} from './themes/fontTokens.js';

const FONT_SIZE_BY_ROLE = { node: NODE_TITLE_SIZE, edge: EDGE_LABEL_SIZE } as const;

/** Browser-safe text measurement for renderer/preview (no fontkit/node deps). */
export function measureLabel(
  text: string,
  role: 'node' | 'edge',
): { width: number; height: number } {
  const fontSize = FONT_SIZE_BY_ROLE[role];
  return {
    width: text.length * fontSize * 0.62,
    height: fontSize * 1.2,
  };
}

/** Browser-safe baseline helper for SVG text in renderer/preview. */
export function baselineYForVisualCenter(
  centerY: number,
  fontSize: number,
  _role: 'node' | 'edge',
): number {
  return centerY + fontSize * 0.34;
}
