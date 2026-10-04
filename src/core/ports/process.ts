import { execFile } from 'node:child_process';
import process from 'node:process';

/** What running a process produced. A non-zero `code` is data, not an exception. */
export interface ProcessResult {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
  /** Set when the process was stopped because it outlived the time limit it was given. */
  readonly timedOut?: true;
  /** Set when the process was stopped because its output reached the port's bound (bug-011). */
  readonly outputBounded?: true;
}

/** REQ-ARC-04: every external program is called through this port, so tests replace it with a fake. */
export interface ProcessPort {
  run(
    command: string,
    args: readonly string[],
    options?: {
      cwd?: string;
      env?: Readonly<Record<string, string | undefined>>;
      /** Stop the process after this many milliseconds, and say so in the result. */
      timeoutMs?: number;
    },
  ): Promise<ProcessResult>;
}

/**
 * The bound on what a process may write to each of stdout and stderr: 256 MiB (bug-011). Node's own default
 * is 1 MiB, which a long step of the agent passes. It stays below the longest string V8 can build, since the
 * output is decoded whole.
 */
export const MAX_OUTPUT_BYTES = 256 * 1024 * 1024;

/** The code Node gives the error of a process whose output passed `maxBuffer`. */
const OUTPUT_BOUND_REACHED = 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER';

/** A port that really starts processes, with the output bound it is given (the tests give a small one). */
export function createSystemProcess(options: { maxOutputBytes?: number } = {}): ProcessPort {
  const maxOutputBytes = options.maxOutputBytes ?? MAX_OUTPUT_BYTES;
  return {
    run(command, args, runOptions) {
      return new Promise((resolve) => {
        const environment = runOptions?.env ? withEnvironment(runOptions.env) : process.env;
        execFile(
          command,
          [...args],
          {
            cwd: runOptions?.cwd,
            env: environment,
            encoding: 'utf8',
            maxBuffer: maxOutputBytes,
            timeout: runOptions?.timeoutMs ?? 0,
            // A bound, not a request: a process that ignores SIGTERM would otherwise outlive its limit.
            killSignal: 'SIGKILL',
          },
          (error, stdout, stderr) => {
            // Node stops a process whose output reaches the bound, and marks it `killed` as it does a timeout:
            // it is told apart by its code, and said, so that a cut output is never read as a bad one.
            if ((error as { code?: unknown } | null)?.code === OUTPUT_BOUND_REACHED) {
              const note = `output bound of ${String(maxOutputBytes)} bytes reached`;
              resolve({ code: 1, stdout, stderr: stderr ? `${stderr}\n${note}` : note, outputBounded: true });
              return;
            }
            const code = error && typeof error.code === 'number' ? error.code : error ? 1 : 0;
            // `killed` is set only when Node itself stopped the process, which with no other kill in
            // this port means the time limit ran out; a process killed by anyone else is not a timeout.
            const timedOut = runOptions?.timeoutMs !== undefined && error?.killed === true;
            resolve({ code, stdout, stderr, ...(timedOut ? { timedOut } : {}) });
          },
        );
      });
    },
  };
}

/** The port that really starts processes. */
export const systemProcess: ProcessPort = createSystemProcess();

/**
 * The process environment with `changes` applied: a value replaces the host's, and `undefined`
 * removes the variable. Removing matters for variables git reads, such as `GIT_DIR`: an empty value
 * is not the same as an absent one, and git refuses an empty `GIT_DIR`.
 */
function withEnvironment(changes: Readonly<Record<string, string | undefined>>): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = { ...process.env };
  for (const [name, value] of Object.entries(changes)) {
    if (value === undefined) Reflect.deleteProperty(environment, name);
    else environment[name] = value;
  }
  return environment;
}

/** What a thrown value says, whether or not it is an `Error`. */
export function reasonOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** The error a port raises when its command fails: what ran, and what it said. */
export function processFailure(command: string, args: readonly string[], result: ProcessResult): Error {
  const what = [command, ...args].join(' ');
  return new Error(
    `${what} failed with code ${result.code}:\n${result.stderr.trim() || result.stdout.trim()}`,
  );
}
