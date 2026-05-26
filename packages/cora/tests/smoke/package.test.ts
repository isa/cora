import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const packageRoot = new URL('../..', import.meta.url).pathname;
let extractDir = '';
let tarballPath = '';

function walkFiles(dir: string, prefix = ''): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolute = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(absolute, relative));
    } else {
      files.push(relative);
    }
  }
  return files;
}

beforeAll(() => {
  execSync('bun run build', { cwd: packageRoot, stdio: 'pipe' });

  execSync('npm pack --pack-destination .', { cwd: packageRoot, stdio: 'pipe' });
  const packed = readdirSync(packageRoot).filter((name) => name.endsWith('.tgz'));
  tarballPath = join(packageRoot, packed[packed.length - 1]!);
  extractDir = mkdtempSync(join(tmpdir(), 'cora-extract-'));
  execSync(`tar xzf "${tarballPath}" -C "${extractDir}"`, { stdio: 'pipe' });
});

afterAll(() => {
  if (extractDir) {
    rmSync(extractDir, { recursive: true, force: true });
  }
  if (tarballPath && existsSync(tarballPath)) {
    rmSync(tarballPath, { force: true });
  }
  execSync('bun run build', { cwd: packageRoot, stdio: 'pipe' });
});

describe('published package tarball integrity', () => {
  it('includes required runtime files', () => {
    const pkgRoot = join(extractDir, 'package');
    const required = [
      'dist/cli.js',
      'dist/index.js',
      'dist/core/index.js',
      'dist/renderer/components/index.js',
      'dist/renderer/assets/fonts/NotoSans-Regular.ttf',
      'dist/renderer/assets/fonts/NotoSans-SemiBold.ttf',
      'dist/renderer/assets/icon-packs/default/manifest.json',
      'dist/renderer/assets/icon-packs/default/manifest.agents.json',
      'dist/renderer/assets/icon-packs/default/icons/database.svg',
      'dist/renderer/assets/icon-packs/streamline/manifest.json',
      'dist/renderer/assets/icon-packs/streamline/manifest.agents.json',
      'dist/renderer/assets/icon-packs/streamline/icons/database-check-remix.svg',
      'dist/renderer/assets/icon-packs/catalog.json',
      'SKILL.md',
      'package.json',
    ];

    for (const file of required) {
      expect(existsSync(join(pkgRoot, file)), file).toBe(true);
    }
  });

  it('excludes development-only preview and source artifacts', () => {
    const pkgRoot = join(extractDir, 'package');
    const files = walkFiles(pkgRoot);

    const forbiddenPatterns = [
      /(^|\/)preview\//,
      /(^|\/)preview-dist\//,
      /(^|\/)src\//,
      /(^|\/)node_modules\//,
      /material-design\//,
      /vite\.config/,
      /tsdown\.config/,
    ];

    for (const file of files) {
      if (file.endsWith('.d.ts')) {
        continue;
      }
      if (/^src\//.test(file) && file.endsWith('.ts')) {
        expect.fail(`forbidden path: ${file}`);
      }
      for (const pattern of forbiddenPatterns) {
        expect(pattern.test(file), `forbidden path: ${file}`).toBe(false);
      }
    }
  });

  it('does not ship dist/preview', () => {
    const pkgRoot = join(extractDir, 'package');
    expect(existsSync(join(pkgRoot, 'dist/preview'))).toBe(false);
  });

  it('does not ship development-only preview CLI', () => {
    const pkgRoot = join(extractDir, 'package');
    expect(existsSync(join(pkgRoot, 'dist/commands'))).toBe(false);
  });
});
