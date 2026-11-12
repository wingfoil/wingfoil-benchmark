// task-146 — the method page's block on the configuring agent and each configuration (REQ-RES-02 as amended in 1.50,
// T12, F7.5): read from the scenario versions' records and patches, the prompt and profile as the records name them.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { loadArm } from '../../../src/arms/index.js';
import { historyCli, systemProcess } from '../../../src/core/index.js';
import { configuringSection } from '../../../src/site/configuring.js';
import { escapeHtml } from '../../../src/site/render.js';
import {
  commitAll,
  configuredRepo,
  FIXTURE_PROFILE,
  FIXTURE_PROMPT,
  PROFILE_SHA,
  PROMPT_SHA,
  sha256,
} from '../../support/configured-arm-fixture.js';

const history = historyCli(systemProcess);
const CONSTITUTION = '.specify/memory/constitution.md';
const COMMAND = '.specify/templates/overrides/plan-template.md';
const FILES = {
  [CONSTITUTION]:
    '# Constitution\n\n## Core Principles\n\n### I. Small functions\n\nKeep every function small.\n',
  [COMMAND]: '# Review\n',
};

/** S1 1.1 holding a speckit configuration of two files, one of them outside what speckit-docs renders. */
function repo() {
  return configuredRepo(
    ['baseline', 'speckit-configured', 'speckit-docs-configured'],
    ['S1@1.1'],
    [{ scenario: 'S1@1.1', arm: 'speckit-configured', files: FILES, record: { cost_eur: 0.25 } }],
  );
}

describe("the method page's configuring block (task-146, REQ-RES-02 as amended in 1.50)", () => {
  it('names the configuring agent and quotes its prompt in full with its SHA-256', async () => {
    const { root } = repo();
    const ran = [{ scenario: 'S1', version: '1.1', arm: 'speckit-configured' }];

    const section = await configuringSection(root, ran, history);

    if (!section.ok) throw new Error(JSON.stringify(section.issues));
    const { html } = section.value;
    expect(html).toContain('claude-code');
    expect(html).toContain(`sha256:${PROMPT_SHA}`);
    expect(html).toContain(`<pre><code>${escapeHtml(FIXTURE_PROMPT)}</code></pre>`);
  });

  it("lists each configuration's files, its patch, its cost and what its docs control did not render", async () => {
    const { root } = repo();
    const patch = readFileSync(
      join(root, 'scenarios', 'S1', '1.1', 'configured', 'speckit-configured.patch'),
      'utf8',
    );
    // A docs control alone reads the configuration too
    const ran = [{ scenario: 'S1', version: '1.1', arm: 'speckit-docs-configured' }];

    const section = await configuringSection(root, ran, history);

    if (!section.ok) throw new Error(JSON.stringify(section.issues));
    const { html, material } = section.value;
    expect(html).toContain('S1@1.1, speckit-configured');
    for (const [path, content] of Object.entries(FILES)) {
      expect(html).toContain(`<code>${path}</code>`);
      expect(html).toContain(sha256(content));
    }
    // The cost of its sessions, M-K3's one-off part
    expect(html).toContain('0.2500 EUR');
    // The docs control renders the constitution, not the command
    expect(html).toMatch(new RegExp(`Not rendered by its docs control</th><td><code>${COMMAND}</code>`));
    // The speckit arm's configuration places, with their sources
    expect(html).toMatch(
      /Configuration places<\/th><td><code>\.specify\/memory\/constitution\.md<\/code>: the speckit-constitution skill/,
    );
    expect(html).toContain('<code>.specify/presets/**</code>');
    // The patch is a material page of its own, linked
    const page = 'configuration-S1@1.1-speckit-configured.html';
    expect(html).toContain(`href="material/${page}"`);
    expect(material.get(page)).toContain(escapeHtml(patch));
  });

  it('reads the prompt its records name from the history when the working tree holds another', async () => {
    const { root } = repo();
    writeFileSync(join(root, 'configuring', 'prompt.md'), '# Another prompt\n');
    const ran = [{ scenario: 'S1', version: '1.1', arm: 'speckit-configured' }];

    const section = await configuringSection(root, ran, history);

    if (!section.ok) throw new Error(JSON.stringify(section.issues));
    expect(section.value.html).toContain(escapeHtml(FIXTURE_PROMPT));
    expect(section.value.html).not.toContain('Another prompt');
    expect(FIXTURE_PROFILE).toContain('claude-code');
  });

  it('refuses a prompt its records name that no commit holds', async () => {
    const { root } = configuredRepo(
      ['speckit-configured', 'speckit-docs-configured'],
      ['S1@1.1'],
      [
        {
          scenario: 'S1@1.1',
          arm: 'speckit-configured',
          files: FILES,
          record: { prompt_sha256: 'a'.repeat(64) },
        },
      ],
    );
    const ran = [{ scenario: 'S1', version: '1.1', arm: 'speckit-configured' }];

    const section = await configuringSection(root, ran, history);

    expect(section.ok ? [] : section.issues).toEqual([
      {
        path: 'configuring/prompt.md',
        message: `S1@1.1's speckit-configured record names sha256:${'a'.repeat(64)}, and no commit of the repository holds it`,
      },
    ]);
  });

  it('is empty for an execution that ran no configured arm', async () => {
    const { root } = repo();

    const section = await configuringSection(
      root,
      [{ scenario: 'S1', version: '1.1', arm: 'baseline' }],
      history,
    );

    expect(section.ok ? section.value : section.issues).toEqual({ html: '', material: new Map() });
  });
});

