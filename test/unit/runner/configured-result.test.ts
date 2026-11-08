import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { TreeChange } from '../../../src/core/index.js';
import { identityOf, offencesOf, refusalReason } from '../../../src/runner/configured-result.js';
import { tempDir } from '../../support/scenario-fixture.js';

const ARM = {
  name: 'wingfoil',
  configuration: [
    { glob: '.wingfoil/**', source: 'test' },
    { glob: 'notes/', source: 'test' },
  ],
  state: [{ glob: '.wingfoil/memory/**', source: 'test' }],
};

const added = (path: string, mode = '100644'): TreeChange => ({ status: 'A', path, mode });

function workspace(files: Record<string, string> = {}): string {
  const dir = tempDir('bench-configured-');
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
  return dir;
}

function offences(changes: readonly TreeChange[], extra: Partial<Parameters<typeof offencesOf>[0]> = {}) {
  return offencesOf({
    arm: ARM,
    changes,
    manualFile: 'CLAUDE.md',
    manualWritten: false,
    identityChanged: undefined,
    workspace: workspace(),
    secrets: [],
    ...extra,
  });
}

describe("a configuring session's result (REQ-RUN-20, task-141)", () => {
  it('accepts files added or changed inside the configuration places, a directory place included', () => {
    expect(
      offences([
        added('.wingfoil/directives/custom/r9.md'),
        { status: 'M', path: '.wingfoil/roles.yaml', mode: '100644' },
        added('notes/a/b.md'),
        added('.wingfoil/run.sh', '100755'),
      ]),
    ).toEqual([]);
  });

  it('refuses a deleted file, a symbolic link, a submodule and a type change, wherever they are', () => {
    expect(
      offences([
        { status: 'D', path: '.wingfoil/roles.yaml', mode: '000000' },
        added('.wingfoil/link', '120000'),
        added('.wingfoil/sub', '160000'),
        { status: 'T', path: '.wingfoil/dna.yaml', mode: '120000' },
      ]),
    ).toEqual([
      { path: '.wingfoil/dna.yaml', why: 'is a symbolic link' },
      { path: '.wingfoil/link', why: 'is a symbolic link' },
      { path: '.wingfoil/roles.yaml', why: 'was deleted' },
      { path: '.wingfoil/sub', why: 'is not a regular file' },
    ]);
  });

  it('refuses a path outside the places, and one in a state place, setup-made or new', () => {
    expect(
      offences([
        added('src/helpers.ts'),
        { status: 'M', path: '.wingfoil/memory/task/t1.md', mode: '100644' },
        added('notes'),
      ]),
    ).toEqual([
      { path: '.wingfoil/memory/task/t1.md', why: 'is in a state place' },
      { path: 'notes', why: 'is outside the configuration places' },
      { path: 'src/helpers.ts', why: 'is outside the configuration places' },
    ]);
  });

  it("refuses a file written at the manual's path, and a change to the members or roles", () => {
    expect(
      offences([added('.wingfoil/dna.yaml')], { manualWritten: true, identityChanged: '.wingfoil/dna.yaml' }),
    ).toEqual([
      { path: '.wingfoil/dna.yaml', why: "changes the members, the roles or a member's roles" },
      { path: 'CLAUDE.md', why: "was written at the manual's path" },
    ]);
  });

  it('refuses a Markdown file in a place that leaves a code fence open (REQ-FMT-04 as amended in 1.52)', () => {
    const dir = workspace({
      '.wingfoil/directives/custom/open.md': '# Rule\n\n```ts\nconst a = 1;\n',
      '.wingfoil/directives/custom/closed.md': '# Rule\n\n```ts\nconst a = 1;\n```\n',
    });
    expect(
      offences(
        [added('.wingfoil/directives/custom/open.md'), added('.wingfoil/directives/custom/closed.md')],
        {
          workspace: dir,
        },
      ),
    ).toEqual([{ path: '.wingfoil/directives/custom/open.md', why: 'leaves a code fence open' }]);
  });

  it('names every offending path once in the reason, in order', () => {
    expect(
      refusalReason([
        { path: 'a', why: 'was deleted' },
        { path: 'b', why: 'is outside the configuration places' },
      ]),
    ).toBe(
      "the session's result touches what is not configuration: 'a' was deleted; " +
        "'b' is outside the configuration places",
    );
  });
});

describe('the identities a configuring session must not change (REQ-RUN-17, REQ-RUN-20)', () => {
  const dna = (members: string, roles = '    - name: developer\n    - name: approver\n') =>
    `project:\n  name: P\nteam:\n  members:\n${members}  roles:\n${roles}`;
  const approver =
    '    - name: Benchmark Approver\n      email: approver@benchmark.localhost\n      roles: [approver]\n';

  it("reads WingFoil's members and roles from .wingfoil/dna.yaml, whatever else the file says", () => {
    const before = identityOf('wingfoil', workspace({ '.wingfoil/dna.yaml': dna(approver) }));
    const reworded = identityOf(
      'wingfoil',
      workspace({ '.wingfoil/dna.yaml': `# A comment\n${dna(approver).replace('name: P', 'name: Q')}` }),
    );
    expect(before?.file).toBe('.wingfoil/dna.yaml');
    expect(reworded).toEqual(before);
  });

  it("tells a changed member's roles, an added member and a changed list of roles", () => {
    const before = identityOf('wingfoil', workspace({ '.wingfoil/dna.yaml': dna(approver) }));
    for (const after of [
      dna(approver.replace('[approver]', '[developer]')),
      dna(`${approver}    - name: B\n      email: b@x.example\n      roles: [approver]\n`),
      dna(approver, '    - name: developer\n'),
    ]) {
      expect(identityOf('wingfoil', workspace({ '.wingfoil/dna.yaml': after }))).not.toEqual(before);
    }
  });

  it('reads a missing or unreadable file as such, and nothing for a tool with no members', () => {
    expect(identityOf('wingfoil', workspace())?.value).toBe('none');
    expect(identityOf('wingfoil', workspace({ '.wingfoil/dna.yaml': ': : :\n' }))?.value).toBe('unreadable');
    expect(identityOf('speckit', workspace())).toBeUndefined();
    expect(identityOf('openspec', workspace())).toBeUndefined();
  });
});

describe("a configuring session's result: review round 1 (task-141)", () => {
  it('refuses a type change to a regular file, as a setup-made link replaced by a file', () => {
    expect(offences([{ status: 'T', path: '.wingfoil/run', mode: '100644' }])).toEqual([
      { path: '.wingfoil/run', why: 'changed its type' },
    ]);
  });

  it("refuses a file that holds the credential's value, wherever it is (REQ-NFR-01)", () => {
    const dir = workspace({ '.wingfoil/notes.md': 'token: s3cr3t-value\n', '.wingfoil/clean.md': 'clean\n' });
    expect(
      offences([added('.wingfoil/notes.md'), added('.wingfoil/clean.md')], {
        workspace: dir,
        secrets: ['', ' ', 's3cr3t-value'],
      }),
    ).toEqual([{ path: '.wingfoil/notes.md', why: 'holds a credential value' }]);
  });
});
