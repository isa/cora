import type { SvgIconComponent } from './iconTypes.js';

/** Shown when a pack/service cannot be resolved (missing pack, unknown slug). */
export const WarningIcon: SvgIconComponent = ({ x = 0, y = 0, size = 24, color = 'currentColor', title }) => (
  <g transform={`translate(${x} ${y})`} role={title ? 'img' : undefined} aria-label={title}>
    {title ? <title>{title}</title> : null}
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ color }}>
      <path
        fill="currentColor"
        d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"
      />
    </svg>
  </g>
);
