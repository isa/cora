import type { NodeComponentProps } from '../types.js';
import { NodeLabel, ShapeShadow, strokeWidth } from './shared.js';

export function HexagonNode({ node, theme }: NodeComponentProps) {
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
