import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parse } from 'yaml';

import { fail, ok } from '../core/index.js';
import type { Arm, HistoryPort, Issue, Result } from '../core/index.js';

import { docsGeneratorOf, loadArm } from '../arms/index.js';
import { CONFIGURING_PROFILE, CONFIGURING_PROMPT, loadScenario } from '../scenario/index.js';

import { recordedFile } from './recorded.js';
import { escapeHtml, materialPage } from './render.js';

/**
 * The method page's block on the configured variants (REQ-RES-02 as amended in 1.50, T12, F7.5, task-146): the
 * configuring agent, as `configuring/profile.yaml` states it, and its prompt quoted in full with its SHA-256, both read
 * as the configurations' records name them; then, for each configuration of the scenario versions the execution ran,
 * its files, its session's patch against the workspace after the base arm's setup (the tool's defaults), its sessions'
 * cost, the files its docs control does not read, and the harness arm's configuration places with their sources.
 */

/** A run of the execution, as the block reads it: its scenario version and arm. */
export interface RanArm {
  readonly scenario: string;
  readonly version: string;
  readonly arm: string;
}

/** The block's HTML, empty when no configured arm ran, and the material pages it links: one patch per configuration. */
export interface ConfiguringSection {
  readonly html: string;
  readonly material: ReadonlyMap<string, string>;
}

const e = escapeHtml;

function row(label: string, value: string): string {
  return `<tr><th scope="row">${e(label)}</th><td>${value}</td></tr>\n`;
}

/** The configured arm whose configuration `arm` reads: itself, or the one a configured docs control is generated from. */
function configurationArm(arm: Arm): string | undefined {
  if (arm.configuredOf !== undefined) return arm.name;
  return arm.docsOf?.endsWith('-configured') === true ? arm.docsOf : undefined;
}

/** The profile's statement of the agent, its model and its caps; what it does not state is said. */
function profileRows(text: string): string {
  const profile = (parse(text) ?? {}) as {
    agent?: { name?: string; version?: string };
    models?: { default?: string };
    caps?: { step_time_s?: number; step_tokens?: number; run_cost_eur?: number };
  };
  const stated = (value: string | number | undefined, unit = '') =>
    value === undefined ? 'not stated' : `${e(String(value))}${unit}`;
  const agent = profile.agent;
  const caps = profile.caps;
  return (
    row(
      'Agent',
      agent?.name === undefined ? 'not stated' : e([agent.name, agent.version].filter(Boolean).join(' ')),
    ) +
    row('Model', stated(profile.models?.default)) +
    row(
      'Caps',
      caps === undefined
        ? 'not stated'
        : `${stated(caps.step_time_s, ' s')}, ${stated(caps.step_tokens, ' tokens')}, ${stated(caps.run_cost_eur, ' EUR')}`,
    )
  );
}

/**
 * The block for the runs `ran`, from the repository at `root`: empty when none ran a configured arm or its docs
 * control. A version holding no configuration of a configured arm that ran is said. Refused: a configured arm the
 * working tree does not hold, and a prompt or profile a record names that neither the working tree nor any commit
 * holds.
 */
