import { resolveIcon } from '../iconPacks/resolveIcon.js';

export type { SvgIconComponent, SvgIconProps } from './iconTypes.js';
export { WarningIcon } from './fallbackIcon.js';

export const BugIcon = resolveIcon('default', 'bug');
export const ErrorIcon = resolveIcon('default', 'error');
export const StopIcon = resolveIcon('default', 'stop');
