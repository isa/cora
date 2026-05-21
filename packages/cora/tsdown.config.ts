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
    entry: ['src/cli/index.ts'],
    outDir: 'dist',
    format: ['esm'],
    fixedExtension: false,
    dts: false,
    banner: {
      js: '#!/usr/bin/env node',
    },
    outputOptions: {
      entryFileNames: 'cli.js',
    },
  },
]);