describe("the configuring block's details (task-146, review round 1)", () => {
  const ran = [{ scenario: 'S1', version: '1.1', arm: 'speckit-configured' }];
  const PROFILE = [
    'agent: { name: claude-code, version: 2.1.300, effort: { claude-sonnet-5-5: medium } }',
    'models: { default: claude-sonnet-5-5 }',
    'caps: { step_time_s: 1800, step_tokens: 10000000, run_cost_eur: 5 }',
    '',
  ].join('\n');
  const PROMPT = '# Configure\n\nWrite <rules> & keep "quotes".\n';

  it("states the profile's model, effort and caps, and escapes the prompt", async () => {
    const { root } = configuredRepo(
      ['speckit-configured', 'speckit-docs-configured'],
      ['S1@1.1'],
      [
        {
          scenario: 'S1@1.1',
          arm: 'speckit-configured',
          files: FILES,
          record: { profile_sha256: sha256(PROFILE), prompt_sha256: sha256(PROMPT) },
        },
      ],
    );
    writeFileSync(join(root, 'configuring', 'profile.yaml'), PROFILE);
    writeFileSync(join(root, 'configuring', 'prompt.md'), PROMPT);

    const section = await configuringSection(root, ran, history);

    if (!section.ok) throw new Error(JSON.stringify(section.issues));
    const { html } = section.value;
    expect(html).toContain('<th scope="row">Agent</th><td>claude-code 2.1.300</td>');
    expect(html).toContain('<th scope="row">Model</th><td>claude-sonnet-5-5</td>');
    expect(html).toContain('<th scope="row">Effort</th><td>medium</td>');
    expect(html).toContain('<th scope="row">Caps</th><td>1800 s, 10000000 tokens, 5 EUR</td>');
    expect(html).toContain(escapeHtml(PROMPT));
    expect(html).not.toContain('<rules>');
  });

  it('reads the profile its records name from the history when the working tree holds another', async () => {
    const { root } = repo();
    writeFileSync(join(root, 'configuring', 'profile.yaml'), 'agent: { name: another-agent }\n');

    const section = await configuringSection(root, ran, history);

    if (!section.ok) throw new Error(JSON.stringify(section.issues));
    expect(section.value.html).toContain(`sha256:${PROFILE_SHA}`);
    expect(section.value.html).toContain('<td>claude-code</td>');
    expect(section.value.html).not.toContain('another-agent');
  });

  it("names each configuration's prompt when the records name more than one", async () => {
    const { root } = configuredRepo(
      ['speckit-configured', 'openspec-configured'],
      ['S1@1.1'],
      [
        { scenario: 'S1@1.1', arm: 'speckit-configured', files: FILES },
        {
          scenario: 'S1@1.1',
          arm: 'openspec-configured',
          files: { 'openspec/config.yaml': 'schema: spec-driven\ncontext: |\n  The project.\n' },
          record: { prompt_sha256: sha256(PROMPT) },
        },
      ],
    );
    writeFileSync(join(root, 'configuring', 'prompt.md'), PROMPT);

    const section = await configuringSection(
      root,
      [...ran, { scenario: 'S1', version: '1.1', arm: 'openspec-configured' }],
      history,
    );

    if (!section.ok) throw new Error(JSON.stringify(section.issues));
    const { html } = section.value;
    expect(html).toContain('more than one profile or prompt');
    expect(html).not.toContain('the same for every harness');
    expect(html).toContain(escapeHtml(FIXTURE_PROMPT));
    expect(html).toContain(escapeHtml(PROMPT));
    expect(html).toContain(`prompt sha256:${PROMPT_SHA}`);
    expect(html).toContain(`prompt sha256:${sha256(PROMPT)}`);
  });

  it('reads the arms as their runs recorded them, as the setup pages do, not as the working tree holds them', async () => {
    const { root } = repo();
    const tree = loadArm(join(root, 'arms'), 'speckit-configured');
    if (!tree.ok) throw new Error(JSON.stringify(tree.issues));
    const asRan = new Map([
      [
        'speckit-configured',
        { ...tree.value, configuration: [{ glob: '.specify/as-ran/**', source: 'the place as it ran' }] },
      ],
    ]);

    const section = await configuringSection(root, ran, history, asRan);

    if (!section.ok) throw new Error(JSON.stringify(section.issues));
    expect(section.value.html).toContain('<code>.specify/as-ran/**</code>: the place as it ran');
    expect(section.value.html).not.toContain('.specify/presets/**');
  });

  it('lists a constitution speckit-docs cannot read as not rendered: one with no principle heading', async () => {
    const { root } = configuredRepo(
      ['speckit-configured', 'speckit-docs-configured'],
      ['S1@1.1'],
      [
        {
          scenario: 'S1@1.1',
          arm: 'speckit-configured',
          files: { [CONSTITUTION]: '# Constitution\n\nBe small.\n' },
        },
      ],
    );

    const section = await configuringSection(root, ran, history);

    if (!section.ok) throw new Error(JSON.stringify(section.issues));
    expect(section.value.html).toContain(
      `Not rendered by its docs control</th><td><code>${CONSTITUTION}</code></td>`,
    );
  });

  it('lists a file under a place the docs generator keeps but never reads as not rendered', async () => {
    const schema = 'openspec/schemas/orders/schema.yaml';
    const { root } = configuredRepo(
      ['openspec-configured', 'openspec-docs-configured'],
      ['S1@1.1'],
      [
        {
          scenario: 'S1@1.1',
          arm: 'openspec-configured',
          files: {
            'openspec/config.yaml': 'schema: spec-driven\ncontext: |\n  The project.\n',
            [schema]: 'name: orders\n',
          },
        },
      ],
    );

    const section = await configuringSection(
      root,
      [{ scenario: 'S1', version: '1.1', arm: 'openspec-configured' }],
      history,
    );

    if (!section.ok) throw new Error(JSON.stringify(section.issues));
    expect(section.value.html).toContain(
      `Not rendered by its docs control</th><td><code>${schema}</code></td>`,
    );
  });

  it("omits the agent's header when the version holds none of the configurations that ran", async () => {
    const { root } = configuredRepo(['speckit-configured'], ['S1@1.1']);
    commitAll(root);

    const section = await configuringSection(root, ran, history);

    if (!section.ok) throw new Error(JSON.stringify(section.issues));
    expect(section.value.html).not.toContain('The configuring agent');
    expect(section.value.html).toContain('S1@1.1 holds no configuration of speckit-configured.');
    expect(FIXTURE_PROFILE).toContain('claude-code');
  });
});