export async function configuringSection(
  root: string,
  ran: readonly RanArm[],
  history: HistoryPort,
): Promise<Result<ConfiguringSection>> {
  const issues: Issue[] = [];
  // Each configuration once, by its version and configured arm, in a stable order
  const wanted = new Map<string, { id: string; version: string; configured: string }>();
  // Each arm read once: an execution has many runs of few arms
  const reads = new Map<string, string | undefined>();
  for (const run of ran) {
    // Only a configured arm or a configured docs control reads a configuration: any other arm is not read, so an arm
    // the working tree no longer holds is no refusal here (its setup page reads it from the history).
    if (!run.arm.endsWith('-configured')) continue;
    if (!reads.has(run.arm)) {
      const arm = loadArm(join(root, 'arms'), run.arm);
      if (!arm.ok) return arm;
      reads.set(run.arm, configurationArm(arm.value));
    }
    const configured = reads.get(run.arm);
    if (configured === undefined) continue;
    wanted.set(`${run.scenario}@${run.version} ${configured}`, {
      id: run.scenario,
      version: run.version,
      configured,
    });
  }
  if (wanted.size === 0) return ok({ html: '', material: new Map() });

  const material = new Map<string, string>();
  const prompts = new Map<string, string>();
  const profiles = new Map<string, string>();
  const configurations: string[] = [];
  for (const [key, { id, version, configured }] of [...wanted].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const ref = `${id}@${version}`;
    const scenario = loadScenario(join(root, 'scenarios'), id, version);
    if (!scenario.ok) return scenario;
    const configuration = scenario.value.configurations[configured];
    if (configuration === undefined) {
      // A campaign refuses it (REQ-FMT-04 as amended in 1.50); the page says it rather than hide the run.
      configurations.push(
        `<h3 id="${e(`configuration-${key.replace(/[ @.]/g, '-')}`)}">${e(`${ref}, ${configured}`)}</h3>\n` +
          `<p>${e(ref)} holds no configuration of ${e(configured)}.</p>`,
      );
      continue;
    }
    const { record, records } = configuration;
    for (const [path, digest, into] of [
      [CONFIGURING_PROMPT, record.prompt_sha256, prompts],
      [CONFIGURING_PROFILE, record.profile_sha256, profiles],
    ] as const) {
      if (into.has(digest)) continue;
      const text = await recordedFile(root, path, digest, history);
      if (text === undefined) {
        issues.push({
          path,
          message: `${ref}'s ${configured} record names sha256:${digest}, and no commit of the repository holds it`,
        });
      } else into.set(digest, text);
    }

    const harness = loadArm(join(root, 'arms'), configured);
    if (!harness.ok) return harness;
    const docs = docsGeneratorOf(harness.value.requires);
    const kept = docs?.kept ?? [];
    const files = record.files ?? [];
    const unread = files
      .map((file) => file.path)
      .filter((path) => !kept.some((dir) => path === dir || path.startsWith(`${dir}/`)));
    const cost = records.reduce((sum, entry) => sum + entry.cost_eur, 0);
    const page = `configuration-${ref}-${configured}.html`;
    const patch = readFileSync(configuration.patchPath, 'utf8');
    material.set(
      page,
      materialPage(`The configuration of ${configured} on ${ref}`, `<pre><code>${e(patch)}</code></pre>`),
    );
    const places = harness.value.configuration ?? [];
    configurations.push(
      `<h3 id="${e(`configuration-${key.replace(/[ @.]/g, '-')}`)}">${e(`${ref}, ${configured}`)}</h3>\n<table>\n<tbody>\n` +
        row(
          'Files',
          files.map((file) => `<code>${e(file.path)}</code> sha256:${e(file.sha256)}`).join('<br>') || 'none',
        ) +
        row(
          'Session patch',
          `<a href="material/${e(page)}">the patch against the workspace after the ${e(harness.value.configuredOf ?? configured)} arm's setup</a>`,
        ) +
        row(
          'Sessions',
          `${records.length} session${records.length === 1 ? '' : 's'}, ${cost.toFixed(4)} EUR (M-K3's one-off part)`,
        ) +
        row(
          'Not rendered by its docs control',
          docs === undefined
            ? 'its harness has no docs generator'
            : unread.map((path) => `<code>${e(path)}</code>`).join(', ') || 'none',
        ) +
        row(
          'Configuration places',
          places.map((place) => `<code>${e(place.glob)}</code>: ${e(place.source)}`).join('<br>') ||
            'none declared',
        ) +
        '</tbody>\n</table>',
    );
  }
  if (issues.length > 0) return fail(issues);

  const agent = [...profiles]
    .map(
      ([digest, text]) =>
        `<table>\n<tbody>\n${row('Profile', `<code>${CONFIGURING_PROFILE}</code> sha256:${e(digest)}`)}${profileRows(text)}</tbody>\n</table>`,
    )
    .join('\n');
  const prompt = [...prompts]
    .map(
      ([digest, text]) =>
        `<p>The prompt, <code>${CONFIGURING_PROMPT}</code> sha256:${e(digest)}, the same for every harness:</p>\n` +
        `<pre><code>${e(text)}</code></pre>`,
    )
    .join('\n');
  return ok({
    html:
      `<p>The configuring agent of this execution's configurations:</p>\n${agent}\n${prompt}\n` +
      configurations.join('\n'),
    material,
  });
}
