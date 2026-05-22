import type { EdgeComponentProps } from '../types.js';
import { Line } from '../lines/Line.js';
import { edgeLineMarkerPoints, edgeLinePathData } from './edgePath.js';

export function Arrow({ edge, theme }: EdgeComponentProps) {
  if (edge.points.length < 2) {
    return null;
  }

  const pathData = edgeLinePathData(edge);
  const points = edgeLineMarkerPoints(edge);

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
