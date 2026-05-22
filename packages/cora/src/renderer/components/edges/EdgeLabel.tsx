import { baselineYForVisualCenter, measureLabel } from '../../../core/measureText.js';
import { escapeXml, FONT_FAMILY } from '../../utils.js';
import type { EdgeComponentProps } from '../types.js';
import { EDGE_LABEL_PADDING, edgeLabelRenderPosition } from './decorations.js';

export function EdgeLabel({ edge, theme }: EdgeComponentProps) {
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
  const boxWidth = labelPlacement.width + EDGE_LABEL_PADDING * 2;
  const boxHeight = labelPlacement.height + EDGE_LABEL_PADDING;
  const boxX = renderPosition.textAnchor === 'end'
    ? renderPosition.x - boxWidth
    : renderPosition.x - boxWidth / 2;
  const boxY = renderPosition.y - boxHeight / 2;

  return (
    <g>
      <rect
        x={boxX}
        y={boxY}
        width={boxWidth}
        height={boxHeight}
        rx={boxHeight / 2}
        ry={boxHeight / 2}
        fill={theme.background}
      />
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
    </g>
  );
}
