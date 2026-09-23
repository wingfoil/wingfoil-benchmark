import { execFile } from 'node:child_process';
import process from 'node:process';

/** What running a process produced. A non-zero `code` is data, not an exception. */
export interface ProcessResult {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
}

/** REQ-ARC-04: every external program is called through this port, so tests replace it with a fake. */
export interface ProcessPort {
  run(
    command: string,
    args: readonly string[],
    options?: { cwd?: string; env?: Readonly<Record<string, string>> },
  ): Promise<ProcessResult>;
}

/** The port that really starts processes. */
export const systemProcess: ProcessPort = {
  run(command, args, options) {
    return new Promise((resolve) => {
      const environment = options?.env ? { ...process.env, ...options.env } : process.env;
      execFile(
        command,
        [...args],
        { cwd: options?.cwd, env: environment, encoding: 'utf8' },
        (error, stdout, stderr) => {
          const code = error && typeof error.code === 'number' ? error.code : error ? 1 : 0;
          resolve({ code, stdout, stderr });
        },
      );
    });
  },
};

/** The error a port raises when its command fails: what ran, and what it said. */
export function processFailure(command: string, args: readonly string[], result: ProcessResult): Error {
  const what = [command, ...args].join(' ');
  return new Error(
    `${what} failed with code ${result.code}:\n${result.stderr.trim() || result.stdout.trim()}`,
  );
}
