import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliPath = join(__dirname, '../../dist/cli.js');

describe('cora icons search', () => {
  it('returns JSON hits across bundled icon packs', () => {
    const stdout = execFileSync(process.execPath, [cliPath, 'icons', 'search', 'database', '--format', 'json'], {
      encoding: 'utf8',
    });
    const hits = JSON.parse(stdout) as Array<{ provider: string; service: string }>;

    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((hit) => hit.provider === 'default' && hit.service === 'database')).toBe(true);
    expect(hits.some((hit) => hit.provider === 'streamline')).toBe(true);
  });

  it('finds Fluent-only icons merged into the default pack', () => {
    const stdout = execFileSync(process.execPath, [cliPath, 'icons', 'search', 'access-time', '--format', 'json'], {
      encoding: 'utf8',
    });
    const hits = JSON.parse(stdout) as Array<{ provider: string; service: string }>;

    expect(hits.some((hit) => hit.provider === 'default' && hit.service === 'access-time')).toBe(true);
  });
});
