import { checkCampaign } from '../runner/index.js';

/** Where the command writes its output; the bin passes the process streams, tests capture them. */
export interface Io {
  readonly stdout: (text: string) => void;
  readonly stderr: (text: string) => void;
}

/** REQ-CLI exit codes. */
export const EXIT = { ok: 0, failure: 1, usage: 2 } as const;

const USAGE = 'usage: bench campaign validate <file>\n';
const HELP_FLAGS = ['--help', '-h'];

/** Run the `bench` command line `argv` (without the executable) and return its exit code. */
export async function main(argv: readonly string[], io: Io): Promise<number> {
  if (argv.length === 1 && HELP_FLAGS.includes(argv[0] as string)) {
    io.stdout(USAGE);
    return EXIT.ok;
  }
  const [noun, verb, file, ...extra] = argv;
  if (noun !== 'campaign' || verb !== 'validate' || !isFileArgument(file) || extra.length > 0) {
    io.stderr(USAGE);
    return EXIT.usage;
  }
  return validateCampaign(file, io);
}

/** A file argument: present, not empty, and not an option. */
function isFileArgument(file: string | undefined): file is string {
  return file !== undefined && file !== '' && !file.startsWith('-');
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
