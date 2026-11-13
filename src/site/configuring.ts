import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { parse } from 'yaml';

import { fail, ok, reasonOf } from '../core/index.js';
import type { Arm, HistoryPort, Issue, Result } from '../core/index.js';

import { docsGeneratorOf, loadArm } from '../arms/index.js';
import type { RenderOptions } from '../arms/index.js';
import { CONFIGURING_PROFILE, CONFIGURING_PROMPT, loadScenario, relativeFiles } from '../scenario/index.js';

import { recordedFile } from './recorded.js';
import { escapeHtml, materialPage } from './render.js';

/**
 * The method page's block on the configured variants (REQ-RES-02 as amended in 1.50, T12, F7.5, task-146): the
 * configuring agent, as `configuring/profile.yaml` states it, and its prompt quoted in full with its SHA-256, both read
 * as the configurations' records name them; then, for each configuration of the scenario versions the execution ran,
 * its files, its session's patch against the workspace after the base arm's setup (the tool's defaults), its sessions'
 * cost, the files its docs control does not render, and the harness arm's configuration places with their sources.
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

function optionsOf(control: Arm): RenderOptions {
  return control.docsDirectives === 'every-role' ? { everyRole: true } : {};
}

/**
 * The configuration's files its docs control does not render (REQ-RUN-11 as amended in 1.50): those whose removal
 * leaves the generator's output unchanged. The output is rendered as the docs control's step composes it, over what the
 * scenario's own configuration for the harness arm puts in the generator's places (`base`), with the control's options;
 * removing a file leaves the base's version of it. A file under a place the generator keeps but never reads (an
 * OpenSpec schema, a directive no role loads) is one. What the tool's init writes is not known here: a file that acts
 * only together with an init default can be misjudged, which the page says.
 */
function notRendered(
  dir: string,
  files: readonly { readonly path: string }[],
  base: ReadonlyMap<string, string>,
  render: (files: ReadonlyMap<string, string>, options?: RenderOptions) => string,
  options: RenderOptions,
): string[] {
  const own = new Map(files.map((file) => [file.path, readFileSync(join(dir, file.path), 'utf8')]));
  const whole = render(new Map([...base, ...own]), options);
  return files
    .map((file) => file.path)
    .filter((path) => {
      const without = new Map([...base, ...[...own].filter(([other]) => other !== path)]);
      return render(without, options) === whole;
    });
}

/** The scenario's own configuration for harness arm `arm` under the generator's `kept` places, by workspace path. */
function baseFiles(
  armDirs: Readonly<Record<string, string>>,
  arm: string,
  kept: readonly string[],
): Map<string, string> {
  const dir = armDirs[arm];
  if (dir === undefined || !existsSync(dir)) return new Map();
  return new Map(
    relativeFiles(dir)
      .filter((path) => kept.some((place) => path === place || path.startsWith(`${place}/`)))
      .map((path) => [path, readFileSync(join(dir, path), 'utf8')]),
  );
}

/** The configured arm whose configuration `arm` reads: itself, or the one a configured docs control is generated from. */
function configurationArm(arm: Arm): string | undefined {
  if (arm.configuredOf !== undefined) return arm.name;
  return arm.docsOf?.endsWith('-configured') === true ? arm.docsOf : undefined;
}

/** The profile's statement of the agent, its model and its caps; what it does not state is said. */
function profileRows(text: string): string {
  const profile = (parse(text) ?? {}) as {
    agent?: { name?: string; version?: string; effort?: Record<string, string> };
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
      'Effort',
      stated(profile.models?.default === undefined ? undefined : agent?.effort?.[profile.models.default]),
    ) +
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
 * control; `asRan` holds the execution's arms as their runs recorded them (the setup pages'). A version holding no
 * configuration of a configured arm that ran is said. Refused: a configured arm neither `asRan` nor the working tree
 * holds, and a prompt or profile a record names that neither the working tree nor any commit holds.
 */
export async function configuringSection(
  root: string,
  ran: readonly RanArm[],
  history: HistoryPort,
  asRan: ReadonlyMap<string, Arm> = new Map(),
): Promise<Result<ConfiguringSection>> {
  const issues: Issue[] = [];
  // An arm as its runs recorded it (the setup pages' reading, from the history when the tree differs), else the tree's
  const armOf = (name: string): Result<Arm> => {
    const found = asRan.get(name);
    return found === undefined ? loadArm(join(root, 'arms'), name) : ok(found);
  };
  // Each configuration once, by its version and configured arm, in a stable order
  const wanted = new Map<string, { id: string; version: string; configured: string }>();
  // Each arm read once: an execution has many runs of few arms
  const reads = new Map<string, string | undefined>();
  for (const run of ran) {
    // Only a configured arm or a configured docs control reads a configuration: any other arm is not read, so an arm
    // the working tree no longer holds is no refusal here (its setup page reads it from the history).
    if (!run.arm.endsWith('-configured')) continue;
    if (!reads.has(run.arm)) {
      const arm = armOf(run.arm);
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

    const harness = armOf(configured);
    if (!harness.ok) return harness;
    const docs = docsGeneratorOf(harness.value.requires);
    const files = record.files ?? [];
    const control = docsControlOf(configured);
    let unrendered: string[] | undefined;
    if (docs !== undefined && control !== undefined) {
      try {
        const base = baseFiles(scenario.value.armDirs, harness.value.configuredOf ?? configured, docs.kept);
        unrendered = notRendered(configuration.dir, files, base, docs.render, control);
      } catch (error) {
        issues.push({
          path: `scenarios/${id}/${version}/arms/${configured}`,
          message: `its docs control's generator cannot render it: ${reasonOf(error)}`,
        });
        continue;
      }
    }
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
          'Configuring agent',
          `profile sha256:${e(record.profile_sha256)}, prompt sha256:${e(record.prompt_sha256)}`,
        ) +
        row(
          'Sessions',
          `${records.length} session${records.length === 1 ? '' : 's'}, ${cost.toFixed(4)} EUR (M-K3's one-off part)`,
        ) +
        row(
          'Not rendered by its docs control',
          docs === undefined
            ? 'its harness has no docs generator'
            : control === undefined
              ? 'no docs control of it in the repository'
              : unrendered === undefined
                ? 'not computed'
                : unrendered.map((path) => `<code>${e(path)}</code>`).join(', ') || 'none',
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
        `<p>The prompt, <code>${CONFIGURING_PROMPT}</code> sha256:${e(digest)}` +
        `${prompts.size === 1 ? ', the same for every harness' : ''}:</p>\n` +
        `<pre><code>${e(text)}</code></pre>`,
    )
    .join('\n');
  const several =
    prompts.size > 1 || profiles.size > 1
      ? "<p>The configurations' records name more than one profile or prompt: each configuration names its own.</p>\n"
      : '';
  const head =
    profiles.size === 0 && prompts.size === 0
      ? ''
      : `<p>The configuring agent of this execution's configurations:</p>\n${several}${agent}\n${prompt}\n`;
  return ok({ html: head + configurations.join('\n'), material });

  /** The docs control generated from `configured` (its `docs_of`), as it ran when it did: its render options. */
  function docsControlOf(configured: string): RenderOptions | undefined {
    const ranControl = [...asRan.values()].find((arm) => arm.docsOf === configured);
    if (ranControl !== undefined) return optionsOf(ranControl);
    for (const name of readdirSync(join(root, 'arms')).sort()) {
      const arm = loadArm(join(root, 'arms'), name);
      if (arm.ok && arm.value.docsOf === configured) return optionsOf(arm.value);
    }
    return undefined;
  }
}
