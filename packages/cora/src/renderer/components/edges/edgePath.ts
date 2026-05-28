import {
  edgeLabelGapIntersectsBridge,
  edgeSegments,
  edgeShaftPoints,
  type EdgePoint,
  type EdgeSegment,
} from '../../../core/edgeGeometry.js';
import {
  effectiveEndMarker,
  effectiveStartMarker,
  markerAnchorOffset,
  markerShaftTrim,
} from '../../../core/edgeMarkers.js';
import type { LayoutedEdge } from '../../../layout-ir.js';
import {
  bridgeHalfSpan,
  edgeLabelGapHalfSpan,
  edgeLabelUsesPathGap,
  MIN_LABELED_EDGE_STUB,
} from './decorations.js';

const EDGE_MARKER_RUNWAY = 11;

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

export function edgeLineMarkerPoints(edge: LayoutedEdge): EdgePoint[] {
  return edgeLineAnchorPoints(edge);
}

export function edgeMarkerCarrierPathData(edge: LayoutedEdge): string {
  const points = edgeLineAnchorPoints(edge);
  if (points.length === 0) {
    return '';
  }

  const commands = [`M ${points[0]!.x} ${points[0]!.y}`];
  for (const point of points.slice(1)) {
    commands.push(`L ${point.x} ${point.y}`);
  }

  return commands.join(' ');
}

function edgeLineBasePoints(edge: LayoutedEdge): EdgePoint[] {
  const points = edgeShaftPoints(edge.points);
  if (points.length < 2) {
    return points;
  }

  const anchored = points.map((point) => ({ ...point }));
  const startOffset = markerAnchorOffset(effectiveStartMarker(edge.startMarker));
  const endOffset = markerAnchorOffset(effectiveEndMarker(edge.endMarker));

  anchored[0] = offsetToward(anchored[0]!, anchored[1]!, startOffset);
  anchored[anchored.length - 1] = offsetToward(
    anchored[anchored.length - 1]!,
    anchored[anchored.length - 2]!,
    endOffset,
  );

  return anchored;
}

function edgeLineAnchorPoints(edge: LayoutedEdge): EdgePoint[] {
  return edgeLineBasePoints(edge);
}

function edgeLineVisiblePoints(edge: LayoutedEdge): EdgePoint[] {
  const points = edgeLineBasePoints(edge);
  if (points.length < 2) {
    return points;
  }

  const visible = points.map((point) => ({ ...point }));
  const startTrim = markerShaftTrim(effectiveStartMarker(edge.startMarker));
  const endTrim = markerShaftTrim(effectiveEndMarker(edge.endMarker));

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
      labelPlacement &&
      labelPlacement.segmentIndex === segment.index &&
      labelPlacement.orientation === segment.orientation &&
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
    const segment = segments[index]!;
    const next = segments[index + 1];

    let cursor = segment.a;
    const { min, max } = decorationBounds(segment, !next);

    if (!samePoint(commands.length === 1 ? points[0]! : cursor, segment.a)) {
      commands.push(`L ${segment.a.x} ${segment.a.y}`);
    }

    const segmentStartScalar = axisValue(segment.a, segment.orientation);
    const segmentEndScalar = axisValue(segment.b, segment.orientation);
    const segmentMin = Math.min(segmentStartScalar, segmentEndScalar);
    const segmentMax = Math.max(segmentStartScalar, segmentEndScalar);
    const isReversed = segmentEndScalar < segmentStartScalar;

    for (const decoration of segmentDecorations(edge, segment)) {
      // Labels always use their full half-span (clamped only to segment bounds)
      // so the shaft is never drawn inside the visual label pill, even on short
      // segments where the marker runway / stub would otherwise eat the gap.
      const effectiveHalfSpan = decoration.kind === 'gap'
        ? decoration.halfSpan
        : Math.max(
            0,
            Math.min(
              decoration.halfSpan,
              segment.length / 2 - MIN_LABELED_EDGE_STUB,
            ),
          );
      if (effectiveHalfSpan <= 0) {
        continue;
      }

      const lowerBound = decoration.kind === 'gap' ? segmentMin : min;
      const upperBound = decoration.kind === 'gap' ? segmentMax : max;
      const lowScalar = Math.max(lowerBound, decoration.center - effectiveHalfSpan);
      const highScalar = Math.min(upperBound, decoration.center + effectiveHalfSpan);
      if (highScalar <= lowScalar) {
        continue;
      }
      // Direction-aware: startScalar must be closer to segment.a, endScalar
      // closer to segment.b. Segments with a > b (e.g., upward verticals or
      // right-to-left horizontals) flip the natural [low, high] ordering.
      const startScalar = isReversed ? highScalar : lowScalar;
      const endScalar = isReversed ? lowScalar : highScalar;
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
    const segment = segments[index]!;
    const next = segments[index + 1];
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
