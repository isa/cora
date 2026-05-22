import type {
  BorderStyle,
  ComponentDimensions,
  ComponentSize,
  SizePreset,
} from './types.js';

const DEFAULT_BORDER_WIDTH = 1;

export const SIZE_PRESETS: Record<SizePreset, ComponentDimensions> = {
  sm: { width: 96, height: 40 },
  md: { width: 128, height: 56 },
  lg: { width: 176, height: 72 },
  xl: { width: 224, height: 96 },
  xxl: { width: 288, height: 128 },
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
