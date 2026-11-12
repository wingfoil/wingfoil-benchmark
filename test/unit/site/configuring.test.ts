// task-146 — the method page's block on the configuring agent and each configuration (REQ-RES-02 as amended in 1.50,
// T12, F7.5): read from the scenario versions' records and patches, the prompt and profile as the records name them.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { historyCli, systemProcess } from '../../../src/core/index.js';
import { configuringSection } from '../../../src/site/configuring.js';
import { escapeHtml } from '../../../src/site/render.js';
import {
  configuredRepo,
  FIXTURE_PROFILE,
  FIXTURE_PROMPT,
  PROMPT_SHA,
} from '../../support/configured-arm-fixture.js';

const history = historyCli(systemProcess);
const CONSTITUTION = '.specify/memory/constitution.md';
const COMMAND = '.specify/templates/overrides/plan-template.md';
const FILES = { [CONSTITUTION]: '# Constitution\n\nKeep every function small.\n', [COMMAND]: '# Review\n' };

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
      expect(html).toContain(createHashOf(content));
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
      ['speckit-configured'],
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

function createHashOf(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}
