export { resolveIcon } from '../iconPacks/resolveIcon.js';
export { buildIconCatalogIndex, buildMergedCatalogJson } from '../iconPacks/catalogIndex.js';
export { listIconPacks, getIconPack, isKnownServiceInPack } from '../iconPacks/registry.js';
export type { IconCatalogEntry, IconPackManifest } from '../iconPacks/types.js';

import { resolveIcon } from '../iconPacks/resolveIcon.js';

export const ServerIcon = resolveIcon('default', 'server');
export const DatabaseIcon = resolveIcon('default', 'database');
export const CloudIcon = resolveIcon('default', 'cloud');
export const NetworkIcon = resolveIcon('default', 'network');
export const UserIcon = resolveIcon('default', 'user');
