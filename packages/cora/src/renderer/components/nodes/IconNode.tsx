import type { SvgIconComponent } from '../icons.js';
import type { ComponentSize } from '../types.js';
import { CatalogIconSlot, resolvedCatalogFrame } from './shared.js';

export interface IconNodeProps {
  x?: number;
  y?: number;
  size?: ComponentSize;
  strokeColor?: string;
  icon: SvgIconComponent;
  title?: string;
}

export function IconNode({
  x,
  y,
  size,
  strokeColor = 'currentColor',
  icon,
  title,
}: IconNodeProps) {
  const frame = resolvedCatalogFrame({ x, y, size, fallbackSize: { width: 40, height: 40 } });
  const iconSize = Math.min(frame.width, frame.height);

  return (
    <g>
      <CatalogIconSlot
        icon={icon}
        x={frame.x + (frame.width - iconSize) / 2}
        y={frame.y + (frame.height - iconSize) / 2}
        size={iconSize}
        color={strokeColor}
        title={title}
      />
    </g>
  );
}
