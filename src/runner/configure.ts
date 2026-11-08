import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

import { agentProfile, scrub } from '../agents/index.js';
import type { SessionUsage } from '../agents/index.js';
import { armDigest, loadArm, RULES_SOURCE_ARM, seedClashes } from '../arms/index.js';
import { canonicalJson, configuredRecordSchema, fail, harnessCoverage, ok, reasonOf } from '../core/index.js';
import type { Arm, ConfiguredRecord, ConfiguringProfile, Issue, Result, Scenario } from '../core/index.js';
import { runsOfVersion } from '../results/index.js';
import {
  CONFIGURED_DIR,
  CONFIGURED_SUFFIX,
  CONFIGURING_PROFILE,
  CONFIGURING_PROMPT,
  loadConfiguringProfile,
  loadLeakScanDeclarations,
  loadScenario,
  prepareWorkspace,
  relativeFiles,
  scanConfiguringPrompt,
} from '../scenario/index.js';
import type { HoldoutAdditions } from '../scenario/index.js';

import { identityOf, offencesOf, refusalReason } from './configured-result.js';
import { prepareHarnesses } from './harness.js';
import { agentIdentityFor } from './identity.js';
import {
  buildRunImage,
  CAP_REACHED,
  containerPrefix,
  executeSetup,
  executeStep,
  openContainer,
  remove,
  secretsNow,
  setupFailure,
} from './run.js';
import type { RunnerOptions } from './run.js';

/** What `bench scenario configure` names on its command line (REQ-CLI-14). */
export interface ConfigureRequest {
  readonly id: string;
  readonly version: string;
  /** The harness arm whose configuration is written. */
  readonly arm: string;
  /** Whether a configuration the version holds is replaced, if the new session writes one. */
  readonly replace: boolean;
}

/** A configuring session ready to run: what it pins and where it writes (REQ-RUN-20). */
export interface CheckedConfigure {
  /** The session's identity: its image's tag and its container's stem. */
  readonly id: string;
  readonly repoRoot: string;
  readonly profile: ConfiguringProfile;
  readonly profileSha256: string;
  readonly promptPath: string;
  readonly promptSha256: string;
  readonly scenario: Scenario;
  readonly arm: Arm;
  /** The harness arm's digest, as a campaign pins it: 12 hex. */
  readonly baseArmDigest: string;
  readonly model: string;
  /** The record's number among the version's records for the arm, from 1: its transcript's `<n>`. */
  readonly index: number;
  /** Where the session's workspace and its setup's output go, git-ignored: `runs/configuring/<id>@<version>/…/<n>`. */
  readonly workDir: string;
}

/** The configured arm's name for harness arm `arm` (REQ-FMT-05 as amended in 1.50). */
export function configuredName(arm: string): string {
  return `${arm}${CONFIGURED_SUFFIX}`;
}

/**
 * Check a configuring session before anything is built (REQ-RUN-20, REQ-CLI-14), each refusal naming what it refuses:
 * a version 1.0 (the approver's choice); the profile `configuring/profile.yaml`; the scenario version; any run of the
 * version under `results/`, a dry run's included (REQ-FMT-04 as amended in 1.50); the arm, which must be a harness arm
 * with configuration places and whose harness the profile pins; a configuration the version holds, unless replaced;
 * a configuration glob that matches a seed file (REQ-FMT-05 as amended in 1.50); the prompt's scan (REQ-FMT-08 as
 * amended in 1.50), with the hold-out's additions when one is set; and a workspace an earlier session left with no
 * record.
 */
