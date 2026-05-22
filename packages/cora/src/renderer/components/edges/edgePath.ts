import {
  edgeLabelGapIntersectsBridge,
  edgeSegments,
  edgeShaftPoints,
  type EdgePoint,
  type EdgeSegment,
} from '../../../core/edgeGeometry.js';
import type { LayoutedEdge } from '../../../layout-ir.js';
import {
  bridgeHalfSpan,
  edgeLabelGapHalfSpan,
  edgeLabelUsesPathGap,
  EDGE_BRIDGE_HEIGHT,
  MIN_LABELED_EDGE_STUB,
} from './decorations.js';

const EDGE_ENDPOINT_CLEARANCE = 2;
const EDGE_ELBOW_RADIUS = 8;
const EDGE_MARKER_RUNWAY = 18;

type SegmentDecoration =
  | { kind: 'gap'; center: number; halfSpan: number }
  | { kind: 'bridge'; center: number; halfSpan: number };

function axisValue(point: EdgePoint, orientation: EdgeSegment['orientation']): number {
  return orientation === 'horizontal' ? point.x : point.y;
}

function pointOnSegment(
  segment: EdgeSegment,
  scalar: number,
): EdgePoint {
  return segment.orientation === 'horizontal'
    ? { x: scalar, y: segment.a.y }
    : { x: segment.a.x, y: scalar };
}

function controlPoint(
  segment: EdgeSegment,
  center: number,
): EdgePoint {
  return segment.orientation === 'horizontal'
    ? { x: center, y: segment.a.y - EDGE_BRIDGE_HEIGHT }
    : { x: segment.a.x + EDGE_BRIDGE_HEIGHT, y: center };
}

function samePoint(a: EdgePoint, b: EdgePoint): boolean {
  return Math.abs(a.x - b.x) < 0.001 && Math.abs(a.y - b.y) < 0.001;
}

function segmentLength(a: EdgePoint, b: EdgePoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function offsetToward(from: EdgePoint, to: EdgePoint, distance: number): EdgePoint {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  if (length === 0 || distance <= 0) {
    return from;
  }

  const t = Math.min(distance / length, 0.49);
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
  };
}

export function edgeLineMarkerPoints(edge: LayoutedEdge): EdgePoint[] {
  if (edge.points.length < 2) {
    return edge.points;
  }

  const points = edge.points.map((point) => ({ ...point }));
  points[0] = offsetToward(points[0]!, points[1]!, EDGE_ENDPOINT_CLEARANCE);
  points[points.length - 1] = offsetToward(
    points[points.length - 1]!,
    points[points.length - 2]!,
    EDGE_ENDPOINT_CLEARANCE,
  );
  return points;
}

function segmentDecorations(edge: LayoutedEdge, segment: EdgeSegment): SegmentDecoration[] {
  const decorations: SegmentDecoration[] = [];
  const labelPlacement = edge.labelPlacement;
  const labelCenter = labelPlacement
    ? axisValue(labelPlacement, labelPlacement.orientation)
    : undefined;
  const labelHalfSpan = labelPlacement
    ? edgeLabelGapHalfSpan(labelPlacement)
    : undefined;

  if (
    labelPlacement &&
    edgeLabelUsesPathGap(labelPlacement) &&
    labelPlacement.segmentIndex === segment.index &&
    labelPlacement.orientation === segment.orientation
  ) {
    decorations.push({
      kind: 'gap',
      center: labelCenter!,
      halfSpan: labelHalfSpan!,
    });
  }

  for (const bridge of edge.bridges ?? []) {
    if (
      bridge.segmentIndex !== segment.index ||
      bridge.orientation !== segment.orientation
    ) {
      continue;
    }

    const bridgeCenter = axisValue(bridge, bridge.orientation);
    const bridgeHalfWidth = bridgeHalfSpan(bridge);
    if (
      labelCenter !== undefined &&
      labelHalfSpan !== undefined &&
      edgeLabelGapIntersectsBridge(
        segment,
        labelCenter,
        labelHalfSpan,
        bridgeCenter,
        bridgeHalfWidth,
      )
    ) {
      continue;
    }

    decorations.push({
      kind: 'bridge',
      center: bridgeCenter,
      halfSpan: bridgeHalfWidth,
    });
  }

  return decorations.sort((a, b) => {
    const segmentStart = axisValue(segment.a, segment.orientation);
    const segmentDelta =
      axisValue(segment.b, segment.orientation) - segmentStart;
    const aT = segmentDelta === 0 ? 0 : (a.center - segmentStart) / segmentDelta;
    const bT = segmentDelta === 0 ? 0 : (b.center - segmentStart) / segmentDelta;
    return aT - bT;
  });
}

