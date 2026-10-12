import { existsSync, rmSync } from 'node:fs';
import { basename, join, relative } from 'node:path';

import { dockerCli, gitCli, systemProcess } from '../core/index.js';
import type { DockerPort, GitPort, Issue, Scenario } from '../core/index.js';
import {
  AGGREGATE_FILE,
  aggregateExecution,
  DRY_RUNS,
  executionRuns,
  readExecutionRecord,
  readStoredRun,
  writeAggregate,
  writeExecutionRecord,
} from '../results/index.js';
import { checkHoldoutRoot, loadHoldoutAdditions, loadScenario } from '../scenario/index.js';
import { scoreRun, scoreSummary, scoringImage, writeScore } from '../scoring/index.js';
import type { Census, HoldoutInput } from '../scoring/index.js';

import { HOLDOUT_OPTION, HOLDOUT_VARIABLE } from './scenario.js';
import { EXIT, report, USAGE } from './shared.js';
import type { Io } from './shared.js';

/** What `bench score` scores: a campaign's execution (REQ-FMT-02) or a dry run's (REQ-RES-01). */
const TARGET = new RegExp(`^([0-9a-f]{12}|${DRY_RUNS})/[1-9]\\d*$`);

/**
 * REQ-CLI-06: `bench score <campaign-id>/<n> [--holdout <path>]`, and `bench score dry-runs/<n>` (task-027).
 * Every run of the execution under `root/results/`, in path order: rebuilt, scored with its scenario's
 * public oracle, its `score.json` written, one line on stdout — or why it could not be, on stderr.
 * Exit 0 when every run was scored, whatever its tests did; 1 otherwise. A campaign's execution whose
 * runs were all scored gets its `aggregate.json` (F5.1); a dry run never does. A hold-out it is given is
 * checked before anything is scored, and its additions are scored apart, in counts only (task-028); a
 * scenario version whose `holdout:` disagrees with them is not scored, as `scenario validate` refuses it.
 */
export async function scoreCommand(
  argv: readonly string[],
  io: Io,
  ports: { readonly docker?: DockerPort; readonly git?: GitPort } | undefined,
  root: string,
): Promise<number> {
  const [target, ...rest] = argv;
  const flags = scoreFlags(rest);
  // `--final` declares a campaign's execution final (REQ-CLI-06 as amended): a dry run is never aggregated.
  if (
    target === undefined ||
    !TARGET.test(target) ||
    flags === undefined ||
    (flags.final && target.startsWith(`${DRY_RUNS}/`))
  ) {
    io.stderr(USAGE);
    return EXIT.usage;
  }
  const { final, holdout: holdoutOption } = flags;
  const variable = process.env[HOLDOUT_VARIABLE] || undefined;
  const holdout = holdoutOption ?? variable;
  if (holdout !== undefined) {
    const checked = checkHoldoutRoot(holdout);
    const source = holdoutOption !== undefined ? HOLDOUT_OPTION : HOLDOUT_VARIABLE;
    if (!checked.ok) {
      return report(
        checked.issues.map((issue) => ({ path: source, message: `${issue.path} ${issue.message}` })),
        io,
      );
    }
  }

  const executionDir = join(root, 'results', target);
  const name = `results/${target}`;
  if (!existsSync(executionDir)) return report([{ path: name, message: 'no such execution' }], io);
  const runs = executionRuns(executionDir);
  if (runs.length === 0) return report([{ path: name, message: 'holds no run' }], io);

  const docker = ports?.docker ?? dockerCli(systemProcess);
  const git = ports?.git ?? gitCli(systemProcess);
  const image = scoringImage();
  await docker.build({ dockerfile: image.dockerfile, context: image.context, tag: image.tag, buildArgs: {} });
  const census: Census = new Map();
  let failed = 0;
  for (const [index, runDir] of runs.entries()) {
    const label = runLabel(executionDir, runDir);
    const scored = await scoreOne(runDir, executionDir, root, {
      docker,
      git,
      image,
      census,
      prefix: containerPrefix(index),
      ...(holdout === undefined ? {} : { holdout }),
    });
    if (scored.ok) io.stdout(`${label}: ${scored.line}\n`);
    else {
      failed += 1;
      io.stderr(scored.issues.map((issue) => `${label}: ${issue.path}: ${issue.message}\n`).join(''));
    }
  }
  // A dry run is never aggregated (REQ-RES-01); a campaign's execution is, once every run is scored (F5.1).
  if (target.startsWith(`${DRY_RUNS}/`)) return failed > 0 ? EXIT.failure : EXIT.ok;
  // An execution that did not complete is aggregated only once the maintainer declares it final (REQ-CLI-06 as
  // amended, task-080): scoring it never forecloses a resume. One without execution.json, v0.1's, aggregates as before.
  const record = readExecutionRecord(executionDir);
  if (!record.ok) return report(record.issues, io);
  const state = record.value;
  // One aggregated before its state was recorded (by hand, or before task-080) is aggregated again: it is no longer
  // resumable, whatever its state says.
  const aggregated = existsSync(join(executionDir, AGGREGATE_FILE));
  if (
    failed === 0 &&
    state !== undefined &&
    state.state !== 'completed' &&
    state.final !== true &&
    !final &&
    !aggregated
  ) {
    const [id] = target.split('/');
    io.stdout(
      `not aggregated: execution ${basename(executionDir)} is ${state.state}` +
        `${state.reason === undefined ? '' : ` (${state.reason})`}: resume it with bench campaign run <file> ` +
        `--resume ${target}, or declare it final with bench score ${id ?? ''}/${basename(executionDir)} --final\n`,
    );
    return EXIT.ok;
  }
  const code = aggregate(executionDir, name, failed, io);
  // Recorded once its aggregate is written: final, stopped or not, and never resumed (REQ-RUN-19).
  if (code === EXIT.ok && final && state !== undefined && state.final !== true) {
    writeExecutionRecord(executionDir, { ...state, final: true });
  }
  return code;
}

