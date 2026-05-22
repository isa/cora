import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

import { describe, expect, it } from 'vitest';

const packageRoot = new URL('../..', import.meta.url).pathname;
const previewDist = join(packageRoot, 'dist/preview');

describe('preview package assets', () => {
  it('emits dist/preview/index.html and browser assets after build', () => {
    expect(existsSync(join(previewDist, 'index.html'))).toBe(true);
    const assets = readdirSync(join(previewDist, 'assets'));

    expect(assets.some((asset) => asset.endsWith('.js'))).toBe(true);
    expect(assets.some((asset) => asset.endsWith('.css'))).toBe(true);
  });

  it('exposes preview help from the built CLI', () => {
    const help = execFileSync('node', ['dist/cli.js', 'preview', '--help'], {
      cwd: packageRoot,
      encoding: 'utf8',
    });

    expect(help).toContain('--no-open');
  });
});
