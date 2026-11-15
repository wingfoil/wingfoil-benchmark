import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { scrub } from '../agents/index.js';
import type { SessionUsage, StepOutcome } from '../agents/index.js';
import { parseFindings, reasonOf } from '../core/index.js';
import type { ApproverPolicy, Arm, Finding, ReviewLoop, Scenario } from '../core/index.js';
import { buildReviewCopy, setupAddedPaths } from './review-copy.js';
import {
  CAP_REACHED,
  combine,
  executeStep,
  openContainer,
  pause,
  RATE_LIMIT_MESSAGE,
  RATE_LIMIT_WAITS_S,
  remove,
  secretsNow,
  spentEur,
  untilAborted,
} from './run.js';
import type { RunnerOptions, RunPins, StepResult } from './run.js';

/**
 * The review loop (REQ-RUN-21, F4.9, task-149): after a completed run's last step, a reviewer reads a stripped copy of
 * the run's final tree and reports findings; the run's own agent fixes the blockers and should-fixes in the run's
 * container and workspace, and the next round reviews the fix, until a round reports nits only or none (`clean`) or
 * `max_rounds` rounds have run. Nothing of the run's records or scores changes: the loop writes `review/` only.
 */

/** How a loop ended (REQ-FMT-06 as amended in 1.58). `not clean at <max_rounds>` names its cap. */
export type LoopOutcome =
  'clean' | `not clean at ${number}` | 'failed' | 'no fix' | 'interrupted' | 'quota exhausted' | 'no loop';

/** What the campaign hears of a loop: its outcome, what it cost, and whether the ceiling ended it. */
export interface LoopSummary {
  readonly outcome: LoopOutcome;
  readonly reason?: string;
  /** What the loop spent, in EUR, its sessions killed before reporting counted at their bound (REQ-RUN-08). */
  readonly costEur: number;
  /** The campaign's ceiling ended the loop (REQ-RUN-08 as amended in 1.58): no new run starts. */
  readonly ceiling?: true;
}

/** One round as `loop.json` records it. */
interface RoundRecord {
  readonly n: number;
  /** The round's findings by severity; `null` for a round whose reviewer session ran and ended the loop. */
  readonly findings: Readonly<Record<Finding['severity'], number>> | null;
  /** Whether a fixer session followed the round. */
  readonly fixed: boolean;
}

/** What a run gives its loop: where the run is, and the trees and commit its last step left. */
export interface LoopRun {
  readonly container: string;
  /** The run's container's name: the reviewer's containers are named after it. */
  readonly containerName: string;
  readonly workspace: string;
  readonly outputDir: string;
  readonly scenario: Scenario;
  readonly arm: Arm;
  readonly model: string;
  readonly policy: ApproverPolicy;
  readonly mcpConfig?: string;
  readonly seedTree: string;
  readonly setupTree: string;
  readonly finalTree: string;
  readonly finalCommit: string;
}

/** What a loop needs besides its run. */
export interface LoopContext {
  readonly loop: ReviewLoop;
  /** The repository the prompts are read from. */
  readonly repoRoot: string;
  /** The image the reviewer runs in, built once per execution (REQ-RUN-01 as amended in 1.58). */
  readonly reviewerImage: string;
  readonly pins: RunPins;
  /** Containers of this plan that already exist, by name (bug-003). */
  readonly leftovers: ReadonlyMap<string, unknown>;
  /** What the campaign has spent before this loop, its run's steps included, in EUR. */
  readonly spent: number;
  readonly ceilingEur?: number;
  readonly run: LoopRun;
}

/** `timeout`'s exit code when it killed its command, and the shell's for a command killed by SIGKILL. */
const TIMED_OUT = 124;
const KILLED = 137;
/** How long `timeout` waits after its signal before it kills (as a step's commands). */
const KILL_AFTER_S = 10;

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

/** Every token a usage counts: what `session_tokens` caps. */
function tokensOf(usage: SessionUsage): number {
  return usage.inputTokens + usage.outputTokens + usage.cacheCreationInputTokens + usage.cacheReadInputTokens;
}

/** The note the runner puts above the reviewer's prompt: the copy's two commits and what the round reviews. */
export function reviewPreamble(round: number, before: string, after: string): string {
  const what =
    round === 1
      ? 'This round reviews the whole change: the second commit against the first.'
      : 'This round reviews the latest fix, in the context of the whole project: the second commit against the first.';
  return `${what}\nThe repository's two commits are ${before} and ${after}; \`git diff ${before} ${after}\` shows it.\n\n`;
}

