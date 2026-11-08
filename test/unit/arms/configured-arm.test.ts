import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { armDigest, armDigestOf, armFromHistory, configuredOfIn, loadArm } from '../../../src/arms/index.js';
import { baseArmOf, harnessCoverage } from '../../../src/core/index.js';
import { harnessKey } from '../../../src/results/index.js';
import { commitAll } from '../../support/configured-arm-fixture.js';
import { repoPath } from '../../support/paths.js';
import { tempDir } from '../../support/scenario-fixture.js';

/** A repository root holding the repository's wingfoil, speckit and baseline arms and their configured ones. */
function armsRepo(): string {
  const root = tempDir('bench-configured-arms-');
  for (const arm of ['wingfoil', 'wingfoil-configured', 'speckit', 'baseline'])
    cpSync(repoPath(`arms/${arm}`), join(root, 'arms', arm), { recursive: true });
  return root;
}

const configured = (root: string, yaml: string) => {
  rmSync(join(root, 'arms', 'wingfoil-configured'), { recursive: true, force: true });
  mkdirSync(join(root, 'arms', 'wingfoil-configured'), { recursive: true });
  writeFileSync(join(root, 'arms', 'wingfoil-configured', 'arm.yaml'), yaml);
};

describe('a configured arm (REQ-FMT-05 as amended in 1.50, task-142)', () => {
  it('loads as its base arm under its own name, every path its base arm’s', () => {
    const root = armsRepo();
    const loaded = loadArm(join(root, 'arms'), 'wingfoil-configured');
    const base = loadArm(join(root, 'arms'), 'wingfoil');
    if (!loaded.ok || !base.ok) throw new Error('not loaded');
    expect(loaded.value).toEqual({ ...base.value, name: 'wingfoil-configured', configuredOf: 'wingfoil' });
    expect(baseArmOf(loaded.value)).toBe('wingfoil');
    expect(baseArmOf(base.value)).toBe('wingfoil');
  });

  it('refuses a base that is missing, itself, or not loadable, and a name or a link of its own', () => {
    const root = armsRepo();
    const issues = (yaml: string) => {
      configured(root, yaml);
      const loaded = loadArm(join(root, 'arms'), 'wingfoil-configured');
      return loaded.ok ? [] : loaded.issues;
    };
    expect(issues('name: wingfoil-configured\nconfigured_of: nowhere\n')).toEqual([
      { path: 'configured_of', message: "'nowhere' is not an arm under arms/" },
    ]);
    expect(issues('name: wingfoil-configured\nconfigured_of: wingfoil-configured\n')).toEqual([
      { path: 'configured_of', message: "'wingfoil-configured' is not an arm under arms/" },
    ]);
    expect(issues('name: other\nconfigured_of: wingfoil\n')).toEqual([
      { path: 'name', message: "'other' differs from its directory 'wingfoil-configured'" },
    ]);
    expect(issues('name: wingfoil-configured\nconfigured_of: wingfoil\nmanual: m.md\nmcp: x.json\n')).toEqual(
      [
        {
          path: 'manual',
          message: "is the base arm's: a configured arm declares only its name and configured_of",
        },
        {
          path: 'mcp',
          message: "is the base arm's: a configured arm declares only its name and configured_of",
        },
      ],
    );
    configured(root, 'name: wingfoil-configured\nconfigured_of: wingfoil\n');
    symlinkSync('/etc/hostname', join(root, 'arms', 'wingfoil-configured', 'link'));
    const linked = loadArm(join(root, 'arms'), 'wingfoil-configured');
    expect(linked.ok ? [] : linked.issues).toEqual([{ path: 'link', message: "'link' is a symbolic link" }]);
    configured(root, 'name: wingfoil-configured\nconfigured_of: wingfoil\n');
    writeFileSync(join(root, 'arms', 'wingfoil', 'arm.yaml'), 'name: wingfoil\n');
    expect(issues('name: wingfoil-configured\nconfigured_of: wingfoil\n')[0]?.message).toMatch(
      /\(in wingfoil\)$/,
    );
  });

  it('lets only a docs control of wingfoil or of wingfoil-configured choose its directives', () => {
    const root = armsRepo();
    cpSync(repoPath('arms/baseline-docs-configured'), join(root, 'arms', 'baseline-docs-configured'), {
      recursive: true,
    });
    expect(loadArm(join(root, 'arms'), 'baseline-docs-configured').ok).toBe(true);
  });
});

