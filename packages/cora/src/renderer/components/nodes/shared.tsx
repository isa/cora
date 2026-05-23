import type { ReactNode } from 'react';

import { baselineYForVisualCenter } from '../../../core/measureText.js';
import type { ResolvedStyle, ThemeTokens } from '../../../layout-ir.js';
import { escapeXml, FONT_FAMILY } from '../../utils.js';
import type { SvgIconComponent } from '../icons.js';
import { borderDasharray, isNoBorder, resolveComponentSize } from '../styles.js';
import type { BoxStyleProps, ComponentDimensions, NodeComponentProps, NodeShadow } from '../types.js';

export function strokeWidth(style: ResolvedStyle): number {
  return style.strokeWidth ?? 0.75;
}

export function NodeLabel({ node, theme }: NodeComponentProps) {
  const centerY = node.y + node.measuredHeight / 2;
  const style = node.resolvedStyle;
  const fill = style?.labelFill ?? theme.nodeLabel.fill;
  return (
    <text
      x={node.x + node.measuredWidth / 2}
      y={baselineYForVisualCenter(centerY, theme.nodeLabel.fontSize, 'node')}
      textAnchor="middle"
      fontFamily={FONT_FAMILY}
      fontSize={theme.nodeLabel.fontSize}
      fontWeight={theme.nodeLabel.fontWeight}
      fill={fill}
    >
      {escapeXml(node.label)}
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
    radius: props.radius ?? 4,
    backgroundColor: props.backgroundColor ?? '#ffffff',
    borderColor: noBorder ? undefined : props.borderColor ?? '#94a3b8',
    borderWidth: noBorder ? undefined : borderWidth,
    borderDasharray: noBorder ? undefined : borderDasharray(props.borderStyle, borderWidth),
    text: props.title ?? props.text,
    subtitle: props.subtitle,
    textColor: props.textColor ?? '#0f172a',
    subtitleColor: props.subtitleColor ?? '#64748b',
    titleFontSize: props.titleFontSize,
    subtitleFontSize: props.subtitleFontSize,
    shadow: props.shadow ?? 'none',
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
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  fill: string;
  shadow: NodeShadow;
}) {
  if (shadow === 'none') {
    return null;
  }
  const shadowFill = darkerColor(fill);

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
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  fill: string;
  shadow?: NodeShadow;
}) {
  return shadowRects({ x, y, width, height, radius, fill, shadow });
}

export function CatalogPolygonShadow({
  points,
  fill,
  shadow = 'none',
}: {
  points: string;
  fill: string;
  shadow?: NodeShadow;
}) {
  if (shadow === 'none') {
    return null;
  }
  const shadowFill = darkerColor(fill);

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
  color = '#0f172a',
  subtitleColor = '#64748b',
  fontSize = 13,
  subtitleFontSize,
  paddingX = 4,
  minFontSize = 9,
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
}) {
  if (!text && !subtitle) return null;

  const lines = (text ?? '').split(/\r?\n/);
  const subtitleLines = subtitle ? subtitle.split(/\r?\n/) : [];
  const longestLine = lines.reduce((longest, line) => line.length > longest.length ? line : longest, '');
  const maxTextWidth = Math.max(1, width - paddingX * 2);
  const estimatedWidth = longestLine.length * fontSize * 0.56;
  const fittedFontSize = estimatedWidth > maxTextWidth
    ? Math.max(minFontSize, (maxTextWidth / Math.max(longestLine.length * 0.56, 1)))
    : fontSize;
  const stillTooWide = longestLine.length * fittedFontSize * 0.56 > maxTextWidth;
  const lineHeight = fittedFontSize * 1.25;
  const resolvedSubtitleFontSize = subtitleFontSize ?? Math.max(8, fittedFontSize - 2);
  const subtitleLineHeight = resolvedSubtitleFontSize * 1.25;
  const totalHeight = (lines.length * lineHeight) + (subtitleLines.length > 0 ? 3 + subtitleLines.length * subtitleLineHeight : 0);
  const firstLineCenter = y + height / 2 - totalHeight / 2 + lineHeight / 2;
  const firstBaseline = baselineYForVisualCenter(firstLineCenter, fittedFontSize, 'node');

  return (
    <text
      x={x + width / 2}
      y={firstBaseline}
      textAnchor="middle"
      fontFamily={FONT_FAMILY}
      fontSize={fittedFontSize}
      fontWeight={600}
      fill={color}
      textLength={stillTooWide ? maxTextWidth : undefined}
      lengthAdjust={stillTooWide ? 'spacingAndGlyphs' : undefined}
    >
      {lines.map((line, index) => (
        <tspan key={index} x={x + width / 2} dy={index === 0 ? 0 : lineHeight}>
          {line}
        </tspan>
      ))}
      {subtitleLines.map((line, index) => (
        <tspan
          key={`subtitle-${index}`}
          x={x + width / 2}
          dy={index === 0 ? subtitleLineHeight + 3 : subtitleLineHeight}
          fontSize={resolvedSubtitleFontSize}
          fontWeight={500}
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