export function checkConfigure(
  request: ConfigureRequest,
  root: string,
  holdout?: HoldoutAdditions,
  clock?: () => number,
): Result<CheckedConfigure> {
  const ref = `${request.id}@${request.version}`;
  if (request.version === '1.0') {
    return fail([
      {
        path: 'scenario',
        message: `${ref}: a version 1.0 is never configured (the approver's choice of 2026-11-06)`,
      },
    ]);
  }
  const profileFile = join(root, CONFIGURING_PROFILE);
  const profile = loadConfiguringProfile(profileFile);
  if (!profile.ok) return profile;

  const scenario = loadScenario(join(root, 'scenarios'), request.id, request.version);
  if (!scenario.ok) return scenario;
  const [run] = runsOfVersion(join(root, 'results'), request.id, request.version);
  if (run !== undefined) {
    return fail([
      {
        path: 'scenario',
        message:
          `${ref} has a run, ${relative(root, run)}: nothing is written to its configurations once a run is of it; ` +
          'configure a new version',
      },
    ]);
  }

  const loaded = loadArm(join(root, 'arms'), request.arm);
  if (!loaded.ok) {
    const why = loaded.issues.map((issue) => `${issue.path} ${issue.message}`).join('; ');
    return fail([{ path: '--arm', message: `${request.arm}: ${why}` }]);
  }
  const arm = loaded.value;
  // A configured arm runs a configuration; its harness arm is the one configured (REQ-CLI-14, task-142).
  if (arm.configuredOf !== undefined) {
    return fail([
      {
        path: '--arm',
        message: `${arm.name} is a configured arm: configure its harness arm, ${arm.configuredOf}`,
      },
    ]);
  }
  if (arm.requires === undefined) {
    return fail([
      {
        path: '--arm',
        message: `${arm.name} is not a harness arm: it requires no harness, and has nothing to configure`,
      },
    ]);
  }
  if (arm.configuration === undefined) {
    return fail([
      {
        path: '--arm',
        message: `${arm.name} declares no configuration places (REQ-FMT-05 as amended in 1.50)`,
      },
    ]);
  }
  const uncovered = harnessCoverage(profile.value, [arm]);
  if (uncovered.length > 0) return fail(uncovered);
  const configured = configuredName(arm.name);
  if (scenario.value.configurations[configured] !== undefined && !request.replace) {
    return fail([
      {
        path: 'scenario',
        message: `${ref} already holds a configuration for ${configured}: pass --replace to replace it`,
      },
    ]);
  }
  const clashes = seedClashes(arm, relativeFiles(scenario.value.seedDir));
  if (clashes.length > 0) {
    return fail(
      clashes.map(({ glob, file }) => ({
        path: `arms.${arm.name}.configuration`,
        message: `'${glob}' matches the seed file '${file}' of ${ref}`,
      })),
    );
  }

  const declarations = loadLeakScanDeclarations(join(root, 'scenarios', 'leak-scan.yaml'));
  if (!declarations.ok) return declarations;
  const promptPath = join(root, CONFIGURING_PROMPT);
  if (!existsSync(promptPath)) return fail([{ path: CONFIGURING_PROMPT, message: 'is missing' }]);
  const prompt = readFileSync(promptPath);
  const leaks = scanConfiguringPrompt(prompt.toString('utf8'), scenario.value, declarations.value, holdout);
  if (leaks.length > 0) return fail(leaks);

  // The version loaded, so its records parse and are in order; the next one is appended after the newest.
  const records = Object.hasOwn(scenario.value.configurations, configured)
    ? (scenario.value.configurations[configured]?.records ?? [])
    : readRecords(join(scenario.value.dir, CONFIGURED_DIR, `${configured}.json`));
  const newest = records.at(-1)?.date;
  if (newest !== undefined && Date.parse(newest) > (clock ?? Date.now)()) {
    return fail([
      {
        path: 'configure',
        message: `the newest record of ${configured} is dated ${newest}, after this machine's clock: check the clock`,
      },
    ]);
  }
  const index = records.length + 1;
  const workDir = join(root, 'runs', 'configuring', ref, arm.name, String(index));
  if (existsSync(workDir)) {
    return fail([
      {
        path: 'configure',
        message:
          `${relative(root, workDir)} exists: a session of this configuration is running, or an earlier one ` +
          'wrote no record; remove it once none runs',
      },
    ]);
  }

  const baseArmDigest = armDigest(root, arm.name).slice(0, 12);
  const profileSha256 = sha256(readFileSync(profileFile));
  const id = `configure-${sha256(
    canonicalJson({
      profile: profile.value,
      scenario: request.id,
      version: request.version,
      arm: arm.name,
      baseArmDigest,
    }),
  ).slice(0, 12)}`;
  return ok({
    id,
    repoRoot: root,
    profile: profile.value,
    profileSha256,
    promptPath,
    promptSha256: sha256(prompt),
    scenario: scenario.value,
    arm,
    baseArmDigest,
    model: profile.value.models.default,
    index,
    workDir,
  });
}

