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

export function linePathData(points: LineProps['points'], _cornerRadius = 0): string {
  if (points.length === 0) {
    return '';
  }

  const [first, ...rest] = points;
  return [
    `M ${first!.x} ${first!.y}`,
    ...rest.map((point) => `L ${point.x} ${point.y}`),
  ].join(' ');
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
      markerStart={markerUrl(startMarker, 'start', markerIdSuffix)}
      markerEnd={markerUrl(endMarker, 'end', markerIdSuffix)}
    />
  );
}
