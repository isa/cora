import type {
  BorderStyle,
  ComponentDimensions,
  ComponentSize,
  SizePreset,
} from './types.js';

const DEFAULT_BORDER_WIDTH = 0.5;
export const ICON_NODE_BASE_SIZE = 96;
export const ICON_NODE_ART_SIZE = 56;

export const SIZE_PRESETS: Record<SizePreset, ComponentDimensions> = {
  sm: { width: 104, height: 44 },
  md: { width: 136, height: 60 },
  lg: { width: 184, height: 76 },
  xl: { width: 232, height: 100 },
  xxl: { width: 296, height: 132 },
};

export const WEBSITE_SIZE_PRESETS: Record<SizePreset, ComponentDimensions> = {
  sm: { width: 54, height: 60 },
  md: { width: 81, height: 90 },
  lg: { width: 108, height: 120 },
  xl: { width: 162, height: 180 },
  xxl: { width: 216, height: 240 },
};

export const ICON_NODE_SIZE_PRESETS: Record<SizePreset, ComponentDimensions> = {
  sm: { width: 48, height: 48 },
  md: { width: 72, height: 72 },
  lg: { width: 96, height: 96 },
  xl: { width: 144, height: 144 },
  xxl: { width: 192, height: 192 },
};

export const APP_SIZE_PRESETS = ICON_NODE_SIZE_PRESETS;

export const API_SIZE_PRESETS = ICON_NODE_SIZE_PRESETS;

export const DATABASE_SIZE_PRESETS = ICON_NODE_SIZE_PRESETS;

export const DOCUMENT_SIZE_PRESETS: Record<SizePreset, ComponentDimensions> = {
  sm: { width: 36, height: 48 },
  md: { width: 54, height: 72 },
  lg: { width: 72, height: 96 },
  xl: { width: 108, height: 144 },
  xxl: { width: 144, height: 192 },
};

export const LABEL_ICON_SIZE_PRESETS = ICON_NODE_SIZE_PRESETS;

export function iconNodeScale(size: ComponentDimensions): number {
  return Math.min(size.width, size.height) / ICON_NODE_BASE_SIZE;
}

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

export function resolveApiComponentSize(
  size: ComponentSize | undefined,
  fallback: ComponentDimensions,
): ComponentDimensions {
  if (!size) {
    return fallback;
  }

  return typeof size === 'string' ? API_SIZE_PRESETS[size] : size;
}

export function resolveDatabaseComponentSize(
  size: ComponentSize | undefined,
  fallback: ComponentDimensions,
): ComponentDimensions {
  if (!size) {
    return fallback;
  }

  return typeof size === 'string' ? DATABASE_SIZE_PRESETS[size] : size;
}

export function resolveDocumentComponentSize(
  size: ComponentSize | undefined,
  fallback: ComponentDimensions,
): ComponentDimensions {
  if (!size) {
    return fallback;
  }

  return typeof size === 'string' ? DOCUMENT_SIZE_PRESETS[size] : size;
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
