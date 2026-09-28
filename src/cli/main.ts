#!/usr/bin/env node
import { createInterface } from 'node:readline/promises';

import { main } from './index.js';

/** One question on the terminal, answered by one line (task-023); only when stdin is a terminal. */
async function ask(question: string): Promise<string> {
  const terminal = createInterface({ input: process.stdin, output: process.stderr });
  try {
    return await terminal.question(question);
  } finally {
    terminal.close();
  }
}

process.exitCode = await main(process.argv.slice(2), {
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text),
  ...(process.stdin.isTTY ? { ask } : {}),
});