describe("the configuring block's unrendered files, as the docs control composes them (task-146, review round 2)", () => {
  const RULE = '.wingfoil/directives/custom/r9.md';
  const ROLES = '.wingfoil/roles.yaml';
  const wingfoil = (files: Readonly<Record<string, string>>) =>
    configuredRepo(
      ['wingfoil-configured', 'baseline-docs-configured'],
      ['S1@1.1'],
      [{ scenario: 'S1@1.1', arm: 'wingfoil-configured', files }],
    ).root;
  const ran = [{ scenario: 'S1', version: '1.1', arm: 'wingfoil-configured' }];
  const unrendered = (html: string) =>
    /Not rendered by its docs control<\/th><td>(.*?)<\/td>/.exec(html)?.[1];

  it("renders a configuration over the scenario's own configuration: an edited directive the base's roles load", async () => {
    // The fixture's base configuration assigns r1 to developer; the configuration edits r1 only
    const root = wingfoil({
      '.wingfoil/directives/custom/r1.md': '# Rule r1\n\nKeep functions under ten lines.\n',
    });

    const section = await configuringSection(root, ran, history);

    if (!section.ok) throw new Error(JSON.stringify(section.issues));
    expect(unrendered(section.value.html)).toBe('none');
  });

  it("renders with the docs control's options: every role's directives for baseline-docs-configured", async () => {
    const files = {
      [RULE]: '# Rule r9\n\nReview every public name.\n',
      [ROLES]: 'assignments:\n  developer:\n    - r1\n  reviewer:\n    - r9\n',
    };
    const root = wingfoil(files);

    // The repository's baseline-docs-configured renders every role's: r9 is rendered
    const tree = await configuringSection(root, ran, history);
    if (!tree.ok) throw new Error(JSON.stringify(tree.issues));
    expect(unrendered(tree.value.html)).toBe('none');

    // As its runs recorded it, a control rendering the developer's only: r9 is not, and neither is the roles file, whose
    // developer assignment is the base's
    const control = loadArm(join(root, 'arms'), 'baseline-docs-configured');
    if (!control.ok) throw new Error(JSON.stringify(control.issues));
    const { docsDirectives: _everyRole, ...developerOnly } = control.value;
    const asRan = await configuringSection(
      root,
      ran,
      history,
      new Map([['baseline-docs-configured', developerOnly]]),
    );
    if (!asRan.ok) throw new Error(JSON.stringify(asRan.issues));
    expect(unrendered(asRan.value.html)).toBe(`<code>${RULE}</code>, <code>${ROLES}</code>`);
  });

  it("refuses a configuration its docs control's generator cannot render, naming it", async () => {
    const root = wingfoil({ '.wingfoil/dna.yaml': 'project: [unclosed\n' });

    const section = await configuringSection(root, ran, history);

    expect(section.ok ? [] : section.issues).toEqual([
      {
        path: 'scenarios/S1/1.1/arms/wingfoil-configured',
        message: expect.stringMatching(/^its docs control's generator cannot render it: /),
      },
    ]);
  });
});
