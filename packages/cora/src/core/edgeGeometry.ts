import type { LayoutedEdge } from '../layout-ir.js';

export interface EdgePoint {
  x: number;
  y: number;
}

export interface EdgeSegment {
  a: EdgePoint;
  b: EdgePoint;
  index: number;
  length: number;
  orientation: 'horizontal' | 'vertical';
}

export interface EdgePosition extends EdgePoint {
  segmentIndex: number;
  orientation: 'horizontal' | 'vertical';
}

const EPSILON = 0.001;

export function edgeSegments(points: EdgePoint[]): EdgeSegment[] {
  const segments: EdgeSegment[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    if (length === 0) {
      continue;
    }

    segments.push({
      a,
      b,
      index: i,
      length,
      orientation: Math.abs(b.x - a.x) >= Math.abs(b.y - a.y)
        ? 'horizontal'
        : 'vertical',
    });
  }

  return segments;
}

export function edgePathLength(points: EdgePoint[]): number {
  return edgeSegments(points).reduce((total, segment) => total + segment.length, 0);
}

export function edgePathPosition(
  points: EdgePoint[],
  distance: number,
): EdgePosition {
  if (points.length === 0) {
    return { x: 0, y: 0, segmentIndex: 0, orientation: 'horizontal' };
  }
  if (points.length === 1) {
    return { ...points[0]!, segmentIndex: 0, orientation: 'horizontal' };
  }

  const segments = edgeSegments(points);
  if (segments.length === 0) {
    return { ...points[0]!, segmentIndex: 0, orientation: 'horizontal' };
  }

  const totalLength = edgePathLength(points);
  const target = Math.max(0, Math.min(distance, totalLength));
  let walked = 0;

  for (const segment of segments) {
    if (walked + segment.length >= target) {
      const t = segment.length === 0 ? 0 : (target - walked) / segment.length;
      return {
        x: segment.a.x + t * (segment.b.x - segment.a.x),
        y: segment.a.y + t * (segment.b.y - segment.a.y),
        segmentIndex: segment.index,
        orientation: segment.orientation,
      };
    }
    walked += segment.length;
  }

  const lastSegment = segments[segments.length - 1]!;
  return {
    x: lastSegment.b.x,
    y: lastSegment.b.y,
    segmentIndex: lastSegment.index,
    orientation: lastSegment.orientation,
  };
}

export function edgePathMidpoint(points: EdgePoint[]): EdgePosition {
  return edgePathPosition(points, edgePathLength(points) / 2);
}

const EDGE_ENDPOINT_CLEARANCE = 2;

function offsetToward(from: EdgePoint, to: EdgePoint, distance: number): EdgePoint {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  if (length === 0 || distance <= 0) {
    return from;
  }

  const t = Math.min(distance / length, 0.95);
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
  };
}

/** Edge polyline trimmed away from node anchors before markers are applied. */
export function edgeShaftPoints(points: EdgePoint[]): EdgePoint[] {
  if (points.length < 2) {
    return points;
  }

  const trimmed = points.map((point) => ({ ...point }));
  trimmed[0] = offsetToward(trimmed[0]!, trimmed[1]!, EDGE_ENDPOINT_CLEARANCE);
  trimmed[trimmed.length - 1] = offsetToward(
    trimmed[trimmed.length - 1]!,
    trimmed[trimmed.length - 2]!,
    EDGE_ENDPOINT_CLEARANCE,
  );

  return trimmed;
}

export function edgeShaftMidpoint(points: EdgePoint[]): EdgePosition {
  return edgePathMidpoint(edgeShaftPoints(points));
}

function isInteriorPoint(value: number, start: number, end: number): boolean {
  const min = Math.min(start, end);
  const max = Math.max(start, end);
  return value > min + EPSILON && value < max - EPSILON;
}

function isOnSegment(value: number, start: number, end: number): boolean {
  const min = Math.min(start, end);
  const max = Math.max(start, end);
  return value >= min - EPSILON && value <= max + EPSILON;
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return Math.max(Math.min(aStart, aEnd), Math.min(bStart, bEnd)) <
    Math.min(Math.max(aStart, aEnd), Math.max(bStart, bEnd)) - EPSILON;
}

export function edgeBridgeMap(edges: LayoutedEdge[]): Map<number, LayoutedEdge['bridges']> {
  const bridges = new Map<number, NonNullable<LayoutedEdge['bridges']>>();
  const segmentsByEdge = edges.map((edge) => edgeSegments(edge.points));

  for (let underIndex = 0; underIndex < edges.length; underIndex++) {
    const underSegments = segmentsByEdge[underIndex]!;

    for (let overIndex = underIndex + 1; overIndex < edges.length; overIndex++) {
      const overSegments = segmentsByEdge[overIndex]!;

      for (const overSegment of overSegments) {
        for (const underSegment of underSegments) {
          if (overSegment.orientation === underSegment.orientation) {
            continue;
          }

          const horizontal =
            overSegment.orientation === 'horizontal' ? overSegment : underSegment;
          const vertical =
            overSegment.orientation === 'vertical' ? overSegment : underSegment;

          const crossingX = vertical.a.x;
          const crossingY = horizontal.a.y;

          const crossesHorizontal = isOnSegment(crossingX, horizontal.a.x, horizontal.b.x);
          const crossesVertical = isOnSegment(crossingY, vertical.a.y, vertical.b.y);
          if (!crossesHorizontal || !crossesVertical) {
            continue;
          }

          const horizontalInterior = isInteriorPoint(crossingX, horizontal.a.x, horizontal.b.x);
          const verticalInterior = isInteriorPoint(crossingY, vertical.a.y, vertical.b.y);
          if (!horizontalInterior && !verticalInterior) {
            continue;
          }

          const bridgeSegment = horizontalInterior ? horizontal : vertical;
          const bridgeIndex = bridgeSegment === overSegment ? overIndex : underIndex;
          const edgeBridges = bridges.get(bridgeIndex) ?? [];
          const alreadyCovered = edgeBridges.some(
            (bridge) =>
              Math.abs(bridge.x - crossingX) < EPSILON &&
              Math.abs(bridge.y - crossingY) < EPSILON,
          );

          if (!alreadyCovered) {
            edgeBridges.push({
              x: crossingX,
              y: crossingY,
              segmentIndex: bridgeSegment.index,
              orientation: bridgeSegment.orientation,
            });
            bridges.set(bridgeIndex, edgeBridges);
          }
        }
      }
    }
  }

  return bridges;
}

export function edgeLabelGapIntersectsBridge(
  segment: EdgeSegment,
  labelCenter: number,
  labelHalfSpan: number,
  bridgeCenter: number,
  bridgeHalfSpan: number,
): boolean {
  if (segment.length === 0) {
    return false;
  }

  return overlaps(
    labelCenter - labelHalfSpan,
    labelCenter + labelHalfSpan,
    bridgeCenter - bridgeHalfSpan,
    bridgeCenter + bridgeHalfSpan,
  );
}
