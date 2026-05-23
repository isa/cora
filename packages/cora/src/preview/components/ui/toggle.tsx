import type { ButtonProps } from './button.js';
import { cn } from './utils.js';

export function Toggle({
  pressed,
  children,
  className,
  ...props
}: ButtonProps & { pressed: boolean }) {
  return (
    <button
      aria-pressed={pressed}
      className={cn('ui-toggle', pressed && 'ui-toggle-on', className)}
      {...props}
    >
      {children}
    </button>
  );
}
