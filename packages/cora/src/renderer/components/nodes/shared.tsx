import type { ReactNode } from 'react';

import { baselineYForVisualCenter } from '../../../core/measureText.js';
import type { ResolvedStyle, ThemeTokens } from '../../../layout-ir.js';
import { escapeXml, FONT_FAMILY } from '../../utils.js';
import type { SvgIconComponent } from '../icons.js';
import { borderDasharray, isNoBorder, resolveComponentSize } from '../styles.js';
import type { BoxStyleProps, ComponentDimensions, NodeComponentProps } from '../types.js';

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
    text: props.text,
    textColor: props.textColor ?? '#0f172a',
  };
}

export function CatalogFrame(props: CatalogNodeFrameProps) {
  const frame = resolvedCatalogFrame(props);

  return (
    <g>
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
  color = '#0f172a',
  fontSize = 13,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  color?: string;
  fontSize?: number;
}) {
  if (!text) return null;

  return (
    <text
      x={x + width / 2}
      y={baselineYForVisualCenter(y + height / 2, fontSize, 'node')}
      textAnchor="middle"
      fontFamily={FONT_FAMILY}
      fontSize={fontSize}
      fontWeight={600}
      fill={color}
    >
      {text}
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
