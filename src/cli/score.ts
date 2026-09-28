import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';

import { dockerCli, gitCli, systemProcess } from '../core/index.js';
import type { DockerPort, GitPort, Issue, Scenario } from '../core/index.js';
import { DRY_RUNS, executionRuns, readStoredRun } from '../results/index.js';
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
 * Exit 0 when every run was scored, whatever its tests did; 1 otherwise. A hold-out it is given is
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
  const holdoutOption = rest.length === 2 && rest[0] === HOLDOUT_OPTION ? rest[1] : undefined;
  if (target === undefined || !TARGET.test(target) || (rest.length > 0 && holdoutOption === undefined)) {
    io.stderr(USAGE);
    return EXIT.usage;
  }
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
  let failed = false;
  for (const [index, runDir] of runs.entries()) {
    const label = runLabel(executionDir, runDir);
    const scored = await scoreOne(runDir, root, {
      docker,
      git,
      image,
      census,
      prefix: containerPrefix(index),
      ...(holdout === undefined ? {} : { holdout }),
    });
    if (scored.ok) io.stdout(`${label}: ${scored.line}\n`);
    else {
      failed = true;
      io.stderr(scored.issues.map((issue) => `${label}: ${issue.path}: ${issue.message}\n`).join(''));
    }
  }
  return failed ? EXIT.failure : EXIT.ok;
}

async function scoreOne(
  runDir: string,
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
