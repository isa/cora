import type { ComponentSize, SizePreset } from '../types.js';
import { resolveComponentSize } from '../styles.js';

/** Base icon glyph size at the `md` preset (preview + catalog). */
export const ICON_MD_GLYPH = 48;

const PRESET_MULTIPLIER: Record<SizePreset, number> = {
  sm: 0.5,
  md: 1,
  lg: 1.5,
  xl: 2,
  xxl: 2.5,
};

export function iconGlyphMultiplier(preset: SizePreset | string | undefined): number {
  if (preset && preset in PRESET_MULTIPLIER) {
    return PRESET_MULTIPLIER[preset as SizePreset];
  }
  return 1;
}

export function resolveIconGlyphSize(size?: ComponentSize, fallbackPreset: SizePreset = 'md'): number {
  if (typeof size === 'object' && size) {
    return Math.max(24, Math.round(Math.min(size.width, size.height)));
  }
  const preset = typeof size === 'string' ? size : fallbackPreset;
  return Math.round(ICON_MD_GLYPH * iconGlyphMultiplier(preset));
}

export function iconNodeFallbackFrame(size?: ComponentSize): { width: number; height: number } {
  const glyph = resolveIconGlyphSize(size);
  return { width: Math.max(glyph, 72), height: glyph + 28 };
}

export function estimateIconTextBlock(
  title: string,
  subtitle: string,
  titleFontSize: number,
  subtitleFontSize: number,
): { width: number; height: number } {
  const titleLines = title.trim() ? title.split(/\r?\n/) : [];
  const subtitleLines = subtitle.trim() ? subtitle.split(/\r?\n/) : [];
  const longestTitle = Math.max(...titleLines.map((line) => line.length), title.trim() ? 1 : 0);
  const longestSubtitle = Math.max(...subtitleLines.map((line) => line.length), subtitle.trim() ? 1 : 0);
  const width = Math.ceil(
    Math.max(longestTitle * titleFontSize * 0.56, longestSubtitle * subtitleFontSize * 0.56, 0) + 8,
  );
  let height = 0;
  if (title.trim()) {
    height += titleLines.length * titleFontSize * 1.25;
  }
  if (subtitle.trim()) {
    height += (title.trim() ? 2 : 0) + subtitleLines.length * subtitleFontSize * 1.25;
  }
  return { width, height: Math.ceil(height) };
}

export function resolveIconNodeDimensions(
  size: ComponentSize | undefined,
  title: string,
  subtitle: string,
  titleFontSize: number,
  subtitleFontSize: number,
): { width: number; height: number } {
  const glyph = resolveIconGlyphSize(size);
  const text = estimateIconTextBlock(title, subtitle, titleFontSize, subtitleFontSize);
  const gap = text.height > 0 ? 6 : 0;
  return {
    width: Math.max(glyph, text.width),
    height: glyph + gap + text.height + (text.height > 0 ? 4 : 0),
  };
}
