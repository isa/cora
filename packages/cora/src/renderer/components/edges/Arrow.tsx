import type { EdgeComponentProps } from '../types.js';
import { Line } from '../lines/Line.js';
import {
  edgeBridgeMaskPathData,
  edgeLineMarkerPoints,
  edgeLinePathData,
} from './edgePath.js';

export function Arrow({ edge, theme }: EdgeComponentProps) {
  if (edge.points.length < 2) {
    return null;
  }

  const pathData = edgeLinePathData(edge);
  const bridgeMaskPathData = edgeBridgeMaskPathData(edge);
  const points = edgeLineMarkerPoints(edge);

  return (
    <>
      <Line
        points={points}
        pathData={edgeLinePathData(edge, { trimForMarkers: true })}
        strokeColor={theme.edge.stroke}
        strokeWidth={theme.edge.strokeWidth}
      />
      <Line
        points={points}
        pathData={pathData}
        strokeColor="transparent"
        strokeWidth={0.001}
        startMarker={edge.startMarker ?? 'none'}
        endMarker={edge.endMarker ?? 'arrow'}
      />
      {bridgeMaskPathData ? (
        <>
          <Line
            points={points}
            pathData={bridgeMaskPathData}
            strokeColor={theme.background}
            strokeWidth={theme.edge.strokeWidth + 3}
          />
          <Line
            points={points}
            pathData={bridgeMaskPathData}
            strokeColor={theme.edge.stroke}
            strokeWidth={theme.edge.strokeWidth}
          />
        </>
      ) : null}
    </>
  );
}