/** What a configuring session ended with, and where its record and its transcript are. */
export interface ConfigureSummary {
  readonly record: ConfiguredRecord;
  /** `configured/<harness>-configured.json` of the scenario version. */
  readonly recordFile: string;
  readonly index: number;
  /** `arms/<harness>-configured/` of the scenario version, written on `written` only. */
  readonly configurationDir: string;
  /** The session's transcript, scrubbed. */
  readonly transcript: string;
  /** What loading the version found once the configuration was written: nothing, unless something is wrong. */
  readonly loadIssues: readonly Issue[];
}

/** A session's usage before any is reported. */
const NO_USAGE: SessionUsage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheCreationInputTokens: 0,
  cacheReadInputTokens: 0,
  costUsd: 0,
  costEur: 0,
  turns: 0,
  durationMs: 0,
};

/** How a configuring session ended, before its record is written. */
interface Ending {
  outcome: ConfiguredRecord['outcome'];
  reason?: string;
  usage: SessionUsage;
  /** The most the session can have cost, in USD, when its agent reported no cost (REQ-RUN-09 as amended in 1.49). */
  costBoundUsd?: number;
  rulesSha256: string | null;
  harnessCommit?: string;
  wallTimeMs: number;
  transcript?: readonly string[];
  /** The written files' paths, with their content and whether git records them executable, on `written`. */
  files?: { path: string; content: Buffer; executable: boolean }[];
  patch?: string;
}

/**
 * Run a checked configuring session (REQ-RUN-20): the run image a campaign with the profile's agent builds, the
 * harness at the profile's pin, the workspace a run of the harness arm has before step 1, less the merged manual
 * (moved aside) and with no MCP server; one session through the step's path with `configuring/prompt.md` as its one
 * prompt; then the result's checks, the configuration's files and patch on `written`, and on every outcome the
 * record, appended, and the transcript, scrubbed.
 */
