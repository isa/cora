import { execFileSync, execSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

const packageRoot = new URL('../..', import.meta.url).pathname;
const previewDist = join(packageRoot, 'preview-dist');

describe('preview package assets', () => {
  beforeAll(() => {
    execSync('bun run build', { cwd: packageRoot, stdio: 'pipe' });
  }, 180_000);
  it('emits preview-dist/index.html and browser assets after build', () => {
    expect(existsSync(join(previewDist, 'index.html'))).toBe(true);
    const assets = readdirSync(join(previewDist, 'assets'));

    expect(assets.some((asset) => asset.endsWith('.js'))).toBe(true);
    expect(assets.some((asset) => asset.endsWith('.css'))).toBe(true);
    expect(existsSync(join(previewDist, 'icon-packs/default/manifest.json'))).toBe(true);
    expect(existsSync(join(previewDist, 'icon-packs/streamline/manifest.json'))).toBe(true);
    expect(existsSync(join(previewDist, 'icon-packs/catalog.json'))).toBe(true);
  });

  it('does not emit dist/preview in the published dist output', () => {
    expect(existsSync(join(packageRoot, 'dist/preview'))).toBe(false);
  });

  it('exposes preview help from the built CLI in development checkouts', () => {
    const help = execFileSync('node', ['dist/cli.js', 'preview', '--help'], {
      cwd: packageRoot,
      encoding: 'utf8',
    });

    expect(help).toContain('--no-open');
  });
});
