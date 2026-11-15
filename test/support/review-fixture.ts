// The review loop's fixtures (task-149, REQ-RUN-21): a campaign that pins one with the fake agent as its reviewer, the
// two prompts written where the pins say, and a reviewer double that answers each round as the test says.
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { AgentPort, StepOutcome, StepRequest } from '../../src/agents/index.js';
import { checkCampaign } from '../../src/runner/index.js';
import type { CheckedCampaign } from '../../src/runner/index.js';
import { completeCampaignYaml, writeRepo } from './campaign-fixture.js';
import { NO_USAGE } from './runner-doubles.js';

export const REVIEW_PROMPT = '# Review\n\nReview the change and report your findings as JSON.\n';
export const FIXER_PROMPT = '# Fix\n\nFix exactly the findings above, then commit.\n';

const sha = (text: string) => createHash('sha256').update(text).digest('hex');

/** The campaign's `review_loop` entry, with the fake agent as its reviewer. */
export function reviewLoopYaml(
  overrides: { max_rounds?: number; caps?: Partial<Record<string, number>> } = {},
): Record<string, unknown> {
  return {
    agent: { name: 'fake', version: '1.0.0' },
    model: 'fake-reviewer',
    effort: 'medium',
    prompt: { file: 'review/prompt.md', sha256: sha(REVIEW_PROMPT) },
    fixer_prompt: { file: 'review/fixer-prompt.md', sha256: sha(FIXER_PROMPT) },
    max_rounds: overrides.max_rounds ?? 5,
    caps: {
      session_time_s: 600,
      session_tokens: 1_000_000,
      session_cost_eur: 2,
      fixer_interventions: 5,
      ...overrides.caps,
    },
  };
}

/** A campaign of S1 in `arms` with the fake agent, `repetitions` times, pinning a review loop unless `loop` is null. */
export function loopCampaign(
  options: {
    arms?: readonly string[];
    repetitions?: number;
    loop?: Record<string, unknown> | null;
    yaml?: (yaml: Record<string, unknown>) => void;
  } = {},
): { checked: CheckedCampaign; root: string } {
  const yaml = completeCampaignYaml();
  yaml.harnesses = {};
  yaml.arms = [...(options.arms ?? ['baseline'])];
  yaml.scenarios = [{ id: 'S1', version: '1.0' }];
  yaml.repetitions = { S1: options.repetitions ?? 1 };
  yaml.agent = { name: 'fake', version: '1.0.0' };
  yaml.models = { default: 'fake-model' };
  if (options.loop !== null) yaml.review_loop = options.loop ?? reviewLoopYaml();
  options.yaml?.(yaml);
  const { root, file } = writeRepo(yaml, ['S1@1.0']);
  mkdirSync(join(root, 'review'), { recursive: true });
  writeFileSync(join(root, 'review', 'prompt.md'), REVIEW_PROMPT);
  writeFileSync(join(root, 'review', 'fixer-prompt.md'), FIXER_PROMPT);
  writeFileSync(
    join(root, 'scenarios', 'leak-scan.yaml'),
    'harness_names: [WingFoil, Spec Kit, OpenSpec]\noracle_literal_min_length: 8\n',
  );
  const checked = checkCampaign(file);
  if (!checked.ok) throw new Error(JSON.stringify(checked.issues));
  return { checked: checked.value, root };
}

/** One finding of the reviewer's final result. */
export function finding(
  severity: 'blocker' | 'should-fix' | 'nit',
  file = 'README.md',
  line: number | null = 1,
): Record<string, unknown> {
  return { severity, file, line, title: `A ${severity}`, why: `Because it is a ${severity}.` };
}

/** The reviewer's final message holding `findings`, in a fenced block as the prompt allows. */
export function findingsMessage(...findings: readonly Record<string, unknown>[]): string {
  return `I read the change.\n\n\`\`\`json\n${JSON.stringify({ findings })}\n\`\`\`\n`;
}

/**
 * A reviewer double: each round's session answers what `round` returns for it, a final message or a whole outcome; it
 * records every request, and may run a command first, as a real adapter does, through the request's `run`.
 */
export function reviewerDouble(
  round: (n: number, request: StepRequest) => string | Partial<StepOutcome>,
  command?: (n: number) => readonly string[] | undefined,
): AgentPort & { readonly requests: StepRequest[] } {
  const requests: StepRequest[] = [];
  return {
    requests,
    runStep: async (request) => {
      requests.push(request);
      const n = requests.length;
      const run = command?.(n);
      if (run !== undefined) await request.run(run);
      const answer = round(n, request);
      return {
        sessionId: request.sessionId,
        usage: NO_USAGE,
        transcript: [`{"type":"result","review_round":${n}}`],
        ...(typeof answer === 'string' ? { finalMessage: answer } : answer),
      };
    },
    resume: () => Promise.reject(new Error('a reviewer session is never resumed')),
  };
}
