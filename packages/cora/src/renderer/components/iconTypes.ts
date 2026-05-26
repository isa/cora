import type { ReactNode } from 'react';

export interface SvgIconProps {
  x?: number;
  y?: number;
  size: number;
  color: string;
  title?: string;
}

export type SvgIconComponent = (props: SvgIconProps) => ReactNode;
