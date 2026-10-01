import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // Fixtures are scenario content, not the benchmark's tests: an oracle there tests an agent's work.
    exclude: ['test/docker/**', 'test/bin/**', 'test/fixtures/**'],
    // Many tests build stored runs with git and score them through the scoring double. Under load (other
    // sessions' suites, load average 48–56) the slowest without a timeout of its own took 11 s against
    // vitest's 5 s default (bug-008, task-048): five times that, and a test that hangs still fails.
    // Hooks get the same, for the first async fixture hook; today's hooks are synchronous.
    testTimeout: 60_000,
    hookTimeout: 60_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'eslint/**/*.js'],
      // The bin only wires main() to the process; it is run by hand in review (task-002).
      exclude: ['src/cli/main.ts'],
      thresholds: { lines: 80, branches: 80, functions: 80, statements: 80 },
    },
  },
});
