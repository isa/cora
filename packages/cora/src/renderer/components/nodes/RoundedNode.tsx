import type { NodeComponentProps } from '../types.js';
import { NodeLabel, ShapeShadow, strokeWidth } from './shared.js';

export function RoundedNode({ node, theme }: NodeComponentProps) {
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
