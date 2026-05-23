import { markerUrl, type MarkerType } from './markers.js';
import { lineDasharray, type LineStyle } from './styles.js';

export interface LineProps {
  points: Array<{ x: number; y: number }>;
  pathData?: string;
  lineStyle?: LineStyle;
  strokeColor?: string;
  strokeWidth?: number;
  startMarker?: MarkerType;
  endMarker?: MarkerType;
  markerIdSuffix?: string;
}

function segmentLength(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function offsetToward(
  from: { x: number; y: number },
  to: { x: number; y: number },
  distance: number,
): { x: number; y: number } {
  const length = segmentLength(from, to);
  if (length === 0) {
    return from;
  }
  const t = Math.min(distance / length, 0.5);
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
  };
}

function isOrthogonalCorner(
  previous: { x: number; y: number },
  current: { x: number; y: number },
  next: { x: number; y: number },
): boolean {
  const prevHorizontal = previous.y === current.y;
  const prevVertical = previous.x === current.x;
  const nextHorizontal = next.y === current.y;
  const nextVertical = next.x === current.x;

  return (prevHorizontal && nextVertical) || (prevVertical && nextHorizontal);
}

export function linePathData(points: LineProps['points'], cornerRadius = 8): string {
  if (points.length === 0) {
    return '';
  }

  if (points.length < 3 || cornerRadius <= 0) {
    const [first, ...rest] = points;
    return [
      `M ${first!.x} ${first!.y}`,
      ...rest.map((point) => `L ${point.x} ${point.y}`),
    ].join(' ');
  }

  const commands = [`M ${points[0]!.x} ${points[0]!.y}`];

  for (let index = 1; index < points.length - 1; index++) {
    const previous = points[index - 1]!;
    const current = points[index]!;
    const next = points[index + 1]!;

    if (!isOrthogonalCorner(previous, current, next)) {
      commands.push(`L ${current.x} ${current.y}`);
      continue;
    }

    const radius = Math.min(
      cornerRadius,
      segmentLength(previous, current) / 2,
      segmentLength(current, next) / 2,
    );

    if (radius < 2) {
      commands.push(`L ${current.x} ${current.y}`);
      continue;
    }

    const beforeCorner = offsetToward(current, previous, radius);
    const afterCorner = offsetToward(current, next, radius);
    commands.push(`L ${beforeCorner.x} ${beforeCorner.y}`);
    commands.push(`Q ${current.x} ${current.y} ${afterCorner.x} ${afterCorner.y}`);
  }

  const last = points[points.length - 1]!;
  commands.push(`L ${last.x} ${last.y}`);
  return commands.join(' ');
}

export function Line({
  points,
  pathData: explicitPathData,
  lineStyle = 'solid',
  strokeColor = 'currentColor',
  strokeWidth = 1,
  startMarker,
  endMarker,
  markerIdSuffix,
}: LineProps) {
  if (points.length < 2) {
    return null;
  }

  return (
    <path
      d={explicitPathData ?? linePathData(points)}
      fill="none"
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      strokeDasharray={lineDasharray(lineStyle, strokeWidth)}
      markerStart={markerUrl(startMarker, markerIdSuffix)}
      markerEnd={markerUrl(endMarker, markerIdSuffix)}
    />
  );
}
