import type { NodeComponentProps } from '../types.js';
import { NodeLabel, ShapeShadow, strokeWidth } from './shared.js';

export function DiamondNode({ node, theme }: NodeComponentProps) {
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
