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

export const WEBSITE_SIZE_PRESETS: Record<SizePreset, ComponentDimensions> = {
  sm: { width: 64, height: 71 },
  md: { width: 96, height: 107 },
  lg: { width: 144, height: 160 },
  xl: { width: 216, height: 240 },
  xxl: { width: 324, height: 360 },
};

export const APP_SIZE_PRESETS: Record<SizePreset, ComponentDimensions> = {
  sm: { width: 40, height: 32 },
  md: { width: 80, height: 64 },
  lg: { width: 160, height: 128 },
  xl: { width: 240, height: 192 },
  xxl: { width: 320, height: 256 },
};

export const PAGE_SIZE_PRESETS: Record<SizePreset, ComponentDimensions> = {
  sm: { width: 48, height: 64 },
  md: { width: 96, height: 128 },
  lg: { width: 192, height: 256 },
  xl: { width: 288, height: 384 },
  xxl: { width: 384, height: 512 },
};

export const LABEL_ICON_SIZE_PRESETS: Record<SizePreset, ComponentDimensions> = {
  sm: { width: 20, height: 20 },
  md: { width: 40, height: 40 },
  lg: { width: 60, height: 60 },
  xl: { width: 80, height: 80 },
  xxl: { width: 100, height: 100 },
};

export function resolveLabelIconComponentSize(
  size: ComponentSize | undefined,
  fallback: ComponentDimensions,
): ComponentDimensions {
  if (!size) {
    return fallback;
  }

  return typeof size === 'string' ? LABEL_ICON_SIZE_PRESETS[size] : size;
}

export function resolveComponentSize(
  size: ComponentSize | undefined,
  fallback: ComponentDimensions,
): ComponentDimensions {
  if (!size) {
    return fallback;
  }

  return typeof size === 'string' ? SIZE_PRESETS[size] : size;
}

export function resolveWebsiteComponentSize(
  size: ComponentSize | undefined,
  fallback: ComponentDimensions,
): ComponentDimensions {
  if (!size) {
    return fallback;
  }

  return typeof size === 'string' ? WEBSITE_SIZE_PRESETS[size] : size;
}

export function resolveAppComponentSize(
  size: ComponentSize | undefined,
  fallback: ComponentDimensions,
): ComponentDimensions {
  if (!size) {
    return fallback;
  }

  return typeof size === 'string' ? APP_SIZE_PRESETS[size] : size;
}

export function resolvePageComponentSize(
  size: ComponentSize | undefined,
  fallback: ComponentDimensions,
): ComponentDimensions {
  if (!size) {
    return fallback;
  }

  return typeof size === 'string' ? PAGE_SIZE_PRESETS[size] : size;
}

export function borderDasharray(
  borderStyle: BorderStyle | undefined,
  borderWidth: number | undefined,
): string | undefined {
  const width = borderWidth ?? DEFAULT_BORDER_WIDTH;

  if (borderStyle === 'dashed') {
    return `${width * 3} ${width * 1}`;
  }

  if (borderStyle === 'dotted') {
    return `${width * 0.5} ${width * 1}`;
  }

  return undefined;
}

export function isNoBorder(
  borderStyle: BorderStyle | undefined,
  borderWidth: number | undefined,
): boolean {
  return borderStyle === 'none' || borderWidth === 0;
}
