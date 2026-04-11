import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/**/tests/**/*.test.ts', 'integration/**/*.test.ts'],
    testTimeout: 120000,
  },
});