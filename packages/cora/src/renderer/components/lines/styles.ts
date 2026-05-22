const DEFAULT_STROKE_WIDTH = 1;

export type LineStyle = 'solid' | 'dashed' | 'dotted';

export function lineDasharray(
  lineStyle: LineStyle | undefined,
  strokeWidth: number | undefined,
): string | undefined {
  const width = strokeWidth ?? DEFAULT_STROKE_WIDTH;

  if (lineStyle === 'dashed') {
    return `${width * 6} ${width * 4}`;
  }

  if (lineStyle === 'dotted') {
    return `${width} ${width * 4}`;
  }

  return undefined;
}