export async function runConfigure(
  checked: CheckedConfigure,
  options: RunnerOptions,
): Promise<ConfigureSummary> {
  const { scenario, arm, profile, repoRoot, workDir } = checked;
  const workspace = join(workDir, 'workspace');
  const outputDir = join(workDir, 'output');
  const manualFile = agentProfile(profile.agent.name).manualFile;
  const date = (options.date ?? (() => new Date()))().toISOString();
  const now = options.now ?? (() => performance.now());
  const rate = profile.currency.usd_to_eur;
  // The session's directory, claimed: another invocation of the same session gets EEXIST here and stops, so that
  // what this one removes on a failure before the session is only what it made.
  try {
    mkdirSync(dirname(workDir), { recursive: true });
    mkdirSync(workDir);
  } catch (error) {
    const why =
      (error as NodeJS.ErrnoException).code === 'EEXIST' && (error as NodeJS.ErrnoException).path === workDir
        ? 'a session of this configuration is running, or an earlier one wrote no record; remove it once none runs'
        : reasonOf(error);
    throw new Error(`${relative(repoRoot, workDir)} cannot be claimed: ${why}`, { cause: error });
  }
  options.log?.(`configure ${scenario.id}@${scenario.version} for ${arm.name}, session ${checked.index}`);
  const ending: Ending = { outcome: 'failed', usage: NO_USAGE, rulesSha256: null, wallTimeMs: 0 };
  let container: string | undefined;
  let removal: Promise<void> | undefined;
  const kill = () => {
    if (container !== undefined) removal ??= remove(container, options);
  };
  const interrupted = () => options.signal?.aborted === true;
  let started: number | undefined;
  /** What stopped the command before its session started: no session ran, so no record is written. */
  let before: unknown;
  /** Whether the session's step returned: after it, what fails is no longer the agent's, and its usage stands. */
  let returned = false;
  const manual = join(workspace, manualFile);
  const aside = join(workDir, 'manual-aside');
  /** The merged manual back at its path, whatever the agent left there (REQ-RUN-20); idempotent. */
  const restoreManual = () => {
    if (!existsSync(aside)) return;
    rmSync(manual, { recursive: true, force: true });
    renameSync(aside, manual);
  };
  try {
    await buildRunImage(checked.id, profile.agent, options);
    const harnesses = await prepareHarnesses(
      { id: checked.id, repoRoot, arms: [arm], harnesses: profile.harnesses },
      options,
    );
    const harness = harnesses.get(arm.requires as string);
    if (harness === undefined) throw new Error(`the ${arm.requires ?? ''} harness was not prepared`);
    ending.harnessCommit = harness.commit;
    const name = `${containerPrefix(checked.id)}${checked.index}`;
    const left = (await options.docker.containersNamed(name)).find((found) => found.name === name);
    if (left !== undefined) {
      throw new Error(`container ${name} already exists: remove it with: docker rm --force ${name}`);
    }
    if (interrupted()) throw new Error('interrupted before its container was created');

    await prepareWorkspace(workspace, scenario, options.git);
    const seedTree = await options.git.tree(workspace, 'HEAD');
    container = await openContainer(
      { image: checked.id, name, workspace, arm, agentName: profile.agent.name, mcp: false },
      options,
      (made) => {
        container = made;
        options.signal?.addEventListener('abort', kill, { once: true });
        if (interrupted()) kill();
      },
    );
    const setup = await executeSetup(
      arm,
      {
        container,
        workspace,
        outputDir,
        seedTree,
        harness: harness.installed,
        ...(scenario.armDirs[arm.name] === undefined ? {} : { scenarioDir: scenario.armDirs[arm.name] }),
        rulesSource: scenario.armDirs[RULES_SOURCE_ARM],
        manualFile,
        agent: agentIdentityFor(scenario),
      },
      options,
    );
    if (setup.code !== undefined) throw new Error(setupFailure(arm, setup.code, outputDir));
    ending.rulesSha256 = setup.generatedSha256 ?? null;
    const identityBefore = identityOf(arm.requires, workspace);

    // What instructs the agent is the prompt alone: the merged manual is moved aside for the session (REQ-RUN-20).
    renameSync(manual, aside);
    started = now();
    const step = await executeStep(
      { n: 1, promptPath: checked.promptPath },
      {
        container,
        workspace,
        outputDir,
        scenario,
        model: checked.model,
        arm,
        spent: 0,
        pins: profile,
        previousTree: setup.tree as string,
        previousCommit: setup.commit as string,
      },
      options,
    );
    returned = true;
    ending.wallTimeMs = now() - started;
    if (step === CAP_REACHED) {
      ending.outcome = 'killed';
      ending.reason = "nothing was left of the session's cost cap";
    } else {
      ending.usage = step.usage;
      ending.transcript = step.transcript;
      if (step.costBoundUsd !== undefined) ending.costBoundUsd = step.costBoundUsd;
      const ended = endingOf(step.outcome, step.error);
      ending.outcome = ended.outcome;
      if (ended.reason !== undefined) ending.reason = ended.reason;
    }

    if (ending.outcome === 'written' && ending.costBoundUsd !== undefined) {
      ending.outcome = 'failed';
      ending.reason = 'the agent reported no cost for the session: it counts at its bound';
    }
    if (ending.outcome === 'written') {
      // A file at the manual's path refuses the result; then the manual is restored, and the workspace compared.
      const manualWritten = existsSync(manual);
      restoreManual();
      await options.git.commitAll(workspace, 'configured', { allowEmpty: true });
      const tree = await options.git.tree(workspace, 'HEAD');
      const changes = await options.git.changesBetween(workspace, setup.commit as string, 'HEAD');
      const identityAfter = identityOf(arm.requires, workspace);
      const offences = offencesOf({
        arm,
        changes,
        manualFile,
        manualWritten,
        identityChanged:
          identityBefore !== undefined && identityAfter?.value !== identityBefore.value
            ? identityBefore.file
            : undefined,
        workspace,
        secrets: secretsNow(options),
      });
      if (offences.length > 0) {
        ending.outcome = 'refused';
        ending.reason = refusalReason(offences);
      } else if (changes.length === 0) {
        ending.outcome = 'refused';
        ending.reason = 'the session added or changed no configuration file';
      } else {
        ending.files = changes.map((change) => ({
          path: change.path,
          content: readFileSync(join(workspace, change.path)),
          executable: change.mode === '100755',
        }));
        ending.patch = scrub(
          await options.git.patchOf(workspace, setup.tree as string, tree),
          secretsNow(options),
        );
      }
    }
  } catch (error) {
    if (started === undefined) before = error;
    else if (ending.wallTimeMs === 0) ending.wallTimeMs = now() - started;
    ending.outcome = interrupted() ? 'interrupted' : 'failed';
    ending.reason = reasonOf(error);
    // A session whose step threw reported nothing: it counts at its bound, the session's ceiling. Once the step
    // returned, its reported usage stands, whatever fails after it.
    if (started !== undefined && !returned) ending.costBoundUsd = profile.caps.run_cost_eur / rate;
    options.logError?.(`configure ${scenario.id}@${scenario.version} for ${arm.name}: ${ending.reason}`);
  } finally {
    options.signal?.removeEventListener('abort', kill);
    if (container !== undefined) await (removal ?? remove(container, options));
    if (existsSync(workspace)) restoreManual();
  }
  if (started === undefined) {
    // No session ran: what this invocation made under runs/ goes, so that the next one is not refused for it.
    rmSync(workDir, { recursive: true, force: true });
    throw before;
  }
  return store(checked, ending, date, options);
}

