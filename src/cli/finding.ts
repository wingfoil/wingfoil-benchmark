import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { findingNote } from '../results/index.js';
import type { FindingShape } from '../results/index.js';

import { EXIT, report, USAGE } from './shared.js';
import type { Io } from './shared.js';

/** Where finding notes are written, in the repository at the working directory (REQ-RES-05). */
const FINDINGS = 'findings';

const SHAPES: readonly FindingShape[] = ['bug', 'decision-log'];

/**
 * `bench finding <campaign-id>/<n> --scenario <id>@<version> --metric <metric> --arms <arm>,… --as
 * bug|decision-log` (REQ-CLI-07 as amended in 1.19, F5.4): writes `findings/<id>.md` and nothing else,
 * never over a note already there.
 */
export function findingCommand(argv: readonly string[], io: Io, root: string): number {
  const [execution, ...rest] = argv;
  const options = new Map<string, string>();
  for (let index = 0; index < rest.length; index += 2) {
    const [flag, value] = [rest[index] as string, rest[index + 1]];
    if (
      !['--scenario', '--metric', '--arms', '--as'].includes(flag) ||
      value === undefined ||
      options.has(flag)
    ) {
      return usage(io);
    }
    options.set(flag, value);
  }
  const scenario = /^([^@]+)@([^@]+)$/.exec(options.get('--scenario') ?? '');
  const metric = options.get('--metric');
  const arms = (options.get('--arms') ?? '').split(',').filter((arm) => arm !== '');
  const shape = options.get('--as') as FindingShape | undefined;
  if (
    execution === undefined ||
    !/^[^/]+\/[1-9]\d*$/.test(execution) ||
    scenario === null ||
    metric === undefined ||
    arms.length === 0 ||
    shape === undefined ||
    !SHAPES.includes(shape)
  ) {
    return usage(io);
  }
  const note = findingNote({
    executionDir: join(root, 'results', execution),
    scenario: scenario[1] as string,
    version: scenario[2] as string,
    metric,
    arms,
    as: shape,
  });
  if (!note.ok) return report(note.issues, io);
  const path = `${FINDINGS}/${note.value.id}.md`;
  // A note the maintainer may have edited is never overwritten (the approver's choice 2).
  if (existsSync(join(root, path))) {
    return report([{ path, message: 'exists already; it is never overwritten' }], io);
  }
  mkdirSync(join(root, FINDINGS), { recursive: true });
  writeFileSync(join(root, path), note.value.text);
  io.stdout(`finding: ${path}\n`);
  return EXIT.ok;
}

function usage(io: Io): number {
  io.stderr(USAGE);
  return EXIT.usage;
}
