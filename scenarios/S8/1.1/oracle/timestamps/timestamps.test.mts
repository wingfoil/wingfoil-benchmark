// S8's hidden tests for step 2, scored from step 2 on: when a task was created and last changed (M-Q1).
// The times are real ones: each is checked against the clock of the test itself. The code under test is
// imported inside each test.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

/** A task as the list returns it; the fields later steps add are optional here. */
interface TaskView {
  readonly id?: string;
  readonly title: string;
  readonly priority: string;
  readonly tags: readonly string[];
  readonly status: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}

/** What the list's methods return: the seed's result shape. */
interface Outcome {
  readonly ok: boolean;
  readonly value?: TaskView;
  readonly error?: { readonly message?: string };
}

/** The task list's public API, as far as these tests use it. */
interface TaskList {
  add(input: { title: string; priority?: string; tags?: string[] }): Outcome;
  get(id: string): Outcome;
  find(key: string): Outcome;
  complete(key: string): Outcome;
  reopen(key: string): Outcome;
  rename(key: string, title: string): Outcome;
  tag(key: string, tag: string): Outcome;
  untag(key: string, tag: string): Outcome;
  remove(key: string): Outcome;
  list(filter?: { status?: string; priority?: string; tag?: string }): TaskView[];
  openCount(): number;
}

/** The list of the snapshot under test, through its public API. */
async function newList(): Promise<TaskList> {
  const { createTodoList } = (await import('../../seed/src/index.js')) as { createTodoList: () => TaskList };
  return createTodoList();
}

/** The value of a successful result; the test fails on anything else. */
function valueOf(result: Outcome): TaskView {
  assert.equal(result?.ok, true, JSON.stringify(result));
  return result.value as TaskView;
}

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;
const pause = () => new Promise((resolve) => setTimeout(resolve, 25));

describe('timestamps', () => {
  it('gives an added task equal createdAt and updatedAt, ISO-8601 date-times of now', async () => {
    const before = Date.now();
    const task = valueOf((await newList()).add({ title: 'Buy stamps' }));
    const after = Date.now();
    assert.match(task.createdAt, ISO);
    assert.equal(task.updatedAt, task.createdAt);
    const at = Date.parse(task.createdAt);
    assert.ok(at >= before - 1000 && at <= after + 1000, `${task.createdAt} is not now`);
  });

  it('moves updatedAt on every kind of change, and keeps createdAt', async () => {
    const list = await newList();
    let task = valueOf(list.add({ title: 'Clean windows' }));
    const created = task.createdAt;
    const changes = [
      () => list.complete(task.id ?? 'Clean windows'),
      () => list.reopen(task.id ?? 'Clean windows'),
      () => list.rename(task.id ?? 'Clean windows', 'Clean the windows'),
      () => list.tag(task.id ?? 'Clean the windows', 'spring'),
      () => list.untag(task.id ?? 'Clean the windows', 'spring'),
    ];
    for (const change of changes) {
      await pause();
      const before = task.updatedAt;
      task = valueOf(change());
      assert.match(task.updatedAt, ISO);
      assert.ok(Date.parse(task.updatedAt) > Date.parse(before), `${task.updatedAt} is not after ${before}`);
      assert.equal(task.createdAt, created);
    }
  });

  it('shows the same times when the task is read back', async () => {
    const list = await newList();
    const task = valueOf(list.add({ title: 'Renew passport' }));
    const read = valueOf(list.find('Renew passport'));
    assert.match(read.createdAt, ISO);
    assert.deepEqual([read.createdAt, read.updatedAt], [task.createdAt, task.updatedAt]);
  });
});