/** A step's outcome as a configuring session's (REQ-RUN-20): `completed` is a result to check. */
function endingOf(
  outcome: string,
  error: string | undefined,
): { outcome: ConfiguredRecord['outcome']; reason?: string } {
  switch (outcome) {
    case 'completed':
      return { outcome: 'written' };
    case 'time cap reached':
    case 'token cap reached':
    case 'cap reached':
      return { outcome: 'killed', reason: outcome };
    case 'interrupted':
      return { outcome: 'interrupted', reason: 'interrupted by the maintainer' };
    default:
      return { outcome: 'failed', reason: error ?? outcome };
  }
}

/**
 * Write what a configuring session leaves (REQ-RUN-20): on `written`, its files at their workspace paths under
 * `arms/<harness>-configured/` (replacing an earlier configuration) and its patch; on every outcome its record,
 * appended to the records file; and its transcript, scrubbed, under `results/configuring/`. Then load the version.
 */
function store(
  checked: CheckedConfigure,
  ending: Ending,
  date: string,
  options: RunnerOptions,
): ConfigureSummary {
  const { scenario, arm, profile, repoRoot } = checked;
  const configured = configuredName(arm.name);
  const configurationDir = join(scenario.dir, 'arms', configured);
  const recordsDir = join(scenario.dir, CONFIGURED_DIR);
  const recordFile = join(recordsDir, `${configured}.json`);
  const rate = profile.currency.usd_to_eur;
  const pin = profile.harnesses[arm.name];
  const reported = ending.usage.costEur;
  const bound = (ending.costBoundUsd ?? 0) * rate;
  const atBound = ending.costBoundUsd !== undefined && bound > reported;
  const files = ending.files?.map((file) => ({ path: file.path, sha256: sha256(file.content) }));
  const record: ConfiguredRecord = {
    agent: { name: profile.agent.name, version: profile.agent.version },
    model: checked.model,
    prompt_sha256: checked.promptSha256,
    profile_sha256: checked.profileSha256,
    harness: {
      tool: arm.requires as string,
      version: pin?.version ?? '',
      commit: ending.harnessCommit as string,
    },
    base_arm_digest: checked.baseArmDigest,
    rules_sha256: ending.rulesSha256,
    usage: {
      inputTokens: ending.usage.inputTokens,
      outputTokens: ending.usage.outputTokens,
      cacheCreationInputTokens: ending.usage.cacheCreationInputTokens,
      cacheReadInputTokens: ending.usage.cacheReadInputTokens,
      costUsd: ending.usage.costUsd,
      costEur: ending.usage.costEur,
      turns: ending.usage.turns,
      durationMs: ending.usage.durationMs,
    },
    cost_eur: round(Math.max(reported, bound), 6),
    ...(atBound ? { cost_reported: false as const } : {}),
    wall_time_s: round(ending.wallTimeMs / 1000, 1),
    date,
    outcome: ending.outcome,
    // Scrubbed as a patch is: an error can quote what the agent's environment holds (REQ-NFR-01).
    ...(ending.reason === undefined ? {} : { reason: scrub(ending.reason, secretsNow(options)) }),
    ...(files === undefined || ending.outcome !== 'written' ? {} : { files }),
  };
  // The transcript first: whatever follows, what the session said is kept.
  const transcript = join(
    repoRoot,
    'results',
    'configuring',
    `${scenario.id}@${scenario.version}`,
    arm.name,
    String(checked.index),
    'transcript.jsonl',
  );
  mkdirSync(dirname(transcript), { recursive: true });
  const lines = (ending.transcript ?? []).map((line) => `${line}\n`).join('');
  writeFileSync(transcript, scrub(lines, secretsNow(options)));
  // A record this runner would refuse to load is a defect of the runner: said, never written.
  const valid = configuredRecordSchema.safeParse(record);
  if (!valid.success) throw new Error(`the configuring record is not valid: ${valid.error.message}`);

  if (ending.outcome === 'written' && ending.files !== undefined && ending.patch !== undefined) {
    rmSync(configurationDir, { recursive: true, force: true });
    for (const file of ending.files) {
      mkdirSync(dirname(join(configurationDir, file.path)), { recursive: true });
      writeFileSync(join(configurationDir, file.path), file.content, {
        mode: file.executable ? 0o755 : 0o644,
      });
      if (file.executable) chmodSync(join(configurationDir, file.path), 0o755);
    }
    mkdirSync(recordsDir, { recursive: true });
    writeFileSync(join(recordsDir, `${configured}.patch`), ending.patch);
  }
  mkdirSync(recordsDir, { recursive: true });
  const earlier = existsSync(recordFile) ? (JSON.parse(readFileSync(recordFile, 'utf8')) as unknown[]) : [];
  writeFileSync(recordFile, `${JSON.stringify([...earlier, record], undefined, 2)}\n`);

  const reloaded = loadScenario(join(repoRoot, 'scenarios'), scenario.id, scenario.version);
  return {
    record,
    recordFile,
    index: checked.index,
    configurationDir,
    transcript,
    loadIssues: reloaded.ok ? [] : reloaded.issues,
  };
}

/**
 * The records of a configured arm whose version holds no configuration for it: refused, killed, failed or interrupted
 * sessions only. The loader has parsed them already, so a file that is there reads.
 */
function readRecords(file: string): readonly { readonly date: string }[] {
  return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as { date: string }[]) : [];
}

function sha256(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
