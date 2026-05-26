export type MarkerType =
  | 'none'
  | 'arrow'
  | 'circle'
  | 'filledCircle'
  | 'diamond'
  | 'filledDiamond'
  | 'square'
  | 'filledSquare';

export const MARKER_ARROW_ID = 'cora-marker-arrow';
export const MARKER_CIRCLE_ID = 'cora-marker-circle';
export const MARKER_FILLED_CIRCLE_ID = 'cora-marker-filled-circle';
export const MARKER_DIAMOND_ID = 'cora-marker-diamond';
export const MARKER_FILLED_DIAMOND_ID = 'cora-marker-filled-diamond';
export const MARKER_SQUARE_ID = 'cora-marker-square';
export const MARKER_FILLED_SQUARE_ID = 'cora-marker-filled-square';

function withSuffix(id: string, suffix: string | undefined): string {
  return suffix ? `${id}-${suffix}` : id;
}

export function markerUrl(marker: MarkerType | undefined, idSuffix?: string): string | undefined {
  if (marker === 'arrow') {
    return `url(#${withSuffix(MARKER_ARROW_ID, idSuffix)})`;
  }

  if (marker === 'circle') {
    return `url(#${withSuffix(MARKER_CIRCLE_ID, idSuffix)})`;
  }

  if (marker === 'filledCircle') {
    return `url(#${withSuffix(MARKER_FILLED_CIRCLE_ID, idSuffix)})`;
  }

  if (marker === 'diamond') {
    return `url(#${withSuffix(MARKER_DIAMOND_ID, idSuffix)})`;
  }

  if (marker === 'filledDiamond') {
    return `url(#${withSuffix(MARKER_FILLED_DIAMOND_ID, idSuffix)})`;
  }

  if (marker === 'square') {
    return `url(#${withSuffix(MARKER_SQUARE_ID, idSuffix)})`;
  }

  if (marker === 'filledSquare') {
    return `url(#${withSuffix(MARKER_FILLED_SQUARE_ID, idSuffix)})`;
  }

  return undefined;
}

export function LineMarkerDefs({
  color = 'currentColor',
  markerSize = 8,
  idSuffix,
}: {
  color?: string;
  markerSize?: number;
  idSuffix?: string;
}) {
  const size = Math.max(4, markerSize);
  const center = size / 2;
  const circleRadius = Math.max(2, size * 0.36);
  const circleStrokeWidth = 1.5;
  const squareSize = Math.max(3, size * 0.72);
  const squareOffset = (size - squareSize) / 2;
  return (
    <>
      <marker
        id={withSuffix(MARKER_ARROW_ID, idSuffix)}
        markerWidth={size}
        markerHeight={size}
        refX={size}
        refY={center}
        orient="auto-start-reverse"
        markerUnits="userSpaceOnUse"
      >
        <path d={`M 0 0 L ${size} ${center} L 0 ${size} z`} fill={color} />
      </marker>
      <marker
        id={withSuffix(MARKER_CIRCLE_ID, idSuffix)}
        markerWidth={size}
        markerHeight={size}
        refX={center}
        refY={center}
        orient="auto-start-reverse"
        markerUnits="userSpaceOnUse"
      >
        <circle cx={center} cy={center} r={circleRadius} fill="none" stroke={color} strokeWidth={circleStrokeWidth} />
      </marker>
      <marker
        id={withSuffix(MARKER_FILLED_CIRCLE_ID, idSuffix)}
        markerWidth={size}
        markerHeight={size}
        refX={center}
        refY={center}
        orient="auto-start-reverse"
        markerUnits="userSpaceOnUse"
      >
        <circle cx={center} cy={center} r={circleRadius} fill={color} />
      </marker>
      <marker
        id={withSuffix(MARKER_DIAMOND_ID, idSuffix)}
        markerWidth={size}
        markerHeight={size}
        refX={center}
        refY={center}
        orient="auto-start-reverse"
        markerUnits="userSpaceOnUse"
      >
        <path
          d={`M ${center} 0 L ${size} ${center} L ${center} ${size} L 0 ${center} Z`}
          fill="none"
          stroke={color}
          strokeWidth={circleStrokeWidth}
        />
      </marker>
      <marker
        id={withSuffix(MARKER_FILLED_DIAMOND_ID, idSuffix)}
        markerWidth={size}
        markerHeight={size}
        refX={center}
        refY={center}
        orient="auto-start-reverse"
        markerUnits="userSpaceOnUse"
      >
        <path d={`M ${center} 0 L ${size} ${center} L ${center} ${size} L 0 ${center} Z`} fill={color} />
      </marker>
      <marker
        id={withSuffix(MARKER_SQUARE_ID, idSuffix)}
        markerWidth={size}
        markerHeight={size}
        refX={center}
        refY={center}
        orient="auto-start-reverse"
        markerUnits="userSpaceOnUse"
      >
        <rect
          x={squareOffset}
          y={squareOffset}
          width={squareSize}
          height={squareSize}
          fill="none"
          stroke={color}
          strokeWidth={circleStrokeWidth}
        />
      </marker>
      <marker
        id={withSuffix(MARKER_FILLED_SQUARE_ID, idSuffix)}
        markerWidth={size}
        markerHeight={size}
        refX={center}
        refY={center}
        orient="auto-start-reverse"
        markerUnits="userSpaceOnUse"
      >
        <rect x={squareOffset} y={squareOffset} width={squareSize} height={squareSize} fill={color} />
      </marker>
    </>
  );
}
