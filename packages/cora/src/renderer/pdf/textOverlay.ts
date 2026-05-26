// Pure IR → TextDraw[] transformation. pdf-lib measurement + Y-flip
// happens in renderToPDF.ts. This module MUST NOT import from
// `pdf-lib`, `@pdf-lib/fontkit`, or `./coords.ts` — the locked
// contract in 03-02-PLAN.md / Task 2 acceptance criteria depends on
// keeping it a pure data transformation.

import type { LayoutedDiagram } from '../../layout-ir.js';

export interface TextDraw {
  /** Geometric center X in SVG coordinates (NOT Y-flipped, NOT scaled). */
  cx: number;
  /** Geometric center Y in SVG coordinates (NOT Y-flipped, NOT scaled). */
  cy: number;
  /** Anchor mode for the label.
   *  - 'center'      : both cx and cy are visual centers (nodes, edges).
   *  - 'top-left'    : cx is the LEFT edge, cy is the TOP edge of the
   *                    glyph box. Used for group titles to match the
   *                    SVG renderer's group label placement
   *                    (Group.tsx: `x = group.x + 8, y = group.y - 8`).
   */
  anchor: 'center' | 'top-left';
  text: string;
  weight: 'regular' | 'semibold';
  size: number;
  /** Hex color, e.g. '#1a1a1a'. */
  color: string;
}

/** Padding from the top edge of the group to the label baseline anchor,
 *  matching `groups/Group.tsx` which places labels at `group.y - 8`. */
const GROUP_LABEL_OFFSET_Y = -8;
/** X-offset for group labels from the group's left edge,
 *  matching `groups/Group.tsx` `group.x + 8`. */
const GROUP_LABEL_OFFSET_X = 8;

function weightOf(fontWeight: number): 'regular' | 'semibold' {
  return fontWeight >= 600 ? 'semibold' : 'regular';
}

function stringProp(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function numberProp(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

export function buildTextOverlay(layouted: LayoutedDiagram): TextDraw[] {
  const draws: TextDraw[] = [];
  const nodeTheme = layouted.theme.nodeLabel;
  const edgeTheme = layouted.theme.edgeLabel;

  // Nodes — label centered at the geometric center of the node box.
  for (const node of layouted.nodes) {
    if (!node.label) continue;
    const labelColor =
      node.resolvedStyle?.labelFill ?? nodeTheme.fill;
    
    const lines = node.label.split(/\r?\n/);
    const fontSize = nodeTheme.fontSize;
    const lineHeight = fontSize * 1.25;
    const totalHeight = lines.length * lineHeight;
    const boxCenterY = node.y + node.measuredHeight / 2;
    const firstLineCenter = boxCenterY - totalHeight / 2 + lineHeight / 2;

    for (let i = 0; i < lines.length; i++) {
      draws.push({
        cx: node.x + node.measuredWidth / 2,
        cy: firstLineCenter + i * lineHeight,
        anchor: 'center',
        text: lines[i]!,
        weight: weightOf(nodeTheme.fontWeight),
        size: fontSize,
        color: labelColor,
      });
    }
  }

  // Edges — only emit when the IR has a positioned label.
  for (const edge of layouted.edges) {
    if (
      !edge.label ||
      edge.labelX === undefined ||
      edge.labelY === undefined
    ) {
      continue;
    }
    draws.push({
      cx: edge.labelX,
      cy: edge.labelY,
      anchor: 'center',
      text: edge.label,
      weight: weightOf(edgeTheme.fontWeight),
      size: edgeTheme.fontSize,
      color: edgeTheme.fill,
    });
  }

  // Groups — title rendered at the top-left (matches Group.tsx). The
  // group label uses the nodeLabel theme tokens (Group.tsx reads
  // `theme.nodeLabel.fontSize/fontWeight/fill`).
  for (const group of layouted.groups ?? []) {
    if (!group.label) continue;
    draws.push({
      cx: group.x + GROUP_LABEL_OFFSET_X,
      cy: group.y + GROUP_LABEL_OFFSET_Y,
      anchor: 'top-left',
      text: group.label,
      weight: weightOf(nodeTheme.fontWeight),
      size: numberProp(group.style?.labelSize) ?? nodeTheme.fontSize,
      color: stringProp(group.style?.labelColor) ?? nodeTheme.fill,
    });
  }

  return draws;
}
