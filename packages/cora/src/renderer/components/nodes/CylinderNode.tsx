import type { NodeComponentProps } from '../types.js';
import { NodeLabel, ShapeShadow, strokeWidth } from './shared.js';

export function CylinderNode({ node, theme }: NodeComponentProps) {
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
