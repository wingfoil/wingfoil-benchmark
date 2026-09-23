import { defineConfig } from 'vitest/config';

/** The built command line (`npm run test:bin`): it builds first, so it is not part of `npm test`. */
export default defineConfig({
  test: { include: ['test/bin/**/*.test.ts'], testTimeout: 120_000 },
});
