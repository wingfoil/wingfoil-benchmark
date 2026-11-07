import { describe, expect, it } from 'vitest';

import { globIssue, matchesGlob } from '../../../src/core/index.js';

describe('matchesGlob (REQ-FMT-05 as amended in 1.50: configuration and state places)', () => {
  it.each([
    ['.wingfoil/dna.yaml', '.wingfoil/dna.yaml', true],
    ['.wingfoil/dna.yaml', '.wingfoil/roles.yaml', false],
    ['.wingfoil/directives/custom/**', '.wingfoil/directives/custom/r1.md', true],
    ['.wingfoil/directives/custom/**', '.wingfoil/directives/custom/a/b.md', true],
    // A dot segment is matched like any other: a state place such as `.index/` lies inside a configuration place.
    ['.wingfoil/directives/custom/**', '.wingfoil/directives/custom/.index/a', true],
    ['.wingfoil/directives/custom/**', '.wingfoil/directives/custom', false],
    ['.wingfoil/directives/custom/', '.wingfoil/directives/custom/r1.md', true],
    ['.claude/commands/*.md', '.claude/commands/plan.md', true],
    ['.claude/commands/*.md', '.claude/commands/sub/plan.md', false],
    ['**/*.md', 'CLAUDE.md', true],
    ['**/*.md', 'docs/a/README.md', true],
    ['*.md', 'CLAUDE.md', true],
    ['*.md', 'docs/README.md', false],
    ['src/**', 'src/index.ts', true],
    ['?.md', 'a.md', true],
    ['?.md', 'ab.md', false],
    // Regular-expression characters are literal.
    ['a+b(c).yaml', 'a+b(c).yaml', true],
    ['a+b(c).yaml', 'aab(c).yaml', false],
  ])('%s against %s: %s', (glob, path, expected) => {
    expect(matchesGlob(glob, path)).toBe(expected);
  });

  it.each([
    ['', 'is empty'],
    ['/etc/passwd', 'must be relative to the workspace'],
    ['../outside/**', "must not hold '..'"],
    ['a/../b', "must not hold '..'"],
    ['a\\b', 'must use forward slashes'],
    ['a//b', 'must not hold an empty segment'],
    ['a/***/b', "'**' must be a whole segment"],
    ['a**/b', "'**' must be a whole segment"],
    ['[ab].md', 'supports only *, ** and ?'],
    ['{a,b}.md', 'supports only *, ** and ?'],
  ])("refuses the glob '%s': %s", (glob, message) => {
    expect(globIssue(glob)).toContain(message);
  });

  it('accepts the globs it matches', () => {
    expect(globIssue('.claude/**')).toBeUndefined();
    expect(globIssue('.wingfoil/directives/custom/')).toBeUndefined();
  });
});
