#!/usr/bin/env node
// The external links of the pages an AI agent reads first (task-155), checked on demand: the suite checks the relative
// links on every run and leaves these out, so that it needs no network. It only reads the files and requests each link.
//
// Usage: node scripts/check-external-links.mjs [file…]   (default: llms.txt and docs/evaluate.md)
/* global fetch, AbortSignal -- Node's own, which the lint's script globals do not list. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TIMEOUT_MS = 15_000;
const files = process.argv.slice(2);
const root = fileURLToPath(new URL('..', import.meta.url));
const read = files.length > 0 ? files : [join(root, 'llms.txt'), join(root, 'docs/evaluate.md')];

/** Every http(s) address in `text`: in a link, an autolink, a code fence or bare, without the punctuation after it. */
function linksOf(text) {
  return [...text.matchAll(/https?:\/\/[^\s<>()[\]"'`]+/g)].map((match) => match[0].replace(/[.,;:]+$/, ''));
}

/** Why `url` does not answer, or undefined when it does. */
async function problemOf(url) {
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'user-agent': 'wingfoil-benchmark-link-check' },
    });
    return response.ok ? undefined : String(response.status);
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

const links = [...new Set(read.flatMap((file) => linksOf(readFileSync(file, 'utf8'))))].sort();
let failed = 0;
for (const url of links) {
  const problem = await problemOf(url);
  if (problem === undefined) continue;
  failed += 1;
  console.error(`${url}: ${problem}`);
}
console.log(`${links.length} external link${links.length === 1 ? '' : 's'} checked, ${failed} failed`);
process.exitCode = failed > 0 ? 1 : 0;
