import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // Fixtures are scenario content, not the benchmark's tests: an oracle there tests an agent's work.
    exclude: ['test/docker/**', 'test/bin/**', 'test/fixtures/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'eslint/**/*.js'],
      // The bin only wires main() to the process; it is run by hand in review (task-002).
      exclude: ['src/cli/main.ts'],
      thresholds: { lines: 80, branches: 80, functions: 80, statements: 80 },
    },
  },
});
