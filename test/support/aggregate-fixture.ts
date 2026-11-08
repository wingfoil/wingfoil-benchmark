import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { tempDir } from './scenario-fixture.js';

/** Stored, scored executions for the aggregate's tests (moved from test/unit/results/aggregate.test.ts, task-142). */
export const CAMPAIGN = 'c0ffee000001';

/** A suite on a snapshot, as score.json v1 writes it: its id, its tally and its failing tests. */
export interface Suite {
  readonly id: string;
  readonly passed: number;
  readonly total: number;
  readonly failed?: readonly string[];
}

export interface RunSpec {
  readonly scenario?: string;
  /** The scenario version; by default 1.0. */
  readonly version?: string;
  readonly arm: string;
  readonly model?: string;
  readonly r?: number;
  /** The run's steps: its suites, or not reached. */
  readonly steps: readonly (readonly Suite[] | 'not reached')[];
  readonly final?: readonly Suite[] | 'not reached';
  readonly holdout?: { readonly final: readonly Suite[] } | { readonly reason: string };
  readonly expectedFailure?: readonly string[];
  readonly costEur?: number;
  readonly costReported?: boolean;
  /** score.json's run `cost_priced: false` (bug-016): the agent could not price a model the run used. */
  readonly unpriced?: boolean;
  /** The hash score.json records, when it differs from run.json's. */
  readonly scoredHash?: string;
  /** score.json's `checks` (task-035); absent, the run was scored before checks were. */
  readonly checks?: readonly unknown[];
  /** score.json's `cost.setup` (task-040): M-K3, or not recorded; absent, it was scored before it. */
  readonly setup?:
    | { readonly costEur: number; readonly wallTimeMs?: number; readonly manualTokens?: number }
    | 'not recorded';
  /** Each reached step's cost in euro, in `cost.steps` (task-029); by default none listed. */
  readonly stepCosts?: readonly number[];
  /** score.json's `seed`, `m_f1`, `m_f2` and `m_d3` (task-039); absent, it was scored before them. */
  readonly continuity?: Readonly<Record<string, unknown>>;
  /** score.json's `determinism` (task-042); absent, it was scored before it. */
  readonly determinism?:
    | {
        readonly interface: readonly string[];
        readonly interface_version?: number;
        readonly paths: readonly string[];
      }
    | 'not reached';
  /** The harness commit run.json records (REQ-RUN-14), for an arm that requires one. */
  readonly harnessCommit?: string;
  /** The scoring image score.json's `scorer` names; by default `bench-score:x`. */
  readonly scorerImage?: string;
  /** A docs control's `docs_of` (REQ-RUN-11, task-068): the harness arm it was generated from. */
  readonly docsOf?: string;
  /** The scenario hash run.json and score.json both record; by default `sha256:<scenario>`. */
  readonly scenarioHash?: string;
  /** The run's tokens and wall time in score.json's `cost.run` (task-121); by default 10, 5, 0, 1 and 1000 ms. */
  readonly tokens?: {
    readonly input: number;
    readonly output: number;
    readonly cache_creation: number;
    readonly cache_read: number;
  };
  readonly wallTimeMs?: number;
  /** Further fields of run.json, such as a configured arm's (task-142). */
  readonly record?: Readonly<Record<string, unknown>>;
}

const tally = (suites: readonly Suite[]) => ({
  passed: suites.reduce((sum, suite) => sum + suite.passed, 0),
  total: suites.reduce((sum, suite) => sum + suite.total, 0),
});
const publicSuites = (suites: readonly Suite[]) =>
  suites.map(({ id, passed, total, failed }) => ({ id, passed, total, failed: failed ?? [] }));
const figures = (eur: number, reported: boolean) => ({
  tokens: { input: 10, output: 5, cache_creation: 0, cache_read: 1 },
  cost_usd: eur * 2,
  cost_eur: eur,
  cost_reported: reported,
  wall_time_ms: 1000,
  turns: 3,
  interventions: 0,
});

