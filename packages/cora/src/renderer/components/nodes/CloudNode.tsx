import type { NodeComponentProps } from '../types.js';
import { NodeLabel, ShapeShadow, strokeWidth } from './shared.js';

export function CloudNode({ node, theme }: NodeComponentProps) {
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
