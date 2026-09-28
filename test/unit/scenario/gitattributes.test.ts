import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

import { repoPath } from '../../support/paths.js';

describe('scenario files keep their bytes in every clone (REQ-FMT-09)', () => {
  it.each([['scenarios/leak-scan.yaml'], ['test/fixtures/scenarios/T3/1.0/prompts/01.md']])(
    'git never converts the line endings of %s',
    (path) => {
      const attribute = execFileSync('git', ['-C', repoPath('.'), 'check-attr', 'text', '--', path], {
        encoding: 'utf8',
      });
      expect(attribute.trim()).toBe(`${path}: text: unset`);
    },
  );
});
