// task-155 — scripts/check-external-links.mjs: the external links of the given files, checked on demand.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { repoPath } from '../../support/paths.js';
import { tempDir } from '../../support/scenario-fixture.js';

const SCRIPT = repoPath('scripts/check-external-links.mjs');
const server = createServer((request, response) => {
  response.statusCode = request.url === '/ok' ? 200 : 404;
  response.end();
});
let base = '';

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => {
  server.close();
});

/** The script's exit code and output on one file holding `text`; asynchronous, since the server is in this process. */
function check(text: string): Promise<{ code: number | null; output: string }> {
  const file = join(tempDir('bench-links-'), 'page.md');
  writeFileSync(file, text);
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [SCRIPT, file]);
    let output = '';
    child.stdout.on('data', (chunk: Buffer) => (output += chunk.toString()));
    child.stderr.on('data', (chunk: Buffer) => (output += chunk.toString()));
    child.on('close', (code) => resolve({ code, output }));
  });
}

describe('scripts/check-external-links.mjs (task-155)', () => {
  it('passes when every external link answers, in a link or an autolink, and reads each once', async () => {
    const result = await check(`[a](${base}/ok) and <${base}/ok> and [b](local.md)\n`);
    expect(result.code).toBe(0);
    expect(result.output).toContain('1 external link checked, 0 failed');
  });

  it('fails naming the link that does not answer', async () => {
    const result = await check(`[a](${base}/ok)\n[b](${base}/gone)\n`);
    expect(result.code).toBe(1);
    expect(result.output).toContain(`${base}/gone: 404`);
    expect(result.output).toContain('2 external links checked, 1 failed');
  });
});