/** `score`'s flags: `--final` and `--holdout <path>`, each at most once, in any order; undefined for anything else. */
function scoreFlags(argv: readonly string[]): { final: boolean; holdout?: string } | undefined {
  let final = false;
  let holdout: string | undefined;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === FINAL_FLAG && !final) final = true;
    else if (argument === HOLDOUT_OPTION && holdout === undefined && argv[index + 1] !== undefined) {
      holdout = argv[index + 1];
      index += 1;
    } else return undefined;
  }
  return { final, ...(holdout === undefined ? {} : { holdout }) };
}

/** Declares a stopped execution final, to aggregate it as it stands (REQ-CLI-06 as amended). */
const FINAL_FLAG = '--final';

/**
 * Write the execution's `aggregate.json` when all its runs were scored; otherwise remove one written
 * before, which no longer stands behind every run, and say so (task-034).
 */
function aggregate(executionDir: string, name: string, failed: number, io: Io): number {
  const file = join(executionDir, AGGREGATE_FILE);
  if (failed > 0) {
    rmSync(file, { force: true });
    io.stderr(`not aggregated: ${failed} run${failed === 1 ? '' : 's'} not scored\n`);
    return EXIT.failure;
  }
  const aggregated = aggregateExecution(executionDir);
  if (!aggregated.ok) {
    rmSync(file, { force: true });
    return report(
      aggregated.issues.map((issue) => ({ ...issue, path: `${name}/${issue.path}` })),
      io,
    );
  }
  writeAggregate(executionDir, aggregated.value);
  const { groups, slices } = aggregated.value;
  const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`;
  // Determinism (task-042): the groups it was measured in, those of one run, and those whose pins differ.
  const all = [...groups, ...slices].map((group) => group.metrics.m_r);
  const measured = all.filter((m) => m.n >= 2 && m.pins_differ === undefined).length;
  const single = all.filter((m) => m.n < 2).length;
  const differ = all.filter((m) => m.pins_differ !== undefined).length;
  const determinism =
    `determinism measured in ${measured}, n = 1 in ${single}` +
    (differ === 0 ? '' : `, pins differ in ${differ}`);
  io.stdout(
    `aggregate: ${name}/${AGGREGATE_FILE} (${count(groups.length, 'group')}, ${count(slices.length, 'slice')}; ${determinism})\n`,
  );
  return EXIT.ok;
}

async function scoreOne(
  runDir: string,
  executionDir: string,
  root: string,
  context: {
    docker: DockerPort;
    git: GitPort;
    image: ReturnType<typeof scoringImage>;
    census: Census;
    prefix: string;
    holdout?: string;
  },
): Promise<{ ok: true; line: string } | { ok: false; issues: readonly Issue[] }> {
  const run = readStoredRun(runDir);
  if (!run.ok) return run;
  const scenario = loadScenario(join(root, 'scenarios'), run.value.scenario, run.value.version);
  if (!scenario.ok) return scenario;
  const holdout = holdoutInput(scenario.value, context.holdout);
  if (!holdout.ok) return holdout;
  const score = await scoreRun({
    runDir,
    executionDir,
    run: run.value,
    scenario: scenario.value,
    image: context.image,
    docker: context.docker,
    git: context.git,
    census: context.census,
    containerPrefix: context.prefix,
    holdout: holdout.value,
  });
  if (!score.ok) return score;
  writeScore(runDir, score.value);
  return { ok: true, line: scoreSummary(score.value) };
}

/**
 * The hold-out a scenario version is scored with (task-028): its additions from the hold-out at `path`,
 * or why there are none. A version that expects additions the hold-out lacks, or declares none while it
 * has some, is refused with `bench scenario validate`'s words (task-016).
 */
function holdoutInput(
  scenario: Scenario,
  path: string | undefined,
): { ok: true; value: HoldoutInput } | { ok: false; issues: readonly Issue[] } {
  const name = `${scenario.id}@${scenario.version}`;
  if (path === undefined) {
    return { ok: true, value: { notScored: scenario.holdout ? 'not configured' : 'none declared' } };
  }
  const additions = loadHoldoutAdditions(path, scenario.id, scenario.version);
  if (!additions.ok) return additions;
  const found = additions.value.files.length;
  if (scenario.holdout && found === 0) {
    return {
      ok: false,
      issues: [
        {
          path: 'holdout',
          message: `the scenario expects hold-out additions, and ${path} has none for ${name}`,
        },
      ],
    };
  }
  if (!scenario.holdout && found > 0) {
    const files = `${found} file${found === 1 ? '' : 's'}`;
    return {
      ok: false,
      issues: [
        {
          path: 'holdout',
          message: `the scenario declares no hold-out additions, and ${path} has ${files} for ${name}`,
        },
      ],
    };
  }
  return {
    ok: true,
    value: scenario.holdout ? { additions: additions.value } : { notScored: 'none declared' },
  };
}

/** `T3@1.0 baseline fake-model r1`, from `runs/T3@1.0/baseline/fake-model/r1`. */
function runLabel(executionDir: string, runDir: string): string {
  return relative(join(executionDir, 'runs'), runDir).split(/[\\/]/).join(' ');
}

/** A scoring container's name stem: this process and the run's position, so concurrent scorings never collide. */
function containerPrefix(index: number): string {
  return `bench-score-${process.pid}-${index + 1}`;
}
