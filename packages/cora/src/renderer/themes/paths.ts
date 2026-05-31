import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDir = dirname(fileURLToPath(import.meta.url));

export function resolveThemesRoot(): string {
  const candidates = [
    join(moduleDir, 'themes'),
    join(moduleDir, '../themes'),
    join(moduleDir, '../../../themes'),
    join(moduleDir, '../../themes'),
  ];

  for (const candidate of candidates) {
    if (existsSync(join(candidate, 'theme-contract.yaml'))) {
      return candidate;
    }
  }

  throw new Error(
    `Theme directory not found (searched: ${candidates.join(', ')})`,
  );
}

export function resolveThemeContractPath(): string {
  return join(resolveThemesRoot(), 'theme-contract.yaml');
}

export function resolveBuiltinThemesDir(): string {
  return join(resolveThemesRoot(), 'builtin');
}
