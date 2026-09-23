import { defineConfig } from 'vitest/config';

/** The runs against the real Docker (`npm run test:docker`): outside `npm test` and its coverage. */
export default defineConfig({
  test: { include: ['test/docker/**/*.test.ts'], testTimeout: 600_000, hookTimeout: 600_000 },
});
