import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stringify, parse } from 'yaml';
import { afterEach, describe, expect, it } from 'vitest';

import { main } from '../../src/cli/index.js';
import { priceCampaign } from '../support/dry-run-fixture.js';
import { repoPath } from '../support/paths.js';
import { tempDir } from '../support/scenario-fixture.js';

/**
 * task-094, criterion 12: a Codex campaign through `bench campaign run` in a real container, with the image's real
 * Codex replaced by a stub the arm's setup puts first on the PATH. The stub checks what the runner gave Codex, rewrites
 * the credential as a refresh does, and answers in Codex's `--json` shape. No credential leaves the run; no network.
 */
const STUB = `#!/bin/bash
set -euo pipefail
test -f "$CODEX_HOME/config.toml"
grep -q 'cli_auth_credentials_store = "file"' "$CODEX_HOME/config.toml"
token=$(sed -n 's/.*"access_token": *"\\([^"]*\\)".*/\\1/p' "$CODEX_HOME/auth.json")
# A refresh: Codex rewrites auth.json in place (truncate and write), through the single-file mount.
printf '{"tokens":{"access_token":"at-refreshed-in-container-0002"}}' > "$CODEX_HOME/auth.json"
test -f AGENTS.md
echo hello > hello.txt
echo '{"type":"thread.started","thread_id":"019a0000-0000-7000-8000-000000000001"}'
echo "{\\"type\\":\\"item.completed\\",\\"item\\":{\\"id\\":\\"i\\",\\"type\\":\\"agent_message\\",\\"text\\":\\"done with $token\\"}}"
echo '{"type":"turn.completed","usage":{"input_tokens":100,"cached_input_tokens":40,"cache_write_input_tokens":10,"output_tokens":20,"reasoning_output_tokens":5}}'
`;

const SETUP = `#!/bin/bash
set -euo pipefail
mkdir -p /home/node/.local/bin
cat > /home/node/.local/bin/codex <<'STUB'
${STUB}STUB
chmod +x /home/node/.local/bin/codex
echo "codex stub installed"
`;

describe('a Codex campaign in a real container (task-094)', () => {
  let image = '';
  afterEach(() => {
    if (image !== '') execFileSync('docker', ['image', 'rm', '--force', image], { encoding: 'utf8' });
    image = '';
  });

  it('mounts the credential read-write, writes config.toml and AGENTS.md, and scrubs the token', async () => {
    const root = tempDir('bench-docker-codex-');
    cpSync(repoPath('test/fixtures/campaigns'), join(root, 'campaigns'), { recursive: true });
    cpSync(repoPath('test/fixtures/scenarios'), join(root, 'scenarios'), { recursive: true });
    cpSync(repoPath('test/fixtures/arms'), join(root, 'arms'), { recursive: true });
    writeFileSync(join(root, 'arms', 'baseline', 'setup.sh'), SETUP);
    const smoke = parse(readFileSync(join(root, 'campaigns', 'smoke.yaml'), 'utf8')) as Record<
      string,
      unknown
    >;
    const file = join(root, 'campaigns', 'codex-smoke.yaml');
    writeFileSync(
      file,
      stringify({
        ...smoke,
        agent: { name: 'codex', version: '0.162.1', effort: { 'fake-model': 'medium' } },
      }),
    );
    // The credential, outside any git checkout, mode 600: a fake one.
    const auth = join(tempDir('bench-docker-codex-auth-'), 'auth.json');
    writeFileSync(auth, JSON.stringify({ tokens: { access_token: 'at-original-in-host-0001' } }));
    chmodSync(auth, 0o600);
    process.env.BENCH_CODEX_AUTH_FILE = auth;

    let output = '';
    priceCampaign(file);
    const code = await main(['campaign', 'run', file, '--allow-spending'], {
      stdout: (text) => (output += text),
      stderr: (text) => (output += text),
    });
    delete process.env.BENCH_CODEX_AUTH_FILE;

    expect({ code, output }).toEqual({
      code: 0,
      output: expect.stringContaining('1 run completed, 0 failed'),
    });
    image = /campaign ([0-9a-f]{12})/.exec(output)?.[1] ?? '';
    // The refresh reached the host's file through the read-write single-file mount (dl-019 bound 4).
    expect(readFileSync(auth, 'utf8')).toContain('at-refreshed-in-container-0002');

    const workspace = join(root, 'runs', image, '1', 'T0@1.0', 'baseline', 'fake-model', 'r1', 'workspace');
    expect(readFileSync(join(workspace, 'hello.txt'), 'utf8')).toBe('hello\n');
    expect(existsSync(join(workspace, 'AGENTS.md'))).toBe(true);
    expect(existsSync(join(workspace, 'CLAUDE.md'))).toBe(false);
    const out = join(root, 'results', image, '1', 'runs', 'T0@1.0', 'baseline', 'fake-model', 'r1');
    const transcript = readFileSync(join(out, 'steps', '01', 'transcript.jsonl'), 'utf8');
    expect(transcript).not.toContain('at-original-in-host-0001');
    expect(transcript).toContain('done with [redacted]');
    const record = JSON.parse(readFileSync(join(out, 'run.json'), 'utf8')) as { manual: { file: string } };
    expect(record.manual.file).toBe('AGENTS.md');
    // Nothing of the credential in the results.
    const leaks = spawnSync('grep', ['-rlF', 'at-original-in-host-0001', join(root, 'results')], {
      encoding: 'utf8',
    });
    expect({ status: leaks.status, files: leaks.stdout }).toEqual({ status: 1, files: '' });
  }, 900_000);
});
