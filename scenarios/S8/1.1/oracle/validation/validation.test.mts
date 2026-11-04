// S8's hidden tests for step 3, scored from step 3 on: invalid input is refused with an error that says
// what is wrong, and nothing changes. Whether it is returned or thrown is R4's to measure (M-E1), not
// these tests': both count as refused here. The code under test is imported inside each test.
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

const LONG = 'x'.repeat(121);

describe('rejected input', () => {
  it('refuses an empty or blank title, saying the title is wrong, and adds nothing', async () => {
    const list = await newList();
    for (const title of ['', '   ']) {
      assert.match(refused(() => list.add({ title })) ?? '', /title/i);
    }
    assert.equal(list.list().length, 0);
  });

  it('refuses a title of more than 120 characters, and accepts a short one', async () => {
    const list = await newList();
    assert.match(refused(() => list.add({ title: LONG })) ?? '', /title/i);
    valueOf(list.add({ title: 'x'.repeat(30) }));
    assert.equal(list.list().length, 1);
  });

  it('refuses a priority other than low, normal and high, saying the priority is wrong', async () => {
    const list = await newList();
    assert.match(refused(() => list.add({ title: 'Pay rent', priority: 'urgent' })) ?? '', /priorit/i);
    assert.equal(list.list().length, 0);
  });

  it('refuses a tag that is empty or has a space, when adding a task or tagging it', async () => {
    const list = await newList();
    assert.match(refused(() => list.add({ title: 'Pick up parcel', tags: ['post office'] })) ?? '', /tag/i);
    assert.match(refused(() => list.add({ title: 'Pick up parcel', tags: [''] })) ?? '', /tag/i);
    assert.equal(list.list().length, 0);
    list.add({ title: 'Pick up parcel' });
    assert.match(refused(() => list.tag('Pick up parcel', 'two words')) ?? '', /tag/i);
    assert.deepEqual(valueOf(list.find('Pick up parcel')).tags, []);
  });

  it('refuses a rename to a blank or too long title, and keeps the old one', async () => {
    const list = await newList();
    list.add({ title: 'Oil the hinges' });
    assert.match(refused(() => list.rename('Oil the hinges', '  ')) ?? '', /title/i);
    assert.match(refused(() => list.rename('Oil the hinges', LONG)) ?? '', /title/i);
    assert.equal(valueOf(list.find('Oil the hinges')).title, 'Oil the hinges');
  });
});
