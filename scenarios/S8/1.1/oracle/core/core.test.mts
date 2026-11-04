// S8's hidden tests for the seed's own behaviour, scored after every step: what the task list already
// did must keep working while features are added (M-Q1). They pass on the seed on purpose. The code
// under test is imported inside each test (adr-004 decision 10).
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

describe('existing behaviour', () => {
  it('adds an open task, normal unless a priority is given, with its tags each once', async () => {
    const list = await newList();
    const task = valueOf(list.add({ title: '  Mop the kitchen ', tags: ['home', 'home'] }));
    assert.deepEqual([task.title, task.priority, task.tags, task.status], ['Mop the kitchen', 'normal', ['home'], 'open']);
    assert.equal(valueOf(list.add({ title: 'Book flights', priority: 'high' })).priority, 'high');
    assert.equal(list.openCount(), 2);
  });

  it('refuses a second task with a title already in the list', async () => {
    const list = await newList();
    list.add({ title: 'Feed the cat' });
    assert.notEqual(refused(() => list.add({ title: 'Feed the cat' })), undefined);
    assert.equal(list.list().length, 1);
  });

  it('marks a task done once, and opens it again', async () => {
    const list = await newList();
    list.add({ title: 'Sort the mail' });
    assert.equal(valueOf(list.complete('Sort the mail')).status, 'done');
    assert.notEqual(refused(() => list.complete('Sort the mail')), undefined);
    assert.equal(valueOf(list.reopen('Sort the mail')).status, 'open');
  });

  it('finds, renames and removes a task by its title', async () => {
    const list = await newList();
    list.add({ title: 'Fix bike' });
    assert.equal(valueOf(list.find('Fix bike')).title, 'Fix bike');
    assert.equal(valueOf(list.rename('Fix bike', 'Fix the bike')).title, 'Fix the bike');
    assert.notEqual(refused(() => list.find('Fix bike')), undefined);
    valueOf(list.remove('Fix the bike'));
    assert.equal(list.list().length, 0);
  });

  it('tags and untags a task', async () => {
    const list = await newList();
    list.add({ title: 'Plan the trip' });
    list.tag('Plan the trip', 'travel');
    assert.deepEqual(valueOf(list.find('Plan the trip')).tags, ['travel']);
    list.untag('Plan the trip', 'travel');
    assert.deepEqual(valueOf(list.find('Plan the trip')).tags, []);
  });

  it('lists open tasks first, the most urgent first, then by title, and filters them', async () => {
    const list = await newList();
    list.add({ title: 'q', priority: 'low', tags: ['x'] });
    list.add({ title: 'p', priority: 'high' });
    list.add({ title: 'r', tags: ['x'] });
    list.add({ title: 's', priority: 'high' });
    list.complete('p');
    assert.deepEqual(list.list().map((task) => task.title), ['s', 'r', 'q', 'p']);
    assert.deepEqual(list.list({ tag: 'x' }).map((task) => task.title), ['r', 'q']);
    assert.deepEqual(list.list({ status: 'done' }).map((task) => task.title), ['p']);
  });
});
