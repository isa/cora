import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDir = dirname(fileURLToPath(import.meta.url));

export function bundledIconPacksRoot(): string {
  const candidates = [
    join(moduleDir, 'renderer/assets/icon-packs'),
    join(moduleDir, '../renderer/assets/icon-packs'),
    join(moduleDir, '../assets/icon-packs'),
    join(moduleDir, '../../src/renderer/assets/icon-packs'),
    join(moduleDir, '../../../src/renderer/assets/icon-packs'),
  ];
  for (const candidate of candidates) {
    if (existsSync(join(candidate, 'default', 'manifest.json'))) {
      return candidate;
    }
  }
  throw new Error(
    'Default icon pack not found. Run `bun run build` in packages/cora to generate icon-packs/default.',
  );
}

export function extensionIconPacksRoot(): string {
  return join(homedir(), '.config', 'cora', 'extensions');
}

export function packDir(packsRoot: string, provider: string): string {
  return join(packsRoot, provider);
}
