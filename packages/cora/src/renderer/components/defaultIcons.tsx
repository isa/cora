import type { ReactNode } from 'react';
import type { SvgIconComponent, SvgIconProps } from './icons.js';
import { BugIcon, WarningIcon, ErrorIcon, StopIcon } from './icons.js';

export function ServerIcon({ x = 0, y = 0, size, color, title }: SvgIconProps) {
  return (
    <g transform={`translate(${x} ${y})`} role={title ? 'img' : undefined} aria-label={title}>
      {title ? <title>{title}</title> : null}
      <rect
        x={size * 0.15}
        y={size * 0.15}
        width={size * 0.7}
        height={size * 0.7}
        rx={size * 0.05}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
      />
      <path d={`M ${size * 0.25} ${size * 0.35} H ${size * 0.75}`} stroke={color} strokeWidth="1.8" />
      <path d={`M ${size * 0.25} ${size * 0.5} H ${size * 0.75}`} stroke={color} strokeWidth="1.8" />
      <path d={`M ${size * 0.25} ${size * 0.65} H ${size * 0.75}`} stroke={color} strokeWidth="1.8" />
    </g>
  );
}

export function DatabaseIcon({ x = 0, y = 0, size, color, title }: SvgIconProps) {
  return (
    <g transform={`translate(${x} ${y})`} role={title ? 'img' : undefined} aria-label={title}>
      {title ? <title>{title}</title> : null}
      <ellipse cx={size / 2} cy={size * 0.25} rx={size * 0.3} ry={size * 0.1} fill="none" stroke={color} strokeWidth="1.5" />
      <path d={`M ${size * 0.2} ${size * 0.25} V ${size * 0.75}`} stroke={color} strokeWidth="1.5" />
      <path d={`M ${size * 0.8} ${size * 0.25} V ${size * 0.75}`} stroke={color} strokeWidth="1.5" />
      <path d={`M ${size * 0.2} ${size * 0.75} A ${size * 0.3} ${size * 0.1} 0 0 0 ${size * 0.8} ${size * 0.75}`} fill="none" stroke={color} strokeWidth="1.5" />
      <path d={`M ${size * 0.2} ${size * 0.42} A ${size * 0.3} ${size * 0.1} 0 0 0 ${size * 0.8} ${size * 0.42}`} fill="none" stroke={color} strokeWidth="1.8" />
      <path d={`M ${size * 0.2} ${size * 0.58} A ${size * 0.3} ${size * 0.1} 0 0 0 ${size * 0.8} ${size * 0.58}`} fill="none" stroke={color} strokeWidth="1.8" />
    </g>
  );
}

export function CloudIcon({ x = 0, y = 0, size, color, title }: SvgIconProps) {
  return (
    <g transform={`translate(${x} ${y})`} role={title ? 'img' : undefined} aria-label={title}>
      {title ? <title>{title}</title> : null}
      <path
        d={`M ${size * 0.25} ${size * 0.7} A ${size * 0.1} ${size * 0.1} 0 0 1 ${size * 0.25} ${size * 0.5} A ${size * 0.15} ${size * 0.15} 0 0 1 ${size * 0.5} ${size * 0.35} A ${size * 0.15} ${size * 0.15} 0 0 1 ${size * 0.75} ${size * 0.5} A ${size * 0.1} ${size * 0.1} 0 0 1 ${size * 0.75} ${size * 0.7} Z`}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
      />
    </g>
  );
}

export function NetworkIcon({ x = 0, y = 0, size, color, title }: SvgIconProps) {
  return (
    <g transform={`translate(${x} ${y})`} role={title ? 'img' : undefined} aria-label={title}>
      {title ? <title>{title}</title> : null}
      <line x1={size * 0.5} y1={size * 0.42} x2={size * 0.5} y2={size * 0.31} stroke={color} strokeWidth="1.8" />
      <line x1={size * 0.437} y1={size * 0.549} x2={size * 0.333} y2={size * 0.631} stroke={color} strokeWidth="1.8" />
      <line x1={size * 0.563} y1={size * 0.549} x2={size * 0.667} y2={size * 0.631} stroke={color} strokeWidth="1.8" />
      <circle cx={size * 0.5} cy={size * 0.23} r={size * 0.08} fill="none" stroke={color} strokeWidth="1.5" />
      <circle cx={size * 0.27} cy={size * 0.68} r={size * 0.08} fill="none" stroke={color} strokeWidth="1.5" />
      <circle cx={size * 0.73} cy={size * 0.68} r={size * 0.08} fill="none" stroke={color} strokeWidth="1.5" />
      <circle cx={size * 0.5} cy={size * 0.5} r={size * 0.08} fill="none" stroke={color} strokeWidth="1.5" />
    </g>
  );
}

export function UserIcon({ x = 0, y = 0, size, color, title }: SvgIconProps) {
  return (
    <g transform={`translate(${x} ${y})`} role={title ? 'img' : undefined} aria-label={title}>
      {title ? <title>{title}</title> : null}
      <circle cx={size * 0.5} cy={size * 0.33} r={size * 0.15} fill="none" stroke={color} strokeWidth="1.5" />
      <path
        d={`M ${size * 0.2} ${size * 0.75} A ${size * 0.3} ${size * 0.3} 0 0 1 ${size * 0.8} ${size * 0.75} Z`}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
      />
    </g>
  );
}

export const DEFAULT_ICON_REGISTRY: Record<string, SvgIconComponent> = {
  server: ServerIcon,
  database: DatabaseIcon,
  cloud: CloudIcon,
  network: NetworkIcon,
  user: UserIcon,
};

export const BUILTIN_ICON_REGISTRY: Record<string, SvgIconComponent> = {
  bug: BugIcon,
  warning: WarningIcon,
  error: ErrorIcon,
  stop: StopIcon,
  server: ServerIcon,
  database: DatabaseIcon,
  cloud: CloudIcon,
  network: NetworkIcon,
  user: UserIcon,
};

