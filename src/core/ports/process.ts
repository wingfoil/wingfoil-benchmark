import { execFile, spawn } from 'node:child_process';
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
      /**
       * Start it in a process group of its own (bug-032, task-130): the terminal's interrupt then reaches the caller
       * alone, which ends the process itself (REQ-RUN-19), instead of the process dying first.
       */
      ownProcessGroup?: boolean;
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
      if (runOptions?.ownProcessGroup === true)
        return runInOwnGroup(command, args, runOptions, maxOutputBytes);
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
            // Node stops a process whose output reaches the bound and gives its error this code (not `killed`):
            // it is said, so that a cut output is never read as a bad one.
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

/**
 * A process in a process group of its own (bug-032, task-130): `execFile` ignores `detached`, so `spawn` runs it, with
 * the same bound on each output, the same time limit and the same result as {@link createSystemProcess}'s.
 */
function runInOwnGroup(
  command: string,
  args: readonly string[],
  runOptions: { cwd?: string; env?: Readonly<Record<string, string | undefined>>; timeoutMs?: number },
  maxOutputBytes: number,
): Promise<ProcessResult> {
  return new Promise((resolve) => {
    const child = spawn(command, [...args], {
      cwd: runOptions.cwd,
      env: runOptions.env ? withEnvironment(runOptions.env) : process.env,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    const size = { out: 0, err: 0 };
    let bounded = false;
    let timedOut = false;
    const collect = (chunks: Buffer[], key: 'out' | 'err') => (chunk: Buffer) => {
      size[key] += chunk.length;
      if (size[key] > maxOutputBytes) {
        bounded = true;
        child.kill('SIGKILL');
        return;
      }
      chunks.push(chunk);
    };
    child.stdout.on('data', collect(out, 'out'));
    child.stderr.on('data', collect(err, 'err'));
    const timer =
      runOptions.timeoutMs === undefined || runOptions.timeoutMs === 0
        ? undefined
        : setTimeout(() => {
            timedOut = true;
            child.kill('SIGKILL');
          }, runOptions.timeoutMs);
    const settle = (code: number) => {
      if (timer !== undefined) clearTimeout(timer);
      const stdout = Buffer.concat(out).toString('utf8');
      const stderr = Buffer.concat(err).toString('utf8');
      if (bounded) {
        const note = `output bound of ${String(maxOutputBytes)} bytes reached`;
        resolve({ code: 1, stdout, stderr: stderr ? `${stderr}\n${note}` : note, outputBounded: true });
        return;
      }
      resolve({ code, stdout, stderr, ...(timedOut ? { timedOut: true as const } : {}) });
    };
    // A process that cannot start (no such program) ends as one that failed; `close` may follow, and finds it settled.
    child.on('error', () => settle(1));
    child.on('close', (code) => settle(code ?? 1));
  });
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

/** The most of a failed command's output an error message quotes: its end, where the bound's note is. */
const QUOTED_OUTPUT_CHARS = 4096;

/** The error a port raises when its command fails: what ran, and what it said (its end, when it said a lot). */
export function processFailure(command: string, args: readonly string[], result: ProcessResult): Error {
  const what = [command, ...args].join(' ');
  const said = result.stderr.trim() || result.stdout.trim();
  const quoted = said.length > QUOTED_OUTPUT_CHARS ? `…${said.slice(-QUOTED_OUTPUT_CHARS)}` : said;
  return new Error(`${what} failed with code ${result.code}:\n${quoted}`);
}