describe("a configured arm's digest and history (REQ-FMT-13 as amended in 1.50, task-142)", () => {
  it('covers its own directory and its base arm’s, and its own alone when the base is missing', () => {
    const root = armsRepo();
    expect(configuredOfIn('name: x\nconfigured_of: wingfoil\n')).toBe('wingfoil');
    expect(configuredOfIn('name: x\nconfigured_of: [a]\n')).toBeUndefined();
    expect(configuredOfIn(': : :\n')).toBeUndefined();
    const both = new Map<string, Buffer | string>();
    for (const arm of ['wingfoil-configured', 'wingfoil'])
      for (const file of readdirSync(join(root, 'arms', arm)))
        both.set(`arms/${arm}/${file}`, readFileSync(join(root, 'arms', arm, file)));
    expect(armDigest(root, 'wingfoil-configured')).toBe(armDigestOf(both));
    const own = new Map([...both].filter(([path]) => path.startsWith('arms/wingfoil-configured/')));
    rmSync(join(root, 'arms', 'wingfoil'), { recursive: true });
    expect(armDigest(root, 'wingfoil-configured')).toBe(armDigestOf(own));
  });

  it('is read from the commit whose two directories digest to the pin, both written aside', () => {
    const root = armsRepo();
    commitAll(root);
    const pinned = armDigest(root, 'wingfoil-configured').slice(0, 12);
    writeFileSync(join(root, 'arms', 'wingfoil', 'manual.md'), '# A later manual\n');
    commitAll(root);
    expect(armDigest(root, 'wingfoil-configured').slice(0, 12)).not.toBe(pinned);
    const found = armFromHistory(root, 'wingfoil-configured', pinned);
    if (found === undefined) throw new Error('not found');
    expect(armDigest(found.root, 'wingfoil-configured').slice(0, 12)).toBe(pinned);
    const loaded = loadArm(join(found.root, 'arms'), 'wingfoil-configured');
    expect(loaded.ok && loaded.value.configuredOf).toBe('wingfoil');
    // A second read reuses what the first wrote
    expect(armFromHistory(root, 'wingfoil-configured', pinned)).toEqual(found);
  });
});

describe("a configured arm's harness (REQ-FMT-01 as amended in 1.50, task-142)", () => {
  const arms = [
    { name: 'wingfoil-configured', requires: 'wingfoil', configuredOf: 'wingfoil' },
    { name: 'baseline' },
  ];
  const pin = { tool: 'wingfoil', version: 'v0.3.1' };

  it('is its base arm’s entry, which it shares and never declares as its own', () => {
    expect(harnessCoverage({ harnesses: { wingfoil: pin } }, arms)).toEqual([]);
    expect(harnessCoverage({ harnesses: {} }, arms)).toEqual([
      {
        path: 'harnesses.wingfoil',
        message: "is required: the arm wingfoil-configured requires the harness 'wingfoil'",
      },
    ]);
    expect(harnessCoverage({ harnesses: { wingfoil: pin, 'wingfoil-configured': pin } }, arms)).toEqual([
      {
        path: 'harnesses.wingfoil-configured',
        message: "must not be set: a configured arm shares its base arm's entry, harnesses.wingfoil",
      },
    ]);
  });

  it('keys a dry run of a configured arm, or of its docs control, on its base arm’s pin', () => {
    const withControl = [...arms, { name: 'baseline-docs-configured', docsOf: 'wingfoil-configured' }];
    const expected = { harness: { tool: 'wingfoil', pin: { version: 'v0.3.1' } } };
    expect(harnessKey({ wingfoil: pin }, withControl, 'wingfoil-configured')).toEqual(expected);
    expect(harnessKey({ wingfoil: pin }, withControl, 'baseline-docs-configured')).toEqual(expected);
  });
});
