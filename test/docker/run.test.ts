import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { main } from '../../src/cli/index.js';
import { repoPath } from '../support/paths.js';
import { tempDir } from '../support/scenario-fixture.js';

/**
 * W1's "Ends with": a trivial scenario runs in a container from a campaign file. This is the only
 * test that needs Docker, so it lives outside `npm test` (`npm run test:docker`).
 */
describe('a trivial scenario, in a real container', () => {
  let image = '';

  afterEach(() => {
    if (image !== '') execFileSync('docker', ['image', 'rm', '--force', image], { encoding: 'utf8' });
  });

  it('runs from a campaign file and leaves the workspace behind, with no container', async () => {
    // A repository of its own, so the benchmark's own runs/ and results/ stay untouched.
    const root = tempDir('bench-docker-');
    cpSync(repoPath('test/fixtures/campaigns'), join(root, 'campaigns'), { recursive: true });
    cpSync(repoPath('test/fixtures/scenarios'), join(root, 'scenarios'), { recursive: true });
    process.env.BENCH_FAKE_SCRIPT = repoPath('test/fixtures/fake-script.json');

    let output = '';
    const code = await main(['campaign', 'run', join(root, 'campaigns', 'smoke.yaml')], {
      stdout: (text) => (output += text),
      stderr: (text) => (output += text),
    });

    expect({ code, output }).toEqual({
      code: 0,
      output: expect.stringContaining('1 run completed, 0 failed'),
    });
    image = /campaign ([0-9a-f]{12})/.exec(output)?.[1] ?? '';
    expect(image).toMatch(/^[0-9a-f]{12}$/);

    const workspace = join(root, 'runs', image, '1', 'T0@1.0', 'baseline', 'fake-model', 'r1', 'workspace');
    expect(readFileSync(join(workspace, 'hello.txt'), 'utf8')).toBe('hello\n');
    expect(existsSync(join(workspace, '.git'))).toBe(true);
    expect(existsSync(join(root, 'results', image, '1', 'campaign.yaml'))).toBe(true);

    // No container is left, and the image is the campaign's.
    const containers = execFileSync('docker', ['ps', '--all', '--format', '{{.Names}}'], {
      encoding: 'utf8',
    });
    expect(containers).not.toContain(`bench-${image}-`);
    const images = execFileSync('docker', ['image', 'ls', '--format', '{{.Repository}}'], {
      encoding: 'utf8',
    });
    expect(images.split('\n')).toContain(image);
  });
});
