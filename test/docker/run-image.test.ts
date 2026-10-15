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

  // task-094 (REQ-RUN-16 as amended in 1.32): Codex at its pinned version, and its home owned by the container user,
  // so that a single-file mount of the credential does not make Docker create it owned by root (REQ-RUN-15).
  it('installs Codex at the pinned version when AGENT_NAME=codex, with its home owned by node', () => {
    const tag = `bench-run-image-codex-test:${process.pid}`;
    execFileSync(
      'docker',
      [
        'build',
        '-q',
        '--build-arg',
        'AGENT_NAME=codex',
        '--build-arg',
        'AGENT_VERSION=0.162.1',
        '-t',
        tag,
        repoPath('docker/run-image'),
      ],
      { stdio: 'ignore' },
    );
    try {
      const out = execFileSync(
        'docker',
        ['run', '--rm', tag, 'sh', '-c', 'codex --version; stat -c %U /home/node/.codex-run'],
        { encoding: 'utf8' },
      );
      expect(out).toBe('codex-cli 0.162.1\nnode\n');
    } finally {
      execFileSync('docker', ['image', 'rm', tag], { stdio: 'ignore' });
    }
  });
});
