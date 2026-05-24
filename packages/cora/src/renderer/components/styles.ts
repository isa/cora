import type {
  BorderStyle,
  ComponentDimensions,
  ComponentSize,
  SizePreset,
} from './types.js';

const DEFAULT_BORDER_WIDTH = 0.5;

export const SIZE_PRESETS: Record<SizePreset, ComponentDimensions> = {
  sm: { width: 104, height: 44 },
  md: { width: 136, height: 60 },
  lg: { width: 184, height: 76 },
  xl: { width: 232, height: 100 },
  xxl: { width: 296, height: 132 },
};

export function resolveComponentSize(
  size: ComponentSize | undefined,
  fallback: ComponentDimensions,
): ComponentDimensions {
  if (!size) {
    return fallback;
  }

  return typeof size === 'string' ? SIZE_PRESETS[size] : size;
}

export function borderDasharray(
  borderStyle: BorderStyle | undefined,
  borderWidth: number | undefined,
): string | undefined {
  const width = borderWidth ?? DEFAULT_BORDER_WIDTH;

  if (borderStyle === 'dashed') {
    return `${width * 6} ${width * 4}`;
  }

  if (borderStyle === 'dotted') {
    return `${width} ${width * 4}`;
  }

  return undefined;
}

export function isNoBorder(
  borderStyle: BorderStyle | undefined,
  borderWidth: number | undefined,
): boolean {
  return borderStyle === 'none' || borderWidth === 0;
}
