import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      'node:fs': resolve(__dirname, './node-stub.ts'),
      'node:path': resolve(__dirname, './node-stub.ts'),
      'node:url': resolve(__dirname, './node-stub.ts'),
      'node:module': resolve(__dirname, './node-stub.ts'),
    },
  },
});
