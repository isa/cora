import type { ReactNode } from 'react';

import type { BoxStyleProps } from '../types.js';
import { CatalogFrame } from './shared.js';

export interface ShapeNodeProps extends BoxStyleProps {
  x?: number;
  y?: number;
  children?: ReactNode;
}

export function ShapeNode(props: ShapeNodeProps) {
  return <CatalogFrame {...props}>{props.children}</CatalogFrame>;
}