function cornerRadius(prev: EdgeSegment, next: EdgeSegment, nextEndsAtMarker: boolean): number {
  if (prev.orientation === next.orientation) {
    return 0;
  }

  const nextLimit = nextEndsAtMarker
    ? Math.max(0, next.length - EDGE_MARKER_RUNWAY)
    : next.length / 2;

  return Math.min(EDGE_ELBOW_RADIUS, prev.length / 2, nextLimit);
}

function roundedSegmentPoints(
  segment: EdgeSegment,
  previous: EdgeSegment | undefined,
  next: EdgeSegment | undefined,
  nextEndsAtMarker: boolean,
): { a: EdgePoint; b: EdgePoint; nextStart?: EdgePoint } {
  const segmentEndsAtMarker = !next;
  const startRadius = previous ? cornerRadius(previous, segment, segmentEndsAtMarker) : 0;
  const endRadius = next ? cornerRadius(segment, next, nextEndsAtMarker) : 0;

  return {
    a: startRadius > 0 ? offsetToward(segment.a, segment.b, startRadius) : segment.a,
    b: endRadius > 0 ? offsetToward(segment.b, segment.a, endRadius) : segment.b,
    nextStart: next && endRadius > 0 ? offsetToward(segment.b, next.b, endRadius) : undefined,
  };
}

function decorationBounds(
  segment: EdgeSegment,
  endsAtMarker: boolean,
): { min: number; max: number } {
  const segmentStart = axisValue(segment.a, segment.orientation);
  const segmentEnd = axisValue(segment.b, segment.orientation);
  let min = Math.min(segmentStart, segmentEnd);
  let max = Math.max(segmentStart, segmentEnd);

  if (!endsAtMarker) {
    return { min, max };
  }

  if (segmentEnd >= segmentStart) {
    max = Math.max(min, segmentEnd - EDGE_MARKER_RUNWAY);
  } else {
    min = Math.min(max, segmentEnd + EDGE_MARKER_RUNWAY);
  }

  return { min, max };
}

export function edgeLinePathData(edge: LayoutedEdge): string {
  const points = edgeShaftPoints(edge.points);
  if (points.length === 0) {
    return '';
  }

  const commands = [`M ${points[0]!.x} ${points[0]!.y}`];
  const segments = edgeSegments(points);

  for (let index = 0; index < segments.length; index++) {
    const originalSegment = segments[index]!;
    const previous = segments[index - 1];
    const next = segments[index + 1];
    const rounded = roundedSegmentPoints(
      originalSegment,
      previous,
      next,
      index + 1 === segments.length - 1,
    );
    const segment: EdgeSegment = {
      ...originalSegment,
      a: rounded.a,
      b: rounded.b,
      length: segmentLength(rounded.a, rounded.b),
    };

    let cursor = segment.a;
    const { min, max } = decorationBounds(segment, !next);

    if (!samePoint(commands.length === 1 ? points[0]! : cursor, segment.a)) {
      commands.push(`L ${segment.a.x} ${segment.a.y}`);
    }

    for (const decoration of segmentDecorations(edge, segment)) {
      const effectiveHalfSpan = Math.max(
        0,
        Math.min(
          decoration.halfSpan,
          segment.length / 2 - MIN_LABELED_EDGE_STUB,
        ),
      );
      if (effectiveHalfSpan <= 0) {
        continue;
      }

      const startScalar = Math.max(min, decoration.center - effectiveHalfSpan);
      const endScalar = Math.min(max, decoration.center + effectiveHalfSpan);
      if (endScalar <= startScalar) {
        continue;
      }
      const startPoint = pointOnSegment(segment, startScalar);
      const endPoint = pointOnSegment(segment, endScalar);

      if (!samePoint(cursor, startPoint)) {
        commands.push(`L ${startPoint.x} ${startPoint.y}`);
      }

      if (decoration.kind === 'gap') {
        commands.push(`M ${endPoint.x} ${endPoint.y}`);
      } else {
        const control = controlPoint(segment, decoration.center);
        commands.push(`Q ${control.x} ${control.y} ${endPoint.x} ${endPoint.y}`);
      }

      cursor = endPoint;
    }

    if (!samePoint(cursor, segment.b)) {
      commands.push(`L ${segment.b.x} ${segment.b.y}`);
    }

    if (rounded.nextStart) {
      commands.push(
        `Q ${originalSegment.b.x} ${originalSegment.b.y} ${rounded.nextStart.x} ${rounded.nextStart.y}`,
      );
    }
  }

  return commands.join(' ');
}
