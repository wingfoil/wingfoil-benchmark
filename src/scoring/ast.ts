import { z } from 'zod';

import { fail, ok } from '../core/index.js';
import type { AstCheck, AstRule, DockerPort, Issue, Result } from '../core/index.js';

import { SCORE_ROOT } from './hidden-tests.js';

/** The scoring image's AST checks (docker/score-image/ast-checks.mjs, task-037). */
const AST_SCRIPT = '/opt/score/ast-checks.mjs';

/** Where the snapshot is copied in the container, relative to its working directory. */
const SNAPSHOT = 'snapshot';

/** The bounds of one step's AST run: its checks read files and run nothing of the agent's. */
const AST_TIMEOUT_S = 300;
const KILL_AFTER_S = 10;

/** A violation an `ast` check found: the check, the snapshot-relative file, the 1-based line, the rule. */
export interface AstFinding {
  readonly id: string;
  readonly file: string;
  readonly line: number;
  readonly rule: AstRule;
}

/** Runs the `ast` checks of one step on its snapshot, and returns what they found, in the script's order. */
export type AstRunner = (request: {
  readonly n: number;
  readonly snapshot: string;
  readonly checks: readonly AstCheck[];
}) => Promise<Result<AstFinding[]>>;

const findingLine = z.strictObject({
  id: z.string(),
  file: z.string(),
  line: z.number().int(),
  rule: z.enum(['undocumented-export', 'wall-clock', 'randomness', 'throw']),
});

/**
 * The AST runner of scoring (REQ-SCO-01, REQ-SCO-05 as amended in 1.13): one scoring container per step,
 * with no mount and no network, the snapshot copied in, the image's script run with the TypeScript the
 * image pins. The container is removed whatever happens; an exit other than 0 is an oracle error.
 */
export function astInContainer(options: {
  readonly docker: DockerPort;
  readonly image: string;
  readonly containerPrefix: string;
}): AstRunner {
  const { docker } = options;
  return async ({ n, snapshot, checks }) => {
    const step = `step ${String(n).padStart(2, '0')}`;
    const container = await docker.createScoring({
      image: options.image,
      name: `${options.containerPrefix}-ast-${n}`,
      user: 'node',
      workdir: SCORE_ROOT,
      readOnly: [],
    });
    try {
      await docker.start(container);
      await docker.copyTo(container, snapshot, `${SCORE_ROOT}/${SNAPSHOT}`);
      const spec = JSON.stringify(checks.map(({ id, dir, rules }) => ({ id, dir, rules })));
      const result = await docker.exec(container, [
        'timeout',
        `--kill-after=${KILL_AFTER_S}`,
        String(AST_TIMEOUT_S),
        'node',
        AST_SCRIPT,
        SNAPSHOT,
        spec,
      ]);
      if (result.code !== 0) {
        const said = result.stderr.trim().split('\n').slice(-5).join('\n');
        return fail([
          {
            path: step,
            message: `the AST checks exited with code ${result.code}${said === '' ? '' : `: ${said}`}`,
          },
        ]);
      }
      return parseFindings(result.stdout, step);
    } finally {
      await docker.remove(container);
    }
  };
}

function parseFindings(stdout: string, step: string): Result<AstFinding[]> {
  const findings: AstFinding[] = [];
  const issues: Issue[] = [];
  stdout.split('\n').forEach((line, index) => {
    if (line.trim() === '') return;
    let parsed: AstFinding | undefined;
    try {
      const result = findingLine.safeParse(JSON.parse(line));
      parsed = result.success ? result.data : undefined;
    } catch {
      parsed = undefined;
    }
    if (parsed === undefined)
      issues.push({ path: step, message: `AST output line ${index + 1} is not a finding` });
    else findings.push(parsed);
  });
  return issues.length > 0 ? fail(issues) : ok(findings);
}
