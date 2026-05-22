import type { ReactNode } from 'react';

import { baselineYForVisualCenter } from '../../../core/measureText.js';
import type { ResolvedStyle, ThemeTokens } from '../../../layout-ir.js';
import { escapeXml, FONT_FAMILY } from '../../utils.js';
import type { NodeComponentProps } from '../types.js';

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
