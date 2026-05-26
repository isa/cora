import type { SvgIconComponent } from '../icons.js';
import type { BoxStyleProps, ComponentSize } from '../types.js';
import { LOOK } from '../../themes/lookTokens.js';
import { CatalogFrame, CatalogIconSlot, CatalogText, resolvedCatalogFrame } from './shared.js';
import {
  iconNodeFallbackFrame,
  resolveIconGlyphSize,
} from './iconLayout.js';

export interface IconNodeProps extends BoxStyleProps {
  x?: number;
  y?: number;
  size?: ComponentSize;
  strokeColor?: string;
  iconColor?: string;
  icon: SvgIconComponent;
  title?: string;
  text?: string;
  subtitle?: string;
  textColor?: string;
  subtitleColor?: string;
  titleFontSize?: number;
  subtitleFontSize?: number;
}

export function IconNode({
  x,
  y,
  size,
  strokeColor,
  iconColor,
  icon,
  title,
  text,
  subtitle,
  textColor,
  subtitleColor,
  titleFontSize,
  subtitleFontSize,
  ...frameProps
}: IconNodeProps) {
  const frame = resolvedCatalogFrame({
    x,
    y,
    size,
    fallbackSize: iconNodeFallbackFrame(size),
    ...frameProps,
  });
  const glyphSize = resolveIconGlyphSize(size);
  const fillColor = iconColor ?? strokeColor ?? LOOK.components.icon.iconColor;
  const label = title ?? text ?? '';
  const gap = label.trim() || subtitle?.trim() ? 6 : 0;
  const textTop = frame.y + glyphSize + gap;
  const textHeight = Math.max(0, frame.height - glyphSize - gap);

  return (
    <CatalogFrame
      {...frameProps}
      x={x}
      y={y}
      size={size}
      fallbackSize={iconNodeFallbackFrame(size)}
    >
      <CatalogIconSlot
        icon={icon}
        x={frame.x + (frame.width - glyphSize) / 2}
        y={frame.y}
        size={glyphSize}
        color={fillColor}
        title={label}
      />
      <CatalogText
        x={frame.x}
        y={textTop}
        width={frame.width}
        height={textHeight}
        text={label}
        subtitle={subtitle}
        color={textColor}
        subtitleColor={subtitleColor}
        fontSize={titleFontSize}
        subtitleFontSize={subtitleFontSize}
        paddingX={2}
      />
    </CatalogFrame>
  );
}
