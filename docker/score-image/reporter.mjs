// The benchmark's node:test reporter (task-027, adr-004), run in the scoring image. It writes one JSON
// line per hidden-test result and per test file that failed as a whole, and nothing else: no
// durations, no messages, no line numbers, so that its output depends only on what passed and failed
// (REQ-SCO-03). Paths are relative to the working directory, /score.
//
//   {"kind":"test","file":"oracle/public/cancel.test.ts","path":["cancelling","marks …"],"status":"pass"}
//   {"kind":"file","file":"oracle/public/cancel.test.ts","status":"fail"}
//
// `status` is pass, fail, skip or todo. A `describe` is not a hidden test and is not written. A file
// that fails to load, or whose process is killed at its timeout, reports a failure no `test:start`
// announced: that is the `file` line.
import { relative } from 'node:path';

export default async function* reporter(source) {
  // The names of the tests started and not yet finished, per file, by nesting level.
  const stacks = new Map();
  const stackOf = (file) => {
    if (!stacks.has(file)) stacks.set(file, []);
    return stacks.get(file);
  };
  for await (const event of source) {
    const data = event.data;
    if (data === undefined || typeof data.file !== 'string') continue;
    const file = relative(process.cwd(), data.file);
    const stack = stackOf(file);
    if (event.type === 'test:start') {
      stack.length = data.nesting;
      stack.push(data.name);
      continue;
    }
    if (event.type !== 'test:pass' && event.type !== 'test:fail') continue;
    const announced = stack.length > data.nesting && stack[data.nesting] === data.name;
    if (!announced) {
      if (event.type === 'test:fail') yield `${JSON.stringify({ kind: 'file', file, status: 'fail' })}\n`;
      continue;
    }
    const path = stack.slice(0, data.nesting + 1);
    stack.length = data.nesting;
    if (data.details?.type === 'suite') continue;
    const status = data.todo ? 'todo' : data.skip ? 'skip' : event.type === 'test:pass' ? 'pass' : 'fail';
    yield `${JSON.stringify({ kind: 'test', file, path, status })}\n`;
  }
}
