import type { ReactNode } from 'react';

import {
  CATALOG_TEXT_SUBTITLE_GAP,
  resolveCatalogTextLayout,
} from '../../../core/catalogTextLayout.js';
import { baselineYForVisualCenter } from '../../../core/measureText.js';
import { LOOK } from '../../themes/lookTokens.js';
import { NODE_TITLE_SIZE, NODE_SUBTITLE_SIZE } from '../../themes/fontTokens.js';
import type { ResolvedStyle, ThemeTokens } from '../../../layout-ir.js';
import { escapeXml, FONT_FAMILY } from '../../utils.js';
import type { SvgIconComponent } from '../icons.js';
import { borderDasharray, isNoBorder, resolveComponentSize } from '../styles.js';
import type { BoxStyleProps, ComponentDimensions, NodeComponentProps, NodeShadow } from '../types.js';

export function strokeWidth(style: ResolvedStyle): number {
  return style.strokeWidth ?? 0.75;
}

export function NodeLabel({ node, theme }: NodeComponentProps) {
  const style = node.resolvedStyle;
  const fill = style?.labelFill ?? theme.nodeLabel.fill;
  const lines = (node.label ?? '').split(/\r?\n/);
  const fontSize = theme.nodeLabel.fontSize;
  const lineHeight = fontSize * 1.25;
  const totalHeight = lines.length * lineHeight;
  const firstLineCenter = node.y + node.measuredHeight / 2 - totalHeight / 2 + lineHeight / 2;
  const firstBaseline = baselineYForVisualCenter(firstLineCenter, fontSize, 'node');

  return (
    <text
      x={node.x + node.measuredWidth / 2}
      y={firstBaseline}
      textAnchor="middle"
      fontFamily={FONT_FAMILY}
      fontSize={fontSize}
      fontWeight={theme.nodeLabel.fontWeight}
      fill={fill}
    >
      {lines.map((line, index) => (
        <tspan key={index} x={node.x + node.measuredWidth / 2} dy={index === 0 ? 0 : lineHeight}>
          {escapeXml(line)}
        </tspan>
      ))}
    </text>
  );
}

export function ShapeShadow({
  theme,
  hasShadow,
  renderShape,
}: {
  theme: ThemeTokens;
  hasShadow: boolean;
  renderShape: (offsetX: number, offsetY: number) => ReactNode;
}) {
  if (!hasShadow) return null;
  const { x: dx, y: dy } = theme.shadowOffset;
  return <g filter="url(#cora-shadow-blur)">{renderShape(dx, dy)}</g>;
}

export interface CatalogNodeFrameProps extends BoxStyleProps {
  x?: number;
  y?: number;
  fallbackSize?: ComponentDimensions;
  children?: ReactNode;
}

export interface CatalogIconSlotProps {
  icon: SvgIconComponent;
  x: number;
  y: number;
  size: number;
  color: string;
  title?: string;
}

export const DEFAULT_CATALOG_SIZE: ComponentDimensions = { width: 128, height: 56 };

export function resolvedCatalogFrame(props: CatalogNodeFrameProps) {
  const size = resolveComponentSize(props.size, props.fallbackSize ?? DEFAULT_CATALOG_SIZE);
  const borderWidth = props.borderWidth ?? 1;
  const noBorder = isNoBorder(props.borderStyle, props.borderWidth);

  return {
    x: props.x ?? 0,
    y: props.y ?? 0,
    width: size.width,
    height: size.height,
    radius: props.radius ?? LOOK.radius.md,
    backgroundColor: props.backgroundColor ?? LOOK.surface.fill,
    borderColor: noBorder ? undefined : props.borderColor ?? LOOK.border.default,
    borderWidth: noBorder ? undefined : borderWidth,
    borderDasharray: noBorder ? undefined : borderDasharray(props.borderStyle, borderWidth),
    text: props.title ?? props.text,
    subtitle: props.subtitle,
    textColor: props.textColor ?? LOOK.text.primary,
    subtitleColor: props.subtitleColor ?? LOOK.text.muted,
    titleFontSize: props.titleFontSize,
    subtitleFontSize: props.subtitleFontSize,
    titleBold: props.titleBold ?? false,
    subtitleBold: props.subtitleBold ?? false,
    shadow: props.shadow ?? 'none',
    shadowColor: props.shadowColor,
  };
}

function darkerColor(color: string): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(color.trim());
  if (!match) {
    return '#0f172a';
  }
  const hex = match[1]!;
  const channels = [0, 2, 4].map((index) => parseInt(hex.slice(index, index + 2), 16));
  const darkened = channels
    .map((channel) => Math.max(0, Math.round(channel * 0.48)).toString(16).padStart(2, '0'))
    .join('');
  return `#${darkened}`;
}

function shadowRects({
  x,
  y,
  width,
  height,
  radius,
  fill,
  shadow,
  shadowColor,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  fill: string;
  shadow: NodeShadow;
  shadowColor?: string;
}) {
  if (shadow === 'none') {
    return null;
  }
  const shadowFill = shadowColor || darkerColor(fill);

  if (shadow === 'cast') {
    return (
      <rect
        x={x + 3}
        y={y + 4}
        width={width}
        height={height}
        rx={radius}
        ry={radius}
        fill={shadowFill}
        opacity="0.28"
        data-shadow="cast"
      />
    );
  }

  return (
    <g data-shadow="radial">
      {[
        { spread: 10, opacity: 0.045 },
        { spread: 5, opacity: 0.075 },
      ].map((layer) => (
        <rect
          key={layer.spread}
          x={x - layer.spread}
          y={y - layer.spread}
          width={width + layer.spread * 2}
          height={height + layer.spread * 2}
          rx={radius + layer.spread}
          ry={radius + layer.spread}
          fill={shadowFill}
          opacity={layer.opacity}
        />
      ))}
    </g>
  );
}

