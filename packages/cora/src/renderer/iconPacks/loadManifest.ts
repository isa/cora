import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { IconPackManifest } from './types.js';

export function loadIconPackManifest(rootPath: string): IconPackManifest {
  const raw = readFileSync(join(rootPath, 'manifest.json'), 'utf8');
  return JSON.parse(raw) as IconPackManifest;
}
