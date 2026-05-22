import {
  LABELED_EDGE_LABEL_PADDING,
  MIN_LABELED_EDGE_STUB,
} from '../../../core/labeledEdgeExpansion.js';
import type { EdgeBridge, EdgeLabelPlacement } from '../../../layout-ir.js';

export const EDGE_LABEL_PADDING = LABELED_EDGE_LABEL_PADDING;
export { MIN_LABELED_EDGE_STUB };
export const EDGE_LABEL_OFFSET = 10;
export const EDGE_BRIDGE_RADIUS = 3;

export function edgeLabelGapHalfSpan(label: EdgeLabelPlacement): number {
  return (
    (label.orientation === 'horizontal' ? label.width : label.height) / 2 +
    EDGE_LABEL_PADDING
  );
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
