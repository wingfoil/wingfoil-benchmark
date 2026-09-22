import { checkCampaign } from './campaign.js';

/** Where the command writes its output; the bin passes the process streams, tests capture them. */
export interface Io {
  readonly stdout: (text: string) => void;
  readonly stderr: (text: string) => void;
}

/** REQ-CLI exit codes. */
export const EXIT = { ok: 0, failure: 1, usage: 2 } as const;

const USAGE = 'usage: bench campaign validate <file>\n';

/** Run the `bench` command line `argv` (without the executable) and return its exit code. */
export async function main(argv: readonly string[], io: Io): Promise<number> {
  const [noun, verb, file, ...extra] = argv;
  if (noun !== 'campaign' || verb !== 'validate' || file === undefined || extra.length > 0) {
    io.stderr(USAGE);
    return EXIT.usage;
  }
  return validateCampaign(file, io);
}

/** REQ-CLI-01: `bench campaign validate <file>`. */
async function validateCampaign(file: string, io: Io): Promise<number> {
  const result = checkCampaign(file);
  if (!result.ok) {
    io.stderr(result.issues.map((issue) => `${issue.path}: ${issue.message}\n`).join(''));
    return EXIT.failure;
  }
  const { id, spec } = result.value.campaign;
  io.stdout(
    `campaign ${id} is valid (${count(spec.scenarios.length, 'scenario')}, ${count(spec.arms.length, 'arm')})\n`,
  );
  return EXIT.ok;
}

function count(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? '' : 's'}`;
}
