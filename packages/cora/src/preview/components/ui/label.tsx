import type { ReactNode } from 'react';

import { cn } from './utils.js';

export function Label({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={cn('ui-label', className)}>{children}</span>;
}
