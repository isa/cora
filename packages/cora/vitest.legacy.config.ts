import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/legacy/**/*.test.ts', 'tests/legacy/**/*.test.tsx'],
    reporters: 'default',
    testTimeout: 30000,
  },
});
