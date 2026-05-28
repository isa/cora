import type { EdgeMarker } from '../layout-ir.js';

const EDGE_MARKER_SIZE = 8;
const EDGE_CIRCLE_STROKE_WIDTH = 1.5;

function resolvedMarkerSize(markerSize = EDGE_MARKER_SIZE): number {
  return Math.max(4, markerSize);
}

function circleFillRadius(markerSize = EDGE_MARKER_SIZE): number {
  return Math.max(2, resolvedMarkerSize(markerSize) * 0.36);
}

function circleOuterRadius(markerSize = EDGE_MARKER_SIZE): number {
  return circleFillRadius(markerSize) + EDGE_CIRCLE_STROKE_WIDTH / 2;
}

function squareHalfSize(markerSize = EDGE_MARKER_SIZE): number {
  return Math.max(3, resolvedMarkerSize(markerSize) * 0.72) / 2;
}

export function effectiveStartMarker(marker: EdgeMarker | undefined): EdgeMarker {
  return marker ?? 'none';
}

export function effectiveEndMarker(marker: EdgeMarker | undefined): EdgeMarker {
  return marker ?? 'arrow';
}

export function markerAnchorOffset(
  marker: EdgeMarker | undefined,
  markerSize = EDGE_MARKER_SIZE,
): number {
  switch (marker) {
    case 'circle':
      return circleOuterRadius(markerSize);
    case 'filledCircle':
      return circleFillRadius(markerSize);
    case 'diamond':
      return resolvedMarkerSize(markerSize) / 2 + EDGE_CIRCLE_STROKE_WIDTH / 2;
    case 'filledDiamond':
      return resolvedMarkerSize(markerSize) / 2;
    case 'square':
      return squareHalfSize(markerSize) + EDGE_CIRCLE_STROKE_WIDTH / 2;
    case 'filledSquare':
      return squareHalfSize(markerSize);
    default:
      return 0;
  }
}

export function markerShaftTrim(
  marker: EdgeMarker | undefined,
  markerSize = EDGE_MARKER_SIZE,
): number {
  switch (marker) {
    case 'arrow':
      return resolvedMarkerSize(markerSize);
    case 'circle':
      return circleOuterRadius(markerSize);
    case 'filledCircle':
      return circleFillRadius(markerSize);
    case 'diamond':
      return resolvedMarkerSize(markerSize) / 2 + EDGE_CIRCLE_STROKE_WIDTH / 2;
    case 'filledDiamond':
      return resolvedMarkerSize(markerSize) / 2;
    case 'square':
      return squareHalfSize(markerSize) + EDGE_CIRCLE_STROKE_WIDTH / 2;
    case 'filledSquare':
      return squareHalfSize(markerSize);
    default:
      return 0;
  }
}

export function markerVisibleTrim(
  marker: EdgeMarker | undefined,
  markerSize = EDGE_MARKER_SIZE,
): number {
  return markerAnchorOffset(marker, markerSize) + markerShaftTrim(marker, markerSize);
}