/** The note above the fixer's prompt: the round's blockers and should-fixes, as the reviewer gave them. */
export function fixerPreamble(findings: readonly Finding[]): string {
  return `The review's findings:\n\n\`\`\`json\n${JSON.stringify({ findings }, undefined, 2)}\n\`\`\`\n\n`;
}

/** The loop's record (REQ-FMT-06 as amended in 1.58): the reviewer's pins, the outcome, its reason, the rounds. */
function writeLoop(
  outputDir: string,
  loop: ReviewLoop,
  summary: LoopSummary,
  rounds: readonly RoundRecord[],
  secrets: readonly string[],
): LoopSummary {
  const dir = join(outputDir, 'review');
  mkdirSync(dir, { recursive: true });
  const record = {
    reviewer: { agent: loop.agent, model: loop.model, effort: loop.effort },
    prompt_sha256: loop.prompt.sha256,
    fixer_prompt_sha256: loop.fixer_prompt.sha256,
    max_rounds: loop.max_rounds,
    outcome: summary.outcome,
    ...(summary.reason === undefined ? {} : { reason: scrub(summary.reason, secrets) }),
    cost_eur: summary.costEur,
    rounds,
  };
  writeFileSync(join(dir, 'loop.json'), `${JSON.stringify(record, undefined, 2)}\n`);
  return summary;
}

/** A run that did not complete has no loop (REQ-RUN-21): `no loop`, with the run's outcome as its reason. */
export function writeNoLoop(outputDir: string, loop: ReviewLoop, runOutcome: string): LoopSummary {
  return writeLoop(outputDir, loop, { outcome: 'no loop', reason: runOutcome, costEur: 0 }, [], []);
}

/** A round's findings by severity. */
function countOf(findings: readonly Finding[]): Record<Finding['severity'], number> {
  const count = { blocker: 0, 'should-fix': 0, nit: 0 };
  for (const finding of findings) count[finding.severity] += 1;
  return count;
}

/** How a reviewer session ended: its findings, or the loop's end. */
type ReviewerResult =
  | { readonly findings: readonly Finding[]; readonly costEur: number }
  | { readonly end: Omit<LoopSummary, 'costEur'>; readonly costEur: number; readonly ran: boolean };

/**
 * What `loop.json` says while the loop runs (REQ-RUN-19 as amended in 1.58): a loop the runner never finished — a hard
 * kill, a reboot — stays recorded as `interrupted`, with its rounds and its cost so far, and is never resumed.
 */
const UNFINISHED = 'the runner stopped during the loop';

/** The SHA-256 of `bytes`, hex. */
function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * Run the loop of a completed run (REQ-RUN-21). It never throws: whatever fails ends the loop as `failed` with its
 * reason, an interrupt as `interrupted`, a quota rejection as `quota exhausted`, and the run keeps its outcome.
 */
