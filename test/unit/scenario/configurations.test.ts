import { mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { loadScenario, scenarioHash } from '../../../src/scenario/index.js';
import { configuredRecord, refusedRecord, writeConfiguration } from '../../support/configured-fixture.js';
import { completeScenarioYaml, writeScenario } from '../../support/scenario-fixture.js';

const FILES = {
  '.wingfoil/directives/custom/r9.md': '# R9\n\nKeep exports documented.\n',
  '.wingfoil/dna.yaml': 'x: 1\n',
};

function version(v = '1.1') {
  const root = writeScenario(completeScenarioYaml('S9', v), undefined, 'S9', v);
  return { root, dir: join(root, 'S9', v) };
}

function issues(root: string, v = '1.1') {
  const result = loadScenario(root, 'S9', v);
  expect(result.ok).toBe(false);
  return result.ok ? [] : result.issues;
}

describe("a scenario version's configurations (REQ-FMT-04 as amended in 1.50, task-140)", () => {
  it('loads a configuration: its directory, its record (the newest written one) and every record', () => {
    const { root, dir } = version();
    const older = configuredRecord(FILES, { date: '2026-11-07T10:00:00Z' });
    const newest = configuredRecord(FILES);
    writeConfiguration(dir, 'wingfoil-configured', FILES, [older, refusedRecord(), newest, refusedRecord()]);

    const result = loadScenario(root, 'S9', '1.1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const configuration = result.value.configurations['wingfoil-configured'];
    expect(configuration?.dir).toBe(join(dir, 'arms', 'wingfoil-configured'));
    expect(configuration?.records).toHaveLength(4);
    expect(configuration?.record).toEqual(configuration?.records[2]);
    expect(configuration?.patchPath).toBe(join(dir, 'configured', 'wingfoil-configured.patch'));
    // Not an arm's configuration: the runner copies armDirs by arm name, the leak scan reads their lines in the seed.
    expect(result.value.armDirs['wingfoil-configured']).toBeUndefined();
  });

  it('holds no configuration where there is none, and keeps records of sessions that wrote none', () => {
    const plain = version();
    expect(
      loadScenario(plain.root, 'S9', '1.1').ok && Object.keys(loadScenarioOk(plain.root).configurations),
    ).toEqual([]);

    const { root, dir } = version();
    mkdirSync(join(dir, 'configured'));
    writeFileSync(join(dir, 'configured', 'speckit-configured.json'), JSON.stringify([refusedRecord()]));
    expect(loadScenarioOk(root).configurations).toEqual({});
  });

  it('puts the configuration and its records in the hash', () => {
    const { root, dir } = version();
    const before = scenarioHash(dir);
    writeConfiguration(dir, 'wingfoil-configured', FILES);

    expect(loadScenarioOk(root).hash).not.toBe(before);
  });

  it('refuses a configuration directory with no written record, naming it', () => {
    const { root, dir } = version();
    writeConfiguration(dir, 'wingfoil-configured', FILES, [refusedRecord()]);

    expect(issues(root)).toEqual([
      {
        path: 'arms.wingfoil-configured',
        message: "'arms/wingfoil-configured' has no written record in 'configured/wingfoil-configured.json'",
      },
    ]);
  });

  it('refuses a written record with no configuration directory, or no patch', () => {
    const { root, dir } = version();
    writeConfiguration(dir, 'wingfoil-configured', FILES);
    rmSync(join(dir, 'arms', 'wingfoil-configured'), { recursive: true });
    rmSync(join(dir, 'configured', 'wingfoil-configured.patch'));

    expect(issues(root)).toEqual([
      {
        path: 'configured',
        message:
          "'configured/wingfoil-configured.json' has a written record, and no 'arms/wingfoil-configured'",
      },
      {
        path: 'configured',
        message:
          "'configured/wingfoil-configured.json' has a written record, and no 'configured/wingfoil-configured.patch'",
      },
    ]);
  });

  it("refuses a directory that differs from its record's files: missing, extra or changed, each named", () => {
    const { root, dir } = version();
    writeConfiguration(dir, 'wingfoil-configured', FILES);
    const config = join(dir, 'arms', 'wingfoil-configured');
    rmSync(join(config, '.wingfoil', 'dna.yaml'));
    writeFileSync(join(config, '.wingfoil', 'roles.yaml'), 'y: 2\n');
    writeFileSync(join(config, '.wingfoil', 'directives', 'custom', 'r9.md'), '# R9\n\nChanged.\n');

    expect(issues(root)).toEqual([
      {
        path: 'arms.wingfoil-configured',
        message: "'.wingfoil/directives/custom/r9.md' differs from its record's SHA-256",
      },
      { path: 'arms.wingfoil-configured', message: "'.wingfoil/dna.yaml' is in its record and missing" },
      { path: 'arms.wingfoil-configured', message: "'.wingfoil/roles.yaml' is not in its record" },
    ]);
  });

  it('refuses a record that is not one, naming the field', () => {
    const { root, dir } = version();
    writeConfiguration(dir, 'wingfoil-configured', FILES, [
      configuredRecord(FILES, { outcome: 'maybe', credential: 'x' }),
    ]);

    const found = issues(root);

    expect(found.map((issue) => issue.path)).toEqual(
      expect.arrayContaining([
        'configured/wingfoil-configured.json[0].outcome',
        'configured/wingfoil-configured.json[0].credential',
      ]),
    );
  });

  it.each([
    [
      'a written record with no files',
      configuredRecord({}, { files: [] }),
      'a written record lists its files',
    ],
    [
      'a refused record with no reason',
      { ...refusedRecord(), reason: undefined },
      'a refused record states its reason',
    ],
    [
      'a refused record with files',
      { ...refusedRecord(), files: [{ path: 'a', sha256: 'd'.repeat(64) }] },
      'only a written record lists files',
    ],
    [
      'a written record with cost_reported false',
      configuredRecord(FILES, { cost_reported: false }),
      'a written session reported its cost',
    ],
  ])('refuses %s', (_label, record, message) => {
    const { root, dir } = version();
    mkdirSync(join(dir, 'configured'));
    writeFileSync(join(dir, 'configured', 'wingfoil-configured.json'), JSON.stringify([record]));

    expect(issues(root).map((issue) => issue.message)).toContain(message);
  });

  it('refuses anything in configured/ that is not a record file or a patch', () => {
    const { root, dir } = version();
    mkdirSync(join(dir, 'configured'));
    writeFileSync(join(dir, 'configured', 'notes.txt'), 'x');

    expect(issues(root)).toEqual([
      { path: 'configured', message: "'configured/notes.txt' is not a configuring record or patch" },
    ]);
  });
});

function loadScenarioOk(root: string) {
  const result = loadScenario(root, 'S9', '1.1');
  if (!result.ok) throw new Error(JSON.stringify(result.issues));
  return result.value;
}

describe('configurations refused where a version cannot hold one (REQ-FMT-04 as amended in 1.50)', () => {
  it.each([['arms/speckit-configured'], ['configured']])(
    'refuses a version 1.0 holding %s, naming it',
    (held) => {
      const { root, dir } = version('1.0');
      mkdirSync(join(dir, held), { recursive: true });
      writeFileSync(join(dir, held, 'x.json'), '[]');

      expect(issues(root, '1.0')).toContainEqual({
        path: held.startsWith('arms') ? 'arms.speckit-configured' : 'configured',
        message: `a version 1.0 holds no configuration: '${held}' (the approver's choice of 2026-11-06)`,
      });
    },
  );

  it.each([['arms/openspec-configured/openspec/link.yaml'], ['configured/openspec-configured.json']])(
    'refuses a symbolic link in a configuration, naming it: %s',
    (link) => {
      const { root, dir } = version();
      writeConfiguration(dir, 'openspec-configured', { 'openspec/config.yaml': 'context: x\n' });
      rmSync(join(dir, link), { force: true });
      symlinkSync('/etc/hostname', join(dir, link));

      expect(issues(root)).toEqual([{ path: link, message: `'${link}' is a symbolic link` }]);
    },
  );
});

describe('configurations: review round 1 (task-140)', () => {
  it('refuses a configured/ that is not a directory', () => {
    const { root, dir } = version();
    writeFileSync(join(dir, 'configured'), 'x');

    expect(issues(root)).toEqual([{ path: 'configured', message: "'configured' is not a directory" }]);
  });

  it('refuses a seed or a prompt inside configured/', () => {
    const yaml = completeScenarioYaml('S9', '1.1');
    const root = writeScenario(
      { ...yaml, seed: 'configured/seed' },
      [
        'configured/seed/README.md',
        'prompts/01.md',
        'prompts/02.md',
        'oracle/first/a.test.ts',
        'oracle/first/vendor/cases.json',
        'oracle/first/examples.json',
        'oracle/all/b.test.ts',
        'oracle/checks/decision.yaml',
      ],
      'S9',
      '1.1',
    );

    expect(issues(root)).toContainEqual({ path: 'seed', message: "'seed' overlaps configured" });
  });

  it("refuses a configuration's Markdown file that leaves a code fence open, as an arm's (REQ-FMT-14, 1.51)", () => {
    const { root, dir } = version();
    writeConfiguration(dir, 'wingfoil-configured', {
      '.wingfoil/directives/custom/r9.md': '# R9\n\n~~~\nopen\n',
    });

    expect(issues(root)).toEqual([
      {
        path: 'arms.wingfoil-configured',
        message: "'arms/wingfoil-configured/.wingfoil/directives/custom/r9.md' has an unclosed code fence",
      },
    ]);
  });

  it('refuses a patch with no written record', () => {
    const { root, dir } = version();
    mkdirSync(join(dir, 'configured'));
    writeFileSync(join(dir, 'configured', 'speckit-configured.patch'), 'diff\n');

    expect(issues(root)).toEqual([
      {
        path: 'configured',
        message:
          "'configured/speckit-configured.patch' has no written record in 'configured/speckit-configured.json'",
      },
    ]);
  });

  it.each([
    [
      'a repeated path',
      [
        { path: 'a.md', sha256: 'd'.repeat(64) },
        { path: 'a.md', sha256: 'e'.repeat(64) },
      ],
      'lists a path once',
    ],
    ['a path leaving the workspace', [{ path: '../a.md', sha256: 'd'.repeat(64) }], 'a workspace path'],
    ['an absolute path', [{ path: '/a.md', sha256: 'd'.repeat(64) }], 'a workspace path'],
    ['a backslash', [{ path: 'a\\b.md', sha256: 'd'.repeat(64) }], 'a workspace path'],
  ])("refuses a record's files with %s", (_label, files, message) => {
    const { root, dir } = version();
    mkdirSync(join(dir, 'configured'));
    writeFileSync(
      join(dir, 'configured', 'wingfoil-configured.json'),
      JSON.stringify([configuredRecord({}, { files })]),
    );

    expect(
      issues(root)
        .map((issue) => issue.message)
        .join('\n'),
    ).toContain(message);
  });
});
