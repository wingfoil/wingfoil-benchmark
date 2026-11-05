import { defineConfig } from 'vitest/config';

/**
 * The built command line (`npm run test:bin`): it builds first, so it is not part of `npm test`. One file at a time:
 * each file builds `dist/` before it reads it, and two builds at once would change it under the other (task-134).
 */
export default defineConfig({
  test: { include: ['test/bin/**/*.test.ts'], testTimeout: 120_000, fileParallelism: false },
});
