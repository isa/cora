import {
  edgeLabelGapIntersectsBridge,
  edgeSegments,
  edgeShaftPoints,
  type EdgePoint,
  type EdgeSegment,
} from '../../../core/edgeGeometry.js';
import type { LayoutedEdge } from '../../../layout-ir.js';
import type { EdgeComponentProps } from '../types.js';
import { Line } from '../lines/Line.js';
import {
  bridgeHalfSpan,
  edgeLabelGapHalfSpan,
  edgeLabelUsesPathGap,
  EDGE_BRIDGE_HEIGHT,
  MIN_LABELED_EDGE_STUB,
} from './decorations.js';

const EDGE_ENDPOINT_CLEARANCE = 2;
const ARROW_HEAD_SIZE = 5;

type SegmentDecoration =
  | { kind: 'gap'; center: number; halfSpan: number }
  | { kind: 'bridge'; center: number; halfSpan: number };

function arrowHead(
  from: { x: number; y: number },
  to: { x: number; y: number },
): string {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const x1 = to.x - ARROW_HEAD_SIZE * Math.cos(angle - Math.PI / 6);
  const y1 = to.y - ARROW_HEAD_SIZE * Math.sin(angle - Math.PI / 6);
  const x2 = to.x - ARROW_HEAD_SIZE * Math.cos(angle + Math.PI / 6);
  const y2 = to.y - ARROW_HEAD_SIZE * Math.sin(angle + Math.PI / 6);
  return `${to.x},${to.y} ${x1},${y1} ${x2},${y2}`;
}

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

function displayTipPoints(edge: LayoutedEdge): EdgePoint[] {
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

function shaftPoints(edge: LayoutedEdge): EdgePoint[] {
  return edgeShaftPoints(edge.points);
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

function buildPathData(edge: LayoutedEdge): string {
  const points = shaftPoints(edge);
  if (points.length === 0) {
    return '';
  }

  const commands = [`M ${points[0]!.x} ${points[0]!.y}`];
  const segments = edgeSegments(points);

  for (const segment of segments) {
    let cursor = segment.a;
    const segmentStart = axisValue(segment.a, segment.orientation);
    const segmentEnd = axisValue(segment.b, segment.orientation);
    const min = Math.min(segmentStart, segmentEnd);
    const max = Math.max(segmentStart, segmentEnd);

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
  }

  return commands.join(' ');
}

export function Arrow({ edge, theme }: EdgeComponentProps) {
  if (edge.points.length < 2) {
    return null;
  }

  const pathData = buildPathData(edge);
  const points = displayTipPoints(edge);

  return (
    <Line
      points={points}
      pathData={pathData}
      strokeColor={theme.edge.stroke}
      strokeWidth={theme.edge.strokeWidth}
      endMarker="arrow"
    />
  );
}
