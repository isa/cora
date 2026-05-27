const DEFAULT_STROKE_WIDTH = 1;

export type LineStyle = 'solid' | 'dashed' | 'dotted';

export function lineDasharray(
  lineStyle: LineStyle | undefined,
  strokeWidth: number | undefined,
): string | undefined {
  const width = strokeWidth ?? DEFAULT_STROKE_WIDTH;

  if (lineStyle === 'dashed') {
    return `${width * 3} ${width * 1}`;
  }

  if (lineStyle === 'dotted') {
    return `${width * 0.5} ${width * 1}`;
  }

  return undefined;
}
