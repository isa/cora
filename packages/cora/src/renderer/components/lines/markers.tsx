export type MarkerType = 'none' | 'arrow' | 'circle' | 'filledCircle';

export const MARKER_ARROW_ID = 'cora-marker-arrow';
export const MARKER_CIRCLE_ID = 'cora-marker-circle';
export const MARKER_FILLED_CIRCLE_ID = 'cora-marker-filled-circle';

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
  return (
    <>
      <marker
        id={withSuffix(MARKER_ARROW_ID, idSuffix)}
        markerWidth={size}
        markerHeight={size}
        refX={0}
        refY={center}
        orient="auto"
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
        orient="auto"
        markerUnits="userSpaceOnUse"
      >
        <circle cx={center} cy={center} r={circleRadius} fill="none" stroke={color} strokeWidth="1.5" />
      </marker>
      <marker
        id={withSuffix(MARKER_FILLED_CIRCLE_ID, idSuffix)}
        markerWidth={size}
        markerHeight={size}
        refX={center}
        refY={center}
        orient="auto"
        markerUnits="userSpaceOnUse"
      >
        <circle cx={center} cy={center} r={circleRadius} fill={color} />
      </marker>
    </>
  );
}
