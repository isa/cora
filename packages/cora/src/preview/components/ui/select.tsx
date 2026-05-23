import type { SelectHTMLAttributes } from 'react';

import { cn } from './utils.js';

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn('ui-select', className)} {...props} />;
}