export function CatalogShadow({
  x,
  y,
  width,
  height,
  radius,
  fill,
  shadow = 'none',
  shadowColor,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  fill: string;
  shadow?: NodeShadow;
  shadowColor?: string;
}) {
  return shadowRects({ x, y, width, height, radius, fill, shadow, shadowColor });
}

export function CatalogPolygonShadow({
  points,
  fill,
  shadow = 'none',
  shadowColor,
}: {
  points: string;
  fill: string;
  shadow?: NodeShadow;
  shadowColor?: string;
}) {
  if (shadow === 'none') {
    return null;
  }
  const shadowFill = shadowColor || darkerColor(fill);

  if (shadow === 'cast') {
    return (
      <polygon
        points={points}
        transform="translate(3 4)"
        fill={shadowFill}
        opacity="0.28"
        data-shadow="cast"
      />
    );
  }

  return (
    <g data-shadow="radial">
      {[
        { strokeWidth: 18, opacity: 0.04 },
        { strokeWidth: 9, opacity: 0.07 },
      ].map((layer) => (
        <polygon
          key={layer.strokeWidth}
          points={points}
          fill={shadowFill}
          stroke={shadowFill}
          strokeWidth={layer.strokeWidth}
          strokeLinejoin="round"
          opacity={layer.opacity}
        />
      ))}
    </g>
  );
}

export function CatalogFrame(props: CatalogNodeFrameProps) {
  const frame = resolvedCatalogFrame(props);

  return (
    <g>
      <CatalogShadow
        x={frame.x}
        y={frame.y}
        width={frame.width}
        height={frame.height}
        radius={frame.radius}
        fill={frame.backgroundColor}
        shadow={frame.shadow}
        shadowColor={frame.shadowColor}
      />
      <rect
        x={frame.x}
        y={frame.y}
        width={frame.width}
        height={frame.height}
        rx={frame.radius}
        ry={frame.radius}
        fill={frame.backgroundColor}
        stroke={frame.borderColor}
        strokeWidth={frame.borderWidth}
        strokeDasharray={frame.borderDasharray}
      />
      {props.children}
    </g>
  );
}

export function CatalogText({
  x,
  y,
  width,
  height,
  text,
  subtitle,
  color = LOOK.text.primary,
  subtitleColor = LOOK.text.muted,
  fontSize = NODE_TITLE_SIZE,
  subtitleFontSize,
  paddingX = 4,
  minFontSize = 9,
  fontWeight = 400,
  subtitleFontWeight = 400,
  wrapText = true,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  subtitle?: string;
  color?: string;
  subtitleColor?: string;
  fontSize?: number;
  subtitleFontSize?: number;
  paddingX?: number;
  minFontSize?: number;
  fontWeight?: number | string;
  subtitleFontWeight?: number | string;
  wrapText?: boolean;
}) {
  if (!text && !subtitle) return null;

  const layout = resolveCatalogTextLayout({
    text,
    subtitle,
    width,
    fontSize,
    subtitleFontSize,
    paddingX,
    minFontSize,
    wrapText,
  });
  const firstLineHeight = layout.titleLines.length > 0 ? layout.lineHeight : layout.subtitleLineHeight;
  const firstLineFontSize = layout.titleLines.length > 0 ? layout.titleFontSize : layout.subtitleFontSize;
  const firstLineCenter = y + height / 2 - layout.totalHeight / 2 + firstLineHeight / 2;
  const firstBaseline = baselineYForVisualCenter(firstLineCenter, firstLineFontSize, 'node');

  return (
    <text
      x={x + width / 2}
      y={firstBaseline}
      textAnchor="middle"
      fontFamily={FONT_FAMILY}
      fontSize={layout.titleFontSize}
      fontWeight={fontWeight}
      fill={color}
      textLength={layout.stillTooWide ? layout.maxTextWidth : undefined}
      lengthAdjust={layout.stillTooWide ? 'spacingAndGlyphs' : undefined}
    >
      {layout.titleLines.map((line, index) => (
        <tspan key={index} x={x + width / 2} dy={index === 0 ? 0 : layout.lineHeight}>
          {line}
        </tspan>
      ))}
      {layout.subtitleLines.map((line, index) => (
        <tspan
          key={`subtitle-${index}`}
          x={x + width / 2}
          dy={index === 0
            ? layout.titleLines.length > 0
              ? layout.subtitleLineHeight + CATALOG_TEXT_SUBTITLE_GAP
              : 0
            : layout.subtitleLineHeight}
          fontSize={layout.subtitleFontSize}
          fontWeight={subtitleFontWeight}
          fill={subtitleColor}
        >
          {line}
        </tspan>
      ))}
    </text>
  );
}

export function CatalogIconSlot({
  icon: Icon,
  x,
  y,
  size,
  color,
  title,
}: CatalogIconSlotProps) {
  return <>{Icon({ x, y, size, color, title })}</>;
}
