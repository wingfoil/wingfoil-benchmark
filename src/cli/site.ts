import { publishCli, systemProcess } from '../core/index.js';
import type { PublishPort } from '../core/index.js';
import { buildSite, PAGES_BRANCH, publishSite } from '../site/index.js';

import { EXIT, report, USAGE } from './shared.js';
import type { Io } from './shared.js';

/** A campaign execution, `<campaign-id>/<n>`: the id is 12 hex digits (REQ-FMT-02), so never a path. */
const CAMPAIGN_EXECUTION = /^[0-9a-f]{12}\/[1-9]\d*$/;

/**
 * `bench site build <campaign-id>/<n>` (REQ-CLI-09 as amended in 1.20, F5.5): builds the static site of an
 * aggregated execution into `site/`, and prints what it wrote and the headline. It never publishes.
 * `bench site publish [--remote <name>]` (REQ-CLI-09 and REQ-RES-04 as amended in 1.22, F5.6): the only
 * way anything is published.
 */
export async function siteCommand(
  argv: readonly string[],
  io: Io,
  root: string,
  publish: PublishPort = publishCli(systemProcess),
): Promise<number> {
  const [verb, ...rest] = argv;
  if (verb === 'publish') return publishCommand(rest, io, root, publish);
  const [execution, ...extra] = rest;
  if (verb !== 'build' || execution === undefined || extra.length > 0) return usage(io);
  if (/^dry-runs\/[1-9]\d*$/.test(execution)) {
    return report([{ path: execution, message: 'a dry run is never aggregated (REQ-RES-01)' }], io);
  }
  if (!CAMPAIGN_EXECUTION.test(execution)) return usage(io);
  const built = buildSite(root, execution);
  if (!built.ok) return report(built.issues, io);
  io.stdout(`site: ${built.value.directory} (${built.value.pages} pages)\n`);
  for (const line of built.value.headlines) io.stdout(`${line}\n`);
  return EXIT.ok;
}

async function publishCommand(
  argv: readonly string[],
  io: Io,
  root: string,
  port: PublishPort,
): Promise<number> {
  const remote =
    argv.length === 0 ? 'origin' : argv.length === 2 && argv[0] === '--remote' ? argv[1] : undefined;
  if (remote === undefined || remote === '' || remote.startsWith('-')) return usage(io);
  const published = await publishSite(root, remote, port);
  if (!published.ok) return report(published.issues, io);
  const { commit, executions, unchanged } = published.value;
  io.stdout(
    unchanged
      ? `already published: ${PAGES_BRANCH} ${commit} holds this site (${executions.join(', ')})\n`
      : `published: ${PAGES_BRANCH} ${commit} (${executions.join(', ')})\n`,
  );
  return EXIT.ok;
}

function usage(io: Io): number {
  io.stderr(USAGE);
  return EXIT.usage;
}