/** An execution under a fresh `results/`, whose runs are stored and scored as `runs` says. */
export function execution(runs: readonly RunSpec[], pins = 'models:\n  default: model-a\n'): string {
  const dir = join(tempDir('bench-aggregate-'), 'results', CAMPAIGN, '1');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'campaign.yaml'), pins);
  for (const run of runs) {
    const scenario = run.scenario ?? 'T3';
    const model = run.model ?? 'model-a';
    const runDir = join(dir, 'runs', `${scenario}@${run.version ?? '1.0'}`, run.arm, model, `r${run.r ?? 1}`);
    mkdirSync(runDir, { recursive: true });
    const final = run.final ?? run.steps[run.steps.length - 1] ?? 'not reached';
    writeFileSync(
      join(runDir, 'run.json'),
      JSON.stringify({
        scenario,
        version: run.version ?? '1.0',
        scenario_hash: run.scenarioHash ?? `sha256:${scenario}`,
        arm: run.arm,
        model,
        repetition: run.r ?? 1,
        ...(run.harnessCommit === undefined
          ? {}
          : { harness: { tool: 'wingfoil', commit: run.harnessCommit } }),
        ...(run.docsOf === undefined ? {} : { docs_of: run.docsOf }),
        outcome: final === 'not reached' ? 'failed' : 'completed',
        steps: [],
        ...run.record,
      }),
    );
    const eur = run.costEur ?? 0.5;
    writeFileSync(
      join(runDir, 'score.json'),
      JSON.stringify({
        score_version: 1,
        scenario,
        version: run.version ?? '1.0',
        scenario_hash: run.scoredHash ?? run.scenarioHash ?? `sha256:${scenario}`,
        scorer: { image: run.scorerImage ?? 'bench-score:x', tsx: '4.23.15' },
        steps: run.steps.map((step, index) =>
          step === 'not reached'
            ? { n: index + 1, not_reached: true }
            : { n: index + 1, suites: publicSuites(step), m_q1: tally(step) },
        ),
        final:
          final === 'not reached'
            ? { not_reached: true }
            : { step: run.steps.length, suites: publicSuites(final), m_q1: tally(final) },
        holdout:
          run.holdout === undefined
            ? { scored: false, reason: 'not configured' }
            : 'reason' in run.holdout
              ? { scored: false, reason: run.holdout.reason }
              : {
                  scored: true,
                  hash: 'sha256:h',
                  steps: [],
                  final: {
                    step: run.steps.length,
                    suites: run.holdout.final.map(({ id, passed, total }) => ({ id, passed, total })),
                    m_q1: tally(run.holdout.final),
                  },
                },
        ...(run.checks === undefined ? {} : { checks: run.checks }),
        ...run.continuity,
        ...(run.determinism === undefined
          ? {}
          : {
              determinism:
                run.determinism === 'not reached'
                  ? { not_reached: true }
                  : {
                      interface: run.determinism.interface,
                      ...(run.determinism.interface_version === undefined
                        ? {}
                        : { interface_version: run.determinism.interface_version }),
                      paths: run.determinism.paths,
                    },
            }),
        cost: {
          usd_to_eur: 0.5,
          steps: (run.stepCosts ?? []).map((stepEur, index) =>
            run.steps[index] === 'not reached'
              ? { n: index + 1, not_reached: true }
              : { n: index + 1, outcome: 'completed', ...figures(stepEur, true) },
          ),
          run: {
            ...figures(eur, run.costReported ?? true),
            ...(run.tokens === undefined ? {} : { tokens: run.tokens }),
            ...(run.wallTimeMs === undefined ? {} : { wall_time_ms: run.wallTimeMs }),
            ...(run.unpriced === true ? { cost_priced: false } : {}),
          },
          ...(run.setup === undefined
            ? {}
            : {
                setup:
                  run.setup === 'not recorded'
                    ? { not_recorded: true }
                    : {
                        tokens: { input: 0, output: 0, cache_creation: 0, cache_read: 0 },
                        cost_usd: run.setup.costEur * 2,
                        cost_eur: run.setup.costEur,
                        wall_time_ms: run.setup.wallTimeMs ?? 100,
                        turns: 0,
                        ...(run.setup.manualTokens === undefined
                          ? {}
                          : { manual_tokens: run.setup.manualTokens }),
                      },
              }),
        },
        expected_failure: run.expectedFailure === undefined ? null : { missing: run.expectedFailure },
      }),
    );
  }
  return dir;
}
