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
  MIN_LABELED_EDGE_STUB,
} from './decorations.js';

const EDGE_ELBOW_RADIUS = 4;
const EDGE_MARKER_RUNWAY = 24;
const EDGE_TERMINAL_CORNER_RUNWAY = 6;
const MIN_VISIBLE_ELBOW_RADIUS = 3;
const EDGE_ARROW_MARKER_DEPTH = 8;
const EDGE_MARKER_SIZE = 8;
const EDGE_CIRCLE_FILL_RADIUS = EDGE_MARKER_SIZE * 0.36;
const EDGE_CIRCLE_STROKE_WIDTH = 1.5;
const EDGE_CIRCLE_OUTER_RADIUS = EDGE_CIRCLE_FILL_RADIUS + EDGE_CIRCLE_STROKE_WIDTH / 2;
const EDGE_FILLED_CIRCLE_RADIUS = EDGE_CIRCLE_FILL_RADIUS;
const EDGE_DIAMOND_OUTER_RADIUS = EDGE_MARKER_SIZE / 2 + EDGE_CIRCLE_STROKE_WIDTH / 2;
const EDGE_FILLED_DIAMOND_RADIUS = EDGE_MARKER_SIZE / 2;
const EDGE_SQUARE_OUTER_RADIUS = EDGE_MARKER_SIZE * 0.36 + EDGE_CIRCLE_STROKE_WIDTH / 2;
const EDGE_FILLED_SQUARE_RADIUS = EDGE_MARKER_SIZE * 0.36;

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
  return edgeLineAnchorPoints(edge);
}

function markerAnchorOffset(marker: LayoutedEdge['startMarker']): number {
  if (marker === 'circle') {
    return EDGE_CIRCLE_OUTER_RADIUS;
  }

  if (marker === 'filledCircle') {
    return EDGE_FILLED_CIRCLE_RADIUS;
  }

  if (marker === 'diamond') {
    return EDGE_DIAMOND_OUTER_RADIUS;
  }

  if (marker === 'filledDiamond') {
    return EDGE_FILLED_DIAMOND_RADIUS;
  }

  if (marker === 'square') {
    return EDGE_SQUARE_OUTER_RADIUS;
  }

  if (marker === 'filledSquare') {
    return EDGE_FILLED_SQUARE_RADIUS;
  }

  return 0;
}

function markerShaftTrim(marker: LayoutedEdge['startMarker']): number {
  if (marker === 'arrow') {
    return EDGE_ARROW_MARKER_DEPTH;
  }

  if (marker === 'circle') {
    return EDGE_CIRCLE_OUTER_RADIUS;
  }

  if (marker === 'filledCircle') {
    return EDGE_FILLED_CIRCLE_RADIUS;
  }

  if (marker === 'diamond') {
    return EDGE_DIAMOND_OUTER_RADIUS;
  }

  if (marker === 'filledDiamond') {
    return EDGE_FILLED_DIAMOND_RADIUS;
  }

  if (marker === 'square') {
    return EDGE_SQUARE_OUTER_RADIUS;
  }

  if (marker === 'filledSquare') {
    return EDGE_FILLED_SQUARE_RADIUS;
  }

  return 0;
}

function edgeLineAnchorPoints(edge: LayoutedEdge): EdgePoint[] {
  const points = edgeShaftPoints(edge.points);
  if (points.length < 2) {
    return points;
  }

  const anchored = points.map((point) => ({ ...point }));
  const startOffset = markerAnchorOffset(edge.startMarker ?? 'none');
  const endOffset = markerAnchorOffset(edge.endMarker ?? 'arrow');

  anchored[0] = offsetToward(anchored[0]!, anchored[1]!, startOffset);
  anchored[anchored.length - 1] = offsetToward(
    anchored[anchored.length - 1]!,
    anchored[anchored.length - 2]!,
    endOffset,
  );

  return anchored;
}

function edgeLineVisiblePoints(edge: LayoutedEdge): EdgePoint[] {
  const points = edgeLineAnchorPoints(edge);
  if (points.length < 2) {
    return points;
  }

  const visible = points.map((point) => ({ ...point }));
  const startTrim = markerShaftTrim(edge.startMarker ?? 'none');
  const endTrim = markerShaftTrim(edge.endMarker ?? 'arrow');

  visible[0] = offsetToward(visible[0]!, visible[1]!, startTrim);
  visible[visible.length - 1] = offsetToward(
    visible[visible.length - 1]!,
    visible[visible.length - 2]!,
    endTrim,
  );

  return visible;
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
    ? Math.max(0, next.length - EDGE_TERMINAL_CORNER_RUNWAY)
    : next.length / 2;

  const radius = Math.min(EDGE_ELBOW_RADIUS, prev.length / 2, nextLimit);
  return radius >= MIN_VISIBLE_ELBOW_RADIUS ? radius : 0;
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

export function edgeLinePathData(edge: LayoutedEdge, options: { trimForMarkers?: boolean } = {}): string {
  const points = options.trimForMarkers
    ? edgeLineVisiblePoints(edge)
    : edgeLineAnchorPoints(edge);
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
        commands.push(`L ${endPoint.x} ${endPoint.y}`);
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

export function edgeBridgeMaskPathData(edge: LayoutedEdge): string {
  const points = edgeShaftPoints(edge.points);
  if (points.length === 0) {
    return '';
  }

  const commands: string[] = [];
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
    const { min, max } = decorationBounds(segment, !next);

    for (const decoration of segmentDecorations(edge, segment)) {
      if (decoration.kind !== 'bridge') {
        continue;
      }

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
      commands.push(`M ${startPoint.x} ${startPoint.y} L ${endPoint.x} ${endPoint.y}`);
    }
  }

  return commands.join(' ');
}
