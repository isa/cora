import type { EdgeMarker } from '../layout-ir.js';

const EDGE_MARKER_SIZE = 8;
const EDGE_ARROW_MARKER_DEPTH = 8;
const EDGE_CIRCLE_FILL_RADIUS = EDGE_MARKER_SIZE * 0.36;
const EDGE_CIRCLE_STROKE_WIDTH = 1.5;
const EDGE_CIRCLE_OUTER_RADIUS = EDGE_CIRCLE_FILL_RADIUS + EDGE_CIRCLE_STROKE_WIDTH / 2;
const EDGE_FILLED_CIRCLE_RADIUS = EDGE_CIRCLE_FILL_RADIUS;
const EDGE_DIAMOND_OUTER_RADIUS = EDGE_MARKER_SIZE / 2 + EDGE_CIRCLE_STROKE_WIDTH / 2;
const EDGE_FILLED_DIAMOND_RADIUS = EDGE_MARKER_SIZE / 2;
const EDGE_SQUARE_OUTER_RADIUS = EDGE_MARKER_SIZE * 0.36 + EDGE_CIRCLE_STROKE_WIDTH / 2;
const EDGE_FILLED_SQUARE_RADIUS = EDGE_MARKER_SIZE * 0.36;

export function effectiveStartMarker(marker: EdgeMarker | undefined): EdgeMarker {
  return marker ?? 'none';
}

export function effectiveEndMarker(marker: EdgeMarker | undefined): EdgeMarker {
  return marker ?? 'arrow';
}

export function markerAnchorOffset(marker: EdgeMarker | undefined): number {
  switch (marker) {
    case 'circle':
      return EDGE_CIRCLE_OUTER_RADIUS;
    case 'filledCircle':
      return EDGE_FILLED_CIRCLE_RADIUS;
    case 'diamond':
      return EDGE_DIAMOND_OUTER_RADIUS;
    case 'filledDiamond':
      return EDGE_FILLED_DIAMOND_RADIUS;
    case 'square':
      return EDGE_SQUARE_OUTER_RADIUS;
    case 'filledSquare':
      return EDGE_FILLED_SQUARE_RADIUS;
    default:
      return 0;
  }
}

export function markerShaftTrim(marker: EdgeMarker | undefined): number {
  switch (marker) {
    case 'arrow':
      return EDGE_ARROW_MARKER_DEPTH;
    case 'circle':
      return EDGE_CIRCLE_OUTER_RADIUS;
    case 'filledCircle':
      return EDGE_FILLED_CIRCLE_RADIUS;
    case 'diamond':
      return EDGE_DIAMOND_OUTER_RADIUS;
    case 'filledDiamond':
      return EDGE_FILLED_DIAMOND_RADIUS;
    case 'square':
      return EDGE_SQUARE_OUTER_RADIUS;
    case 'filledSquare':
      return EDGE_FILLED_SQUARE_RADIUS;
    default:
      return 0;
  }
}

export function markerVisibleTrim(marker: EdgeMarker | undefined): number {
  return markerAnchorOffset(marker) + markerShaftTrim(marker);
}
