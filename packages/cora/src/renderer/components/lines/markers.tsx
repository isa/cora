export type MarkerType = 'none' | 'arrow' | 'circle' | 'filledCircle';

export const MARKER_ARROW_ID = 'cora-marker-arrow';
export const MARKER_CIRCLE_ID = 'cora-marker-circle';
export const MARKER_FILLED_CIRCLE_ID = 'cora-marker-filled-circle';

export function markerUrl(marker: MarkerType | undefined): string | undefined {
  if (marker === 'arrow') {
    return `url(#${MARKER_ARROW_ID})`;
  }

  if (marker === 'circle') {
    return `url(#${MARKER_CIRCLE_ID})`;
  }

  if (marker === 'filledCircle') {
    return `url(#${MARKER_FILLED_CIRCLE_ID})`;
  }

  return undefined;
}

export function LineMarkerDefs({ color = 'currentColor' }: { color?: string }) {
  return (
    <>
      <marker
        id={MARKER_ARROW_ID}
        markerWidth="8"
        markerHeight="8"
        refX="7"
        refY="4"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <path d="M 0 0 L 8 4 L 0 8 z" fill={color} />
      </marker>
      <marker
        id={MARKER_CIRCLE_ID}
        markerWidth="8"
        markerHeight="8"
        refX="4"
        refY="4"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <circle cx="4" cy="4" r="3" fill="none" stroke={color} strokeWidth="1.5" />
      </marker>
      <marker
        id={MARKER_FILLED_CIRCLE_ID}
        markerWidth="8"
        markerHeight="8"
        refX="4"
        refY="4"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <circle cx="4" cy="4" r="3" fill={color} />
      </marker>
    </>
  );
}
