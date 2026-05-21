import { baselineYForVisualCenter, measureLabel } from '../../core/measureText.js';
import type { LayoutedEdge, ThemeTokens } from '../../layout-ir.js';
import { escapeXml, FONT_FAMILY } from '../utils.js';
import { edgeLabelRenderPosition } from './decorations.js';

export interface EdgeLabelProps {
  edge: LayoutedEdge;
  theme: ThemeTokens;
}

export function EdgeLabel({ edge, theme }: EdgeLabelProps) {
  if (
    !edge.label ||
    edge.labelX === undefined ||
    edge.labelY === undefined
  ) {
    return null;
  }

  const labelPlacement = edge.labelPlacement ?? {
    x: edge.labelX,
    y: edge.labelY,
    ...measureLabel(edge.label, 'edge'),
    segmentIndex: 0,
    orientation: 'horizontal' as const,
  };
  const renderPosition = edgeLabelRenderPosition(labelPlacement);

  return (
    <text
      x={renderPosition.x}
      y={baselineYForVisualCenter(
        renderPosition.y,
        theme.edgeLabel.fontSize,
        'edge',
      )}
      textAnchor={renderPosition.textAnchor}
      fontFamily={FONT_FAMILY}
      fontSize={theme.edgeLabel.fontSize}
      fontWeight={theme.edgeLabel.fontWeight}
      fill={theme.edgeLabel.fill}
    >
      {escapeXml(edge.label)}
    </text>
  );
}
