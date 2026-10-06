import { execFileSync } from 'node:child_process';

import { describe, expect, it } from 'vitest';

import { repoPath } from '../support/paths.js';

// The run image (REQ-RUN-01 as amended): Python and uv at the versions its Dockerfile states (task-064).
describe('the run image', () => {
  it('holds Python 3.11 and uv 0.12.23 besides git and node', () => {
    const tag = `bench-run-image-test:${process.pid}`;
    execFileSync('docker', ['build', '-q', '-t', tag, repoPath('docker/run-image')], { stdio: 'ignore' });
    try {
      const versions = execFileSync(
        'docker',
        ['run', '--rm', tag, 'sh', '-c', 'python3 --version; uv --version; git --version; node --version'],
        { encoding: 'utf8' },
      );
      expect(versions).toMatch(/^Python 3\.11\.\d+\nuv 0\.12\.23\b.*\ngit version .*\nv22\./);
    } finally {
      execFileSync('docker', ['image', 'rm', tag], { stdio: 'ignore' });
    }
  });
});
