import type { ReactNode } from 'react';

import { baselineYForVisualCenter } from '../../core/measureText.js';
import type { LayoutedNode, ResolvedStyle, ThemeTokens } from '../../layout-ir.js';
import { escapeXml, FONT_FAMILY } from '../utils.js';

export interface NodeProps {
  node: LayoutedNode;
  theme: ThemeTokens;
}

function strokeWidth(style: ResolvedStyle): number {
  return style.strokeWidth ?? 0.75;
}

function NodeLabel({ node, theme }: NodeProps) {
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

function ShapeShadow({
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

export function BoxNode({ node, theme }: NodeProps) {
  const style = node.resolvedStyle ?? theme.shapes.rectangle!;
  const sw = strokeWidth(style);

  const renderShape = (offsetX: number, offsetY: number, paint: string, stroke?: string) => (
    <rect
      x={node.x + offsetX}
      y={node.y + offsetY}
      width={node.measuredWidth}
      height={node.measuredHeight}
      fill={paint}
      stroke={stroke}
      strokeWidth={stroke ? sw : undefined}
    />
  );

  return (
    <g>
      <ShapeShadow
        theme={theme}
        hasShadow={Boolean(style.shadow)}
        renderShape={(ox, oy) => renderShape(ox, oy, style.shadow!)}
      />
      {renderShape(0, 0, style.fill, style.stroke)}
      <NodeLabel node={node} theme={theme} />
    </g>
  );
}

export function RoundedNode({ node, theme }: NodeProps) {
  const style = node.resolvedStyle ?? theme.shapes.rounded!;
  const sw = strokeWidth(style);

  const renderShape = (offsetX: number, offsetY: number, paint: string, stroke?: string) => (
    <rect
      x={node.x + offsetX}
      y={node.y + offsetY}
      width={node.measuredWidth}
      height={node.measuredHeight}
      rx={4}
      ry={4}
      fill={paint}
      stroke={stroke}
      strokeWidth={stroke ? sw : undefined}
    />
  );

  return (
    <g>
      <ShapeShadow
        theme={theme}
        hasShadow={Boolean(style.shadow)}
        renderShape={(ox, oy) => renderShape(ox, oy, style.shadow!)}
      />
      {renderShape(0, 0, style.fill, style.stroke)}
      <NodeLabel node={node} theme={theme} />
    </g>
  );
}

export function CylinderNode({ node, theme }: NodeProps) {
  const style = node.resolvedStyle ?? theme.shapes.cylinder!;
  const sw = strokeWidth(style);
  const capHeight = Math.min(16, node.measuredHeight * 0.2);
  const bodyY = node.y + capHeight / 2;
  const bodyHeight = node.measuredHeight - capHeight;
  const cx = node.x + node.measuredWidth / 2;

  const renderShape = (offsetX: number, offsetY: number, paint: string, stroke?: string) => (
    <>
      <rect
        x={node.x + offsetX}
        y={bodyY + offsetY}
        width={node.measuredWidth}
        height={bodyHeight}
        fill={paint}
        stroke={stroke}
        strokeWidth={stroke ? sw : undefined}
      />
      <ellipse
        cx={cx + offsetX}
        cy={node.y + capHeight / 2 + offsetY}
        rx={node.measuredWidth / 2}
        ry={capHeight / 2}
        fill={paint}
        stroke={stroke}
        strokeWidth={stroke ? sw : undefined}
      />
      <ellipse
        cx={cx + offsetX}
        cy={node.y + node.measuredHeight - capHeight / 2 + offsetY}
        rx={node.measuredWidth / 2}
        ry={capHeight / 2}
        fill={paint}
        stroke={stroke}
        strokeWidth={stroke ? sw : undefined}
      />
    </>
  );

  return (
    <g>
      <ShapeShadow
        theme={theme}
        hasShadow={Boolean(style.shadow)}
        renderShape={(ox, oy) => renderShape(ox, oy, style.shadow!)}
      />
      {renderShape(0, 0, style.fill, style.stroke)}
      <NodeLabel node={node} theme={theme} />
    </g>
  );
}

export function CloudNode({ node, theme }: NodeProps) {
  const style = node.resolvedStyle ?? theme.shapes.cloud!;
  const sw = strokeWidth(style);
  const { x, y, measuredWidth: w, measuredHeight: h } = node;

  const buildPath = (offsetX: number, offsetY: number) =>
    `M ${x + w * 0.25 + offsetX} ${y + h * 0.65 + offsetY}
    C ${x + w * 0.05 + offsetX} ${y + h * 0.65 + offsetY}, ${x + w * 0.05 + offsetX} ${y + h * 0.35 + offsetY}, ${x + w * 0.25 + offsetX} ${y + h * 0.35 + offsetY}
    C ${x + w * 0.25 + offsetX} ${y + h * 0.15 + offsetY}, ${x + w * 0.45 + offsetX} ${y + h * 0.1 + offsetY}, ${x + w * 0.55 + offsetX} ${y + h * 0.25 + offsetY}
    C ${x + w * 0.7 + offsetX} ${y + h * 0.1 + offsetY}, ${x + w * 0.9 + offsetX} ${y + h * 0.25 + offsetY}, ${x + w * 0.85 + offsetX} ${y + h * 0.45 + offsetY}
    C ${x + w * 0.98 + offsetX} ${y + h * 0.5 + offsetY}, ${x + w * 0.95 + offsetX} ${y + h * 0.75 + offsetY}, ${x + w * 0.75 + offsetX} ${y + h * 0.75 + offsetY}
    Z`;

  const renderShape = (offsetX: number, offsetY: number, paint: string, stroke?: string) => (
    <path
      d={buildPath(offsetX, offsetY)}
      fill={paint}
      stroke={stroke}
      strokeWidth={stroke ? sw : undefined}
    />
  );

  return (
    <g>
      <ShapeShadow
        theme={theme}
        hasShadow={Boolean(style.shadow)}
        renderShape={(ox, oy) => renderShape(ox, oy, style.shadow!)}
      />
      {renderShape(0, 0, style.fill, style.stroke)}
      <NodeLabel node={node} theme={theme} />
    </g>
  );
}

export function DiamondNode({ node, theme }: NodeProps) {
  const style = node.resolvedStyle ?? theme.shapes.diamond!;
  const sw = strokeWidth(style);
  const cx = node.x + node.measuredWidth / 2;
  const cy = node.y + node.measuredHeight / 2;

  const buildPoints = (offsetX: number, offsetY: number) =>
    [
      `${cx + offsetX},${node.y + offsetY}`,
      `${node.x + node.measuredWidth + offsetX},${cy + offsetY}`,
      `${cx + offsetX},${node.y + node.measuredHeight + offsetY}`,
      `${node.x + offsetX},${cy + offsetY}`,
    ].join(' ');

  const renderShape = (offsetX: number, offsetY: number, paint: string, stroke?: string) => (
    <polygon
      points={buildPoints(offsetX, offsetY)}
      fill={paint}
      stroke={stroke}
      strokeWidth={stroke ? sw : undefined}
      strokeLinejoin={stroke ? 'round' : undefined}
    />
  );

  return (
    <g>
      <ShapeShadow
        theme={theme}
        hasShadow={Boolean(style.shadow)}
        renderShape={(ox, oy) => renderShape(ox, oy, style.shadow!)}
      />
      {renderShape(0, 0, style.fill, style.stroke)}
      <NodeLabel node={node} theme={theme} />
    </g>
  );
}

export function HexagonNode({ node, theme }: NodeProps) {
  const style = node.resolvedStyle ?? theme.shapes.hexagon!;
  const sw = strokeWidth(style);
  const { x, y, measuredWidth: w, measuredHeight: h } = node;

  const buildPoints = (offsetX: number, offsetY: number) =>
    [
      `${x + w * 0.25 + offsetX},${y + offsetY}`,
      `${x + w * 0.75 + offsetX},${y + offsetY}`,
      `${x + w + offsetX},${y + h / 2 + offsetY}`,
      `${x + w * 0.75 + offsetX},${y + h + offsetY}`,
      `${x + w * 0.25 + offsetX},${y + h + offsetY}`,
      `${x + offsetX},${y + h / 2 + offsetY}`,
    ].join(' ');

  const renderShape = (offsetX: number, offsetY: number, paint: string, stroke?: string) => (
    <polygon
      points={buildPoints(offsetX, offsetY)}
      fill={paint}
      stroke={stroke}
      strokeWidth={stroke ? sw : undefined}
      strokeLinejoin={stroke ? 'round' : undefined}
    />
  );

  return (
    <g>
      <ShapeShadow
        theme={theme}
        hasShadow={Boolean(style.shadow)}
        renderShape={(ox, oy) => renderShape(ox, oy, style.shadow!)}
      />
      {renderShape(0, 0, style.fill, style.stroke)}
      <NodeLabel node={node} theme={theme} />
    </g>
  );
}
