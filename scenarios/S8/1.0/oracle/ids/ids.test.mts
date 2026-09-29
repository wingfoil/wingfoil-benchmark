// S8's hidden tests for step 1, scored from step 1 on: every task has a unique id, found by `get`, and
// usable wherever a title is (M-Q1). The code under test is imported inside each test.
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

/**
 * Whether `call` was refused, and what it said: a returned failed result or a thrown error both count
 * (R4 is M-E1's to measure, not M-Q1's); nothing when it was accepted.
 */
function refused(call: () => Outcome): string | undefined {
  try {
    const result = call();
    return result?.ok === false ? String(result.error?.message ?? 'refused') : undefined;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

describe('identifiers', () => {
  it('gives every task a string id that no other task of the list has', async () => {
    const list = await newList();
    const ids = ['a', 'b', 'c', 'd', 'e'].map((title) => valueOf(list.add({ title })).id);
    for (const id of ids) assert.equal(typeof id, 'string');
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(ids.every((id) => id.length > 0));
  });

  it('returns the task with a given id', async () => {
    const list = await newList();
    const task = valueOf(list.add({ title: 'Return the books' }));
    assert.equal(valueOf(list.get(task.id)).title, 'Return the books');
  });

  it('refuses an id no task has', async () => {
    const list = await newList();
    const task = valueOf(list.add({ title: 'Walk the dog' }));
    // Only once `get` works: a call to a missing method throws, and must not pass for a refusal.
    assert.equal(valueOf(list.get(task.id)).title, 'Walk the dog');
    assert.notEqual(refused(() => list.get('no task has this id')), undefined);
  });

  it('keeps the id when the task is renamed, and finds it by that id', async () => {
    const list = await newList();
    const { id } = valueOf(list.add({ title: 'Wash car' }));
    assert.equal(valueOf(list.rename(id, 'Wash the car')).id, id);
    assert.equal(valueOf(list.get(id)).title, 'Wash the car');
  });

  it('accepts the id wherever a title is accepted', async () => {
    const list = await newList();
    const { id } = valueOf(list.add({ title: 'Call grandma' }));
    assert.equal(valueOf(list.find(id)).id, id);
    assert.equal(valueOf(list.complete(id)).status, 'done');
    assert.equal(valueOf(list.reopen(id)).status, 'open');
    assert.deepEqual(valueOf(list.tag(id, 'family')).tags, ['family']);
    assert.deepEqual(valueOf(list.untag(id, 'family')).tags, []);
    valueOf(list.remove(id));
    assert.equal(list.list().length, 0);
  });
});
