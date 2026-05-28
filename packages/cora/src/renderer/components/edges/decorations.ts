import {
  EDGE_LABEL_RUNWAY,
  LABELED_EDGE_LABEL_PADDING,
  MIN_LABELED_EDGE_STUB,
} from '../../../core/labeledEdgeExpansion.js';
import type { EdgeBridge, EdgeLabelPlacement } from '../../../layout-ir.js';

export const EDGE_LABEL_PADDING = LABELED_EDGE_LABEL_PADDING;
export { EDGE_LABEL_RUNWAY, MIN_LABELED_EDGE_STUB };
export const EDGE_LABEL_OFFSET = 10;
export const EDGE_BRIDGE_RADIUS = 3;

// Half-span of the shaft cut-out reserved for the label: text half-size plus a
// compact runway so a clean shaft is still visible on each side of the text.
export function edgeLabelGapHalfSpan(label: EdgeLabelPlacement): number {
  const textHalf = label.orientation === 'horizontal'
    ? label.width / 2
    : label.height / 2;
  return textHalf + EDGE_LABEL_RUNWAY;
}

/** Labels sit inline in a cut-out gap in the stroke, for both orientations. */
export function edgeLabelUsesPathGap(_label: EdgeLabelPlacement): boolean {
  return true;
}

export function edgeLabelRenderPosition(label: EdgeLabelPlacement): {
  x: number;
  y: number;
  textAnchor: 'middle' | 'end';
} {
  return {
    x: label.x,
    y: label.orientation === 'horizontal' ? label.y - 1 : label.y,
    textAnchor: 'middle',
  };
}

export function bridgeHalfSpan(_bridge: EdgeBridge): number {
  return EDGE_BRIDGE_RADIUS;
}