export async function executeReviewLoop(context: LoopContext, options: RunnerOptions): Promise<LoopSummary> {
  const { loop, run } = context;
  const secrets = [...secretsNow(options), ...(options.reviewer?.secrets ?? [])];
  const scrubbing: RunnerOptions = { ...options, secrets };
  const rounds: RoundRecord[] = [];
  let cost = 0;
  const end = (summary: Omit<LoopSummary, 'costEur'>): LoopSummary => {
    const done = { ...summary, costEur: cost };
    options.log?.(`review loop: ${done.outcome}${done.reason === undefined ? '' : ` (${done.reason})`}`);
    return writeLoop(run.outputDir, loop, done, rounds, secrets);
  };
  const interrupted = () => options.signal?.aborted === true;
  // Written before anything runs and after every session, so that what was spent is never lost (REQ-RUN-08).
  // Before a session, its bound is counted too: a session the runner never finished counts at its bound (REQ-RUN-19).
  const progress = (pendingEur = 0) => {
    const costEur = cost + pendingEur;
    writeLoop(run.outputDir, loop, { outcome: 'interrupted', reason: UNFINISHED, costEur }, rounds, secrets);
  };
  try {
    progress();
    const reviewer = options.reviewer;
    if (reviewer === undefined)
      return end({ outcome: 'failed', reason: 'the runner was given no reviewer agent' });
    // The bytes sent are the bytes pinned: a prompt changed since the campaign's check is refused here too.
    const prompts = [loop.prompt, loop.fixer_prompt].map((pin) => {
      const bytes = readFileSync(join(context.repoRoot, pin.file));
      const actual = sha256(bytes);
      if (actual !== pin.sha256)
        throw new Error(`${pin.file}: its SHA-256 is ${actual}, not the pinned ${pin.sha256}`);
      return bytes.toString('utf8');
    });
    const [prompt = '', fixerPrompt = ''] = prompts;
    const stripped = await setupAddedPaths(run.workspace, run.seedTree, run.setupTree, options.git);
    let before = run.seedTree;
    let after = run.finalTree;
    let afterCommit = run.finalCommit;
    for (let n = 1; n <= loop.max_rounds; n += 1) {
      const copyDir = join(dirname(run.workspace), 'review', String(n));
      const commits = await buildReviewCopy(
        { workspace: run.workspace, copyDir, before, after, stripped },
        options.git,
      );
      // A fix that changed only what the copy strips changed nothing the reviewer reads: said before any stop.
      if (
        n > 1 &&
        (await options.git.tree(copyDir, commits.before)) === (await options.git.tree(copyDir, commits.after))
      ) {
        return end({ outcome: 'no fix', reason: `round ${n - 1}'s fix changed nothing the reviewer reads` });
      }
      if (interrupted()) return end({ outcome: 'interrupted', reason: `interrupted before round ${n}` });
      // The ceiling, before the loop's first round and between its rounds (REQ-RUN-08 as amended in 1.58).
      if (context.ceilingEur !== undefined && context.spent + cost >= context.ceilingEur) {
        return end({
          outcome: 'interrupted',
          reason: `the campaign's ceiling, ${context.ceilingEur} EUR, was reached before round ${n}`,
          ceiling: true,
        });
      }
      const roundDir = join(run.outputDir, 'review', String(n));
      mkdirSync(roundDir, { recursive: true });
      progress(loop.caps.session_cost_eur);
      const reviewed = await reviewRound(
        n,
        { context, copyDir, roundDir, commits, prompt, secrets },
        scrubbing,
      );
      cost += reviewed.costEur;
      if ('end' in reviewed) {
        // A round whose session ran is a round of the loop, without findings (task C counts it apart).
        if (reviewed.ran) rounds.push({ n, findings: null, fixed: false });
        return end(reviewed.end);
      }
      progress();
      const { findings } = reviewed;
      const toFix = findings.filter((finding) => finding.severity !== 'nit');
      // Nits are never fixed: a round with nits only, or none, closes the loop.
      if (toFix.length === 0) {
        rounds.push({ n, findings: countOf(findings), fixed: false });
        return end({ outcome: 'clean' });
      }
      // The last round's findings are not fixed: no round would review the fix.
      if (n === loop.max_rounds) {
        rounds.push({ n, findings: countOf(findings), fixed: false });
        return end({
          outcome: `not clean at ${loop.max_rounds}`,
          reason: `round ${n} reported ${toFix.length} blocker or should-fix finding(s)`,
        });
      }
      progress(loop.caps.session_cost_eur);
      const fixed = await fixRound(
        n,
        { context, roundDir, toFix, fixerPrompt, afterTree: after, afterCommit },
        scrubbing,
      );
      cost += fixed.costEur;
      rounds.push({ n, findings: countOf(findings), fixed: true });
      if ('end' in fixed) return end(fixed.end);
      progress();
      before = after;
      after = fixed.tree;
      afterCommit = fixed.commit;
    }
    // Unreachable: the last round either closes the loop or ends it at its cap.
    return end({ outcome: `not clean at ${loop.max_rounds}` });
  } catch (error) {
    if (interrupted()) return end({ outcome: 'interrupted', reason: reasonOf(error) });
    return end({ outcome: 'failed', reason: reasonOf(error) });
  } finally {
    options.reviewer?.agent.endRun?.();
  }
}

/** What one reviewer round needs. */
interface RoundInput {
  readonly context: LoopContext;
  readonly copyDir: string;
  readonly roundDir: string;
  readonly commits: { readonly before: string; readonly after: string };
  readonly prompt: string;
  readonly secrets: readonly string[];
}

/**
 * One reviewer session (REQ-RUN-21): in a container of its own from the reviewer's image, whose only mount is the
 * copy, removed when the round ends whatever happens; capped by the loop's caps; read-only, checked after; its final
 * message parsed as the findings.
 */
