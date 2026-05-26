import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    outDir: 'dist',
    format: ['esm'],
    fixedExtension: false,
    dts: true,
    clean: true,
  },
  {
    entry: ['src/core/index.ts'],
    outDir: 'dist/core',
    format: ['esm'],
    fixedExtension: false,
    dts: true,
  },
  {
    entry: ['src/renderer/index.ts'],
    outDir: 'dist/renderer',
    format: ['esm'],
    fixedExtension: false,
    dts: false,
  },
  {
    entry: ['src/renderer/components/index.ts'],
    outDir: 'dist/renderer/components',
    format: ['esm'],
    fixedExtension: false,
    dts: true,
  },
  {
    entry: ['src/cli/commands/preview.ts'],
    outDir: 'dist/commands',
    format: ['esm'],
    fixedExtension: false,
    dts: false,
    external: ['vite', /^vite\//],
  },
  {
    entry: ['src/cli/index.ts'],
    outDir: 'dist',
    format: ['esm'],
    fixedExtension: false,
    dts: false,
    external: ['./commands/preview.js', 'vite', /^vite\//],
    banner: {
      js: '#!/usr/bin/env node',
    },
    outputOptions: {
      entryFileNames: 'cli.js',
    },
  },
]);
