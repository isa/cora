import type { ReactNode } from 'react';

export interface SvgIconProps {
  x?: number;
  y?: number;
  size: number;
  color: string;
  title?: string;
}

export type SvgIconComponent = (props: SvgIconProps) => ReactNode;

export function BugIcon({ x = 0, y = 0, size, color, title }: SvgIconProps) {
  const pad = size * 0.2;
  const body = size - pad * 2;

  return (
    <g transform={`translate(${x} ${y})`} role={title ? 'img' : undefined} aria-label={title}>
      {title ? <title>{title}</title> : null}
      <circle cx={size / 2} cy={size / 2} r={body / 3} fill="none" stroke={color} strokeWidth="1.5" />
      <path d={`M ${pad} ${size / 2} H ${size - pad}`} stroke={color} strokeWidth="1.5" />
      <path d={`M ${size / 2} ${pad} V ${size - pad}`} stroke={color} strokeWidth="1.5" />
      <path d={`M ${pad * 1.2} ${pad * 1.2} L ${size - pad * 1.2} ${size - pad * 1.2}`} stroke={color} strokeWidth="1.5" />
      <path d={`M ${size - pad * 1.2} ${pad * 1.2} L ${pad * 1.2} ${size - pad * 1.2}`} stroke={color} strokeWidth="1.5" />
    </g>
  );
}

export function WarningIcon({ x = 0, y = 0, size, color, title }: SvgIconProps) {
  return (
    <g transform={`translate(${x} ${y})`} role={title ? 'img' : undefined} aria-label={title}>
      {title ? <title>{title}</title> : null}
      <path
        d={`M ${size / 2} ${size * 0.12} L ${size * 0.9} ${size * 0.85} H ${size * 0.1} Z`}
        fill="none"
        stroke={color}
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path d={`M ${size / 2} ${size * 0.35} V ${size * 0.58}`} stroke={color} strokeWidth="1.8" />
      <circle cx={size / 2} cy={size * 0.72} r={size * 0.045} fill={color} />
    </g>
  );
}

export function ErrorIcon({ x = 0, y = 0, size, color, title }: SvgIconProps) {
  return (
    <g transform={`translate(${x} ${y})`} role={title ? 'img' : undefined} aria-label={title}>
      {title ? <title>{title}</title> : null}
      <circle cx={size / 2} cy={size / 2} r={size * 0.38} fill="none" stroke={color} strokeWidth="1.5" />
      <path d={`M ${size * 0.35} ${size * 0.35} L ${size * 0.65} ${size * 0.65}`} stroke={color} strokeWidth="1.8" />
      <path d={`M ${size * 0.65} ${size * 0.35} L ${size * 0.35} ${size * 0.65}`} stroke={color} strokeWidth="1.8" />
    </g>
  );
}

export function StopIcon({ x = 0, y = 0, size, color, title }: SvgIconProps) {
  const r = size * 0.38;
  const c = size / 2;
  const points = Array.from({ length: 8 }, (_, index) => {
    const angle = Math.PI / 8 + index * (Math.PI / 4);
    return `${c + Math.cos(angle) * r},${c + Math.sin(angle) * r}`;
  }).join(' ');

  return (
    <g transform={`translate(${x} ${y})`} role={title ? 'img' : undefined} aria-label={title}>
      {title ? <title>{title}</title> : null}
      <polygon points={points} fill="none" stroke={color} strokeLinejoin="round" strokeWidth="1.5" />
      <path d={`M ${size * 0.32} ${size / 2} H ${size * 0.68}`} stroke={color} strokeWidth="1.8" />
    </g>
  );
}