async function reviewRound(n: number, input: RoundInput, options: RunnerOptions): Promise<ReviewerResult> {
  const { context, copyDir, roundDir, commits, secrets } = input;
  const { loop, pins } = context;
  const reviewer = options.reviewer as NonNullable<RunnerOptions['reviewer']>;
  const name = `${context.run.containerName}-review-${n}`;
  const caps = loop.caps;
  const boundEur = caps.session_cost_eur;
  // Reported, never removed: the runner does not destroy what this round did not create (bug-003).
  if (context.leftovers.has(name)) {
    return {
      end: {
        outcome: 'failed',
        reason: `container ${name} already exists: remove it with: docker rm --force ${name}`,
      },
      costEur: 0,
      ran: false,
    };
  }
  let container: string | undefined;
  let removal: Promise<void> | undefined;
  const kill = () => {
    if (container !== undefined) removal ??= remove(container, options);
  };
  const aborted = () => options.signal?.aborted === true;
  let killed = false;
  /** The rate limit's waits, in seconds (task-051's constants). */
  const waits: number[] = [];
  /** The cap that kept a rate-limited session from being resumed. */
  let stoppedAt: string | undefined;
  let outcome: StepOutcome | undefined;
  let failure: string | undefined;
  try {
    container = await openContainer(
      { image: context.reviewerImage, name, workspace: copyDir, agentName: loop.agent.name, mcp: false },
      // The reviewer's credential, never the run's (REQ-RUN-15 for the reviewer agent).
      { ...options, containerEnv: reviewer.containerEnv ?? {}, credentialFile: undefined } as RunnerOptions,
      (made) => {
        container = made;
        options.signal?.addEventListener('abort', kill, { once: true });
        if (aborted()) kill();
      },
    );
    const now = options.now ?? (() => performance.now());
    const sleep = options.sleep ?? ((ms: number) => pause(ms, options.signal));
    // A rate limit's waits move the deadline by as long, as a step's (task-051).
    let deadline = now() + caps.session_time_s * 1000;
    const run = async (command: readonly string[]) => {
      const seconds = Math.ceil((deadline - now()) / 1000);
      if (seconds <= 0) {
        killed = true;
        return { code: TIMED_OUT, stdout: '', stderr: `review round ${n}: time cap reached` };
      }
      const result = await options.docker.exec(
        container as string,
        ['timeout', '-k', String(KILL_AFTER_S), String(seconds), ...command],
        { ownProcessGroup: true },
      );
      if (result.code === TIMED_OUT || result.code === KILLED) killed = true;
      return result;
    };
    const sessionId = randomUUID();
    const effort = loop.effort === 'none' ? {} : { effort: loop.effort };
    const limitUsd = boundEur / pins.currency.usd_to_eur;
    try {
      outcome = await reviewer.agent.runStep({
        scenarioId: 'review',
        step: n,
        prompt: `${reviewPreamble(n, commits.before, commits.after)}${input.prompt}`,
        model: loop.model,
        sessionId,
        remainingCostUsd: limitUsd,
        ...effort,
        run,
      });
      // A rate limit is waited out and the session resumed, as a step's (REQ-RUN-13): only after the last wait is it
      // the quota. Nothing is resumed after the interrupt or past the time cap.
      while (
        outcome.stop === 'rate limited' &&
        outcome.error === undefined &&
        !killed &&
        !aborted() &&
        waits.length < RATE_LIMIT_WAITS_S.length
      ) {
        // Not resumed over its token cap, nor with nothing left of its cost cap, as a step's (task-051's review).
        if (tokensOf(outcome.usage) > caps.session_tokens) {
          stoppedAt = `token cap (${caps.session_tokens})`;
          break;
        }
        if (limitUsd - outcome.usage.costUsd <= 0) {
          stoppedAt = `cost cap (${boundEur} EUR)`;
          break;
        }
        const waitS = RATE_LIMIT_WAITS_S[waits.length] as number;
        options.log?.(`review round ${n}: rate limited, waiting ${waitS} s before resuming`);
        waits.push(waitS);
        // The interrupt cuts the wait short, whatever sleep was injected.
        await untilAborted(sleep(waitS * 1000), options.signal);
        if (aborted()) break;
        deadline += waitS * 1000;
        const previous: StepOutcome = outcome;
        const resumed = await reviewer.agent.resume({
          scenarioId: 'review',
          step: n,
          intervention: waits.length,
          sessionId,
          reply: RATE_LIMIT_MESSAGE,
          remainingCostUsd: limitUsd - previous.usage.costUsd,
          ...effort,
          run,
        });
        // Counted first, whatever it answered: what a resume spent is never lost (REQ-RUN-08).
        outcome = {
          ...resumed,
          usage: combine(previous.usage, resumed.usage),
          transcript: [...previous.transcript, ...resumed.transcript],
        };
        // A resume answered from another session is not this round's (F2.2), as a step's.
        if (resumed.sessionId !== sessionId) {
          failure = `its resume ran in session ${resumed.sessionId}, not in ${sessionId}`;
          break;
        }
      }
    } catch (error) {
      failure = reasonOf(error);
    }
  } catch (error) {
    failure = reasonOf(error);
  } finally {
    options.signal?.removeEventListener('abort', kill);
    if (container !== undefined) await (removal ?? remove(container, options));
  }

  const usage = outcome?.usage ?? NO_USAGE;
  const bounded = killed || outcome === undefined || outcome.costUnknown === true;
  const costEur = bounded && container !== undefined ? Math.max(usage.costEur, boundEur) : usage.costEur;
  writeFileSync(
    join(roundDir, 'reviewer-usage.json'),
    `${JSON.stringify(
      {
        ...usage,
        ...(bounded && container !== undefined ? { cost_bound_eur: boundEur } : {}),
        ...(waits.length === 0 ? {} : { rate_limit_waits_s: waits }),
      },
      undefined,
      2,
    )}\n`,
  );
  writeFileSync(
    join(roundDir, 'reviewer.jsonl'),
    (outcome?.transcript ?? []).map((line) => `${scrub(line, secrets)}\n`).join(''),
  );
  const ended = (summary: Omit<LoopSummary, 'costEur'>): ReviewerResult => ({
    end: summary,
    costEur,
    ran: container !== undefined,
  });
  if (aborted()) return ended({ outcome: 'interrupted', reason: `interrupted during round ${n}'s review` });
  if (killed) {
    return ended({
      outcome: 'failed',
      reason: `round ${n}'s reviewer reached its time cap (${caps.session_time_s} s)`,
    });
  }
  if (failure !== undefined)
    return ended({ outcome: 'failed', reason: `round ${n}'s reviewer failed: ${failure}` });
  if (outcome === undefined)
    return ended({ outcome: 'failed', reason: `round ${n}'s reviewer reported nothing` });
  if (stoppedAt !== undefined) {
    return ended({
      outcome: 'failed',
      reason: `round ${n}'s reviewer reached its ${stoppedAt} at a rate limit`,
    });
  }
  if (outcome.stop === 'quota exhausted' || outcome.stop === 'rate limited') {
    const after = waits.length === 0 ? '' : ` after ${waits.length} rate-limit waits`;
    return ended({
      outcome: 'quota exhausted',
      reason: `round ${n}'s reviewer was stopped at the quota${after}`,
    });
  }
  if (outcome.stop === 'cap reached') {
    return ended({
      outcome: 'failed',
      reason: `round ${n}'s reviewer reached its cost cap (${boundEur} EUR)`,
    });
  }
  if (outcome.error !== undefined) {
    return ended({ outcome: 'failed', reason: `round ${n}'s reviewer failed: ${outcome.error}` });
  }
  if (tokensOf(usage) > caps.session_tokens) {
    return ended({
      outcome: 'failed',
      reason: `round ${n}'s reviewer reached its token cap (${caps.session_tokens})`,
    });
  }
  // Read-only (REQ-RUN-21): the copy's tracked files and the untracked ones git does not ignore, then any commit made
  // over the round's. Checking out an earlier commit to read it changes nothing, and is not refused.
  const changed = await options.git.dirtyPaths(copyDir);
  const made = await options.git.commitsSince(copyDir, commits.after);
  if (changed.length > 0 || made.length > 0) {
    const what = changed.length > 0 ? changed.join(', ') : `${made.length} commit(s) over the copy's`;
    return ended({ outcome: 'failed', reason: `round ${n}'s reviewer changed its copy: ${what}` });
  }
  const parsed = parseFindings(outcome.finalMessage ?? '');
  if (!parsed.ok) {
    const issues = parsed.issues.map((issue) => `${issue.path}: ${issue.message}`).join('; ');
    return ended({ outcome: 'failed', reason: `round ${n}'s findings do not parse: ${issues}` });
  }
  writeFileSync(
    join(roundDir, 'findings.json'),
    `${scrub(JSON.stringify({ findings: parsed.value }, undefined, 2), secrets)}\n`,
  );
  return { findings: parsed.value, costEur };
}

