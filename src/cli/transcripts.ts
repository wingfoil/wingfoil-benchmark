import { systemProcess } from '../core/index.js';
import type { ProcessPort } from '../core/index.js';
import { packTranscripts } from '../results/index.js';
import type { KnownSecret } from '../results/index.js';
import { loadAgentToken } from '../agents/index.js';

import { TOKEN_VARIABLE } from './preflight.js';
import { EXIT, report, USAGE } from './shared.js';
import type { Io } from './shared.js';

/** A campaign execution, `<campaign-id>/<n>`. */
const CAMPAIGN_EXECUTION = /^[0-9a-f]{12}\/[1-9]\d*$/;

/**
 * `bench transcripts pack <campaign-id>/<n>` (REQ-CLI-11 and REQ-RES-06 as amended in 1.22, task-047): packs
 * the execution's transcripts into one release asset, records it in their runs, and prints the `gh release`
 * command that attaches it. It runs no `gh`: attaching is the maintainer's.
 */
export async function transcriptsCommand(
  argv: readonly string[],
  io: Io,
  root: string,
  process: ProcessPort = systemProcess,
): Promise<number> {
  const [verb, execution, ...rest] = argv;
  if (verb !== 'pack' || execution === undefined || rest.length > 0) return usage(io);
  if (/^dry-runs\/[1-9]\d*$/.test(execution)) {
    return report([{ path: execution, message: 'a dry run is never published (REQ-RES-01)' }], io);
  }
  if (!CAMPAIGN_EXECUTION.test(execution)) return usage(io);
  const secrets: KnownSecret[] = [];
  const tokenFile = globalThis.process.env[TOKEN_VARIABLE];
  if (tokenFile !== undefined && tokenFile !== '') {
    const token = loadAgentToken(tokenFile);
    if (!token.ok) return report(token.issues, io);
    secrets.push({ value: token.value, name: `the agent token (${TOKEN_VARIABLE})` });
  }
  const packed = await packTranscripts(root, execution, { process, secrets });
  if (!packed.ok) return report(packed.issues, io);
  const { release, archive, sha256, transcripts, runsWithout } = packed.value;
  io.stdout(`transcripts: ${archive} (${transcripts} transcripts, sha256:${sha256})\n`);
  if (runsWithout.length > 0) {
    io.stdout(
      `${runsWithout.length} run${runsWithout.length === 1 ? ' has' : 's have'} no transcript on disk\n`,
    );
  }
  io.stdout(
    `attach it to the release (not run here):\n  gh release create ${release} ${archive} ` +
      `--title "Transcripts of ${execution}" --notes "The transcripts of campaign execution ${execution}."\n`,
  );
  if (tokenFile === undefined || tokenFile === '') {
    io.stdout(`${TOKEN_VARIABLE} is not set: checked for the shape of an Anthropic key only\n`);
  }
  return EXIT.ok;
}

function usage(io: Io): number {
  io.stderr(USAGE);
  return EXIT.usage;
}
