import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

describe('Tarball Integrity Smoke Test', () => {
  const pkgDir = path.resolve(__dirname, '../..'); // packages/cora
  const tmpDir = path.resolve(__dirname, '.tmp');
  let tarballPath = '';
  let extractedDir = '';

  beforeAll(() => {
    // Ensure temp directory is clean
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tmpDir, { recursive: true });

    // Run npm pack to create the tarball using the existing build artifacts
    execSync('npm pack --pack-destination ' + tmpDir, { cwd: pkgDir });

    // Find the generated tarball
    const files = fs.readdirSync(tmpDir);
    const tarball = files.find(f => f.startsWith('cora-') && f.endsWith('.tgz'));
    if (!tarball) {
      throw new Error('Tarball was not generated');
    }
    tarballPath = path.join(tmpDir, tarball);

    // Extract the tarball
    extractedDir = path.join(tmpDir, 'extracted');
    fs.mkdirSync(extractedDir, { recursive: true });
    execSync(`tar -xzf "${tarballPath}" -C "${extractedDir}"`);
  });

  afterAll(() => {
    // Clean up
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('asserts only allowed files are present in the package', () => {
    const packageDir = path.join(extractedDir, 'package');
    
    // Recursively read all files in the package directory
    const getAllFiles = (dir: string): string[] => {
      const results: string[] = [];
      const list = fs.readdirSync(dir);
      list.forEach((file) => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
          results.push(...getAllFiles(fullPath));
        } else {
          // Store relative path to packageDir for easier matching
          results.push(path.relative(packageDir, fullPath));
        }
      });
      return results;
    };

    const files = getAllFiles(packageDir);

    // Assert REQUIRED files exist
    const requiredFiles = [
      'dist/cli.js',
      'dist/index.js',
      'dist/core/index.js',
      'dist/renderer/components/index.js',
      'dist/renderer/assets/fonts/NotoSans-Regular.ttf',
      'dist/renderer/assets/fonts/NotoSans-SemiBold.ttf',
      'SKILL.md',
      'package.json'
    ];

    for (const req of requiredFiles) {
      expect(files).toContain(req);
    }

    for (const file of files) {
      // Allow .d.ts and .d.ts.map files specifically
      if (file.endsWith('.d.ts') || file.endsWith('.d.ts.map')) {
        continue;
      }

      // Assert: Any file matching **/*.ts (except .d.ts) is forbidden
      if (file.endsWith('.ts')) {
        expect(file).not.toMatch(/\.ts$/);
      }

      // Assert: Any file matching **/vite.config* or **/tsdown.config* is forbidden
      expect(file).not.toMatch(/vite\.config/i);
      expect(file).not.toMatch(/tsdown\.config/i);

      // Normalize path segments to check forbidden directories
      const segments = file.split(/[/\\]/);

      // Assert: Any file inside preview/, preview-dist/, src/, .planning/, or node_modules/ is forbidden
      const forbiddenDirs = ['preview', 'preview-dist', 'src', '.planning', 'node_modules'];
      for (const forbiddenDir of forbiddenDirs) {
        expect(segments).not.toContain(forbiddenDir);
      }
    }
  });

  it('asserts total tarball size is reasonable', () => {
    const stats = fs.statSync(tarballPath);
    // Compressed tarball size is less than 5MB
    expect(stats.size).toBeLessThan(5 * 1024 * 1024);

    // Also check uncompressed sizes
    let totalUncompressedSize = 0;
    const packageDir = path.join(extractedDir, 'package');
    const calculateSize = (dir: string) => {
      const list = fs.readdirSync(dir);
      list.forEach((file) => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
          calculateSize(fullPath);
        } else {
          totalUncompressedSize += stat.size;
        }
      });
    };
    calculateSize(packageDir);
    expect(totalUncompressedSize).toBeLessThan(5 * 1024 * 1024);
  });
});
