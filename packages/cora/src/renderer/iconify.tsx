import { iconToSVG } from '@iconify/utils/lib/svg/build';

import {
  iconReferenceForNode,
  resolveIconData,
} from '../core/iconify.js';
import type { DiagramNode } from '../core/types.js';
import type { SvgIconComponent, SvgIconProps } from './components/icons.js';

function renderIconifySvg(
  iconName: string,
  { x = 0, y = 0, size, color, title }: SvgIconProps,
) {
  const icon = resolveIconData(iconName);
  if (!icon) {
    return null;
  }

  const svg = iconToSVG(icon, {
    height: size,
    width: size,
  });

  return (
    <svg
      x={x}
      y={y}
      width={size}
      height={size}
      viewBox={svg.attributes.viewBox}
      color={color}
      fill="currentColor"
      role={title ? 'img' : undefined}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      <g dangerouslySetInnerHTML={{ __html: svg.body }} />
    </svg>
  );
}

export function iconifyIcon(iconName: string): SvgIconComponent | undefined {
  if (!resolveIconData(iconName)) {
    return undefined;
  }

  return (props) => renderIconifySvg(iconName, props);
}

export function iconifyIconForNode(node: Pick<DiagramNode, 'icon' | 'provider' | 'service'>): SvgIconComponent | undefined {
  const iconName = iconReferenceForNode(node);
  return iconName ? iconifyIcon(iconName) : undefined;
}