/** What one fixer session needs. */
interface FixInput {
  readonly context: LoopContext;
  readonly roundDir: string;
  readonly toFix: readonly Finding[];
  readonly fixerPrompt: string;
  /** The tree and commit before the fix: its patch starts from them. */
  readonly afterTree: string;
  readonly afterCommit: string;
}

/** How a fixer session ended: the tree and commit it left, or the loop's end. */
type FixResult =
  | { readonly tree: string; readonly commit: string; readonly costEur: number }
  | { readonly end: Omit<LoopSummary, 'costEur'>; readonly costEur: number };

/**
 * One fixer session (REQ-RUN-21): the run's own agent and model in the run's container and workspace, with the arm's
 * MCP configuration and the approver policy as a step after the last, under the loop's caps; its interventions capped
 * by `fixer_interventions`.
 */
async function fixRound(n: number, input: FixInput, options: RunnerOptions): Promise<FixResult> {
  const { context, roundDir } = input;
  const { loop, run, pins } = context;
  const caps = loop.caps;
  const lastStep = run.scenario.steps.at(-1);
  const step = { ...(lastStep as Scenario['steps'][number]), n: (lastStep?.n ?? 0) + n, promptPath: '' };
  delete (step as { verdict?: unknown }).verdict;
  const result = await executeStep(
    step,
    {
      container: run.container,
      workspace: run.workspace,
      outputDir: run.outputDir,
      scenario: run.scenario,
      model: run.model,
      policy: { ...run.policy, maxInterventions: caps.fixer_interventions },
      arm: run.arm,
      spent: 0,
      pins: {
        agent: pins.agent,
        currency: pins.currency,
        caps: {
          step_time_s: caps.session_time_s,
          step_tokens: caps.session_tokens,
          run_cost_eur: caps.session_cost_eur,
        },
      },
      previousTree: input.afterTree,
      previousCommit: input.afterCommit,
      ...(run.mcpConfig === undefined ? {} : { mcpConfig: run.mcpConfig }),
      session: {
        prompt: `${fixerPreamble(input.toFix)}${input.fixerPrompt}`,
        dir: roundDir,
        commitMessage: `review fix ${n}`,
      },
    },
    options,
  );
  if (result === CAP_REACHED) {
    return {
      end: { outcome: 'failed', reason: `round ${n}'s fixer had nothing left of its cost cap` },
      costEur: 0,
    };
  }
  const costEur = spentEur([result], pins);
  writeFileSync(
    join(roundDir, 'fixer-usage.json'),
    `${JSON.stringify(
      {
        usage: result.usage,
        ...(result.costBoundUsd === undefined ? {} : { cost_bound_usd: result.costBoundUsd }),
        interventions: result.interventions,
        outcome: result.outcome,
        ...(result.error === undefined ? {} : { error: scrub(result.error, secretsNow(options)) }),
      },
      undefined,
      2,
    )}\n`,
  );
  const ended = (summary: Omit<LoopSummary, 'costEur'>): FixResult => ({ end: summary, costEur });
  switch (result.outcome) {
    case 'completed':
      return { tree: result.tree as string, commit: result.commit as string, costEur };
    case 'interrupted':
      return ended({ outcome: 'interrupted', reason: `interrupted during round ${n}'s fix` });
    case 'quota exhausted':
      return ended({ outcome: 'quota exhausted', reason: `round ${n}'s fixer was stopped at the quota` });
    case 'failed':
      return ended({
        outcome: 'failed',
        reason: `round ${n}'s fixer failed: ${result.error ?? 'no reason given'}`,
      });
    default:
      return ended({ outcome: 'failed', reason: `round ${n}'s fixer: ${capReason(result, loop)}` });
  }
}

/** What a fixer killed or stopped at a cap reached, in words. */
function capReason(result: StepResult, loop: ReviewLoop): string {
  const { caps } = loop;
  switch (result.outcome) {
    case 'time cap reached':
      return `time cap reached (${caps.session_time_s} s)`;
    case 'token cap reached':
      return `token cap reached (${caps.session_tokens})`;
    case 'intervention cap reached':
      return `intervention cap reached (${caps.fixer_interventions})`;
    default:
      return `cost cap reached (${caps.session_cost_eur} EUR)`;
  }
}
