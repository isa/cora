import type { ReactNode } from 'react';

import type { SvgIconComponent, SvgIconProps } from '../../components/iconTypes.js';

/** Material Symbols use filled paths with `currentColor`. */
export function createSvgIconFromAsset(innerMarkup: string): SvgIconComponent {
  return function AssetIcon({ x = 0, y = 0, size, color, title }: SvgIconProps): ReactNode {
    return (
      <g transform={`translate(${x} ${y})`} role={title ? 'img' : undefined} aria-label={title}>
        {title ? <title>{title}</title> : null}
        <svg width={size} height={size} viewBox="0 0 24 24" style={{ color }}>
          <g fill="currentColor" dangerouslySetInnerHTML={{ __html: innerMarkup }} />
        </svg>
      </g>
    );
  };
}
