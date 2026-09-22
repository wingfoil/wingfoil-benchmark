import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['test/docker/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'eslint/**/*.js'],
      thresholds: { lines: 80, branches: 80, functions: 80, statements: 80 },
    },
  },
});
