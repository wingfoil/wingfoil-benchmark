// S8's hidden tests for step 4, scored after step 4: the public bulk-import helper (M-Q1). The code
// under test is imported inside each test.
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

/** The value of a successful result; the test fails on anything else. */
function valueOf(result: Outcome): TaskView {
  assert.equal(result?.ok, true, JSON.stringify(result));
  return result.value as TaskView;
}

/** The helper, from the package's entry point, and a new list. */
async function importer() {
  const module = (await import('../../seed/src/index.js')) as {
    createTodoList: () => TaskList;
    importTasks?: (list: TaskList, text: string) => { imported: number; rejected: { line: number; reason: string }[] };
  };
  assert.ok(module.importTasks instanceof Function, 'importTasks is exported');
  return { importTasks: module.importTasks as NonNullable<typeof module.importTasks>, list: module.createTodoList() };
}

describe('importing lines', () => {
  it('adds one task per line, with its priority and its tags', async () => {
    const { importTasks, list } = await importer();
    const report = importTasks(list, 'Sweep the yard;high;garden weekend\nCheck the smoke alarm;low;safety\n');
    assert.deepEqual(report, { imported: 2, rejected: [] });
    const yard = valueOf(list.find('Sweep the yard'));
    assert.deepEqual([yard.priority, yard.tags], ['high', ['garden', 'weekend']]);
    assert.equal(valueOf(list.find('Check the smoke alarm')).priority, 'low');
  });

  it('reads an empty priority as a normal one, and a line with no tags', async () => {
    const { importTasks, list } = await importer();
    assert.deepEqual(importTasks(list, 'Defrost the freezer;;\nDust the shelves;;'), { imported: 2, rejected: [] });
    assert.equal(valueOf(list.find('Defrost the freezer')).priority, 'normal');
    assert.deepEqual(valueOf(list.find('Dust the shelves')).tags, []);
  });

  it('skips blank lines, counting them in the line numbers', async () => {
    const { importTasks, list } = await importer();
    const report = importTasks(list, '\nTidy the garage;;\n   \n;high;\n');
    assert.equal(report.imported, 1);
    assert.deepEqual(report.rejected.map((entry) => entry.line), [4]);
  });

  it('reports each line it cannot add, with a reason, and adds the others', async () => {
    const { importTasks, list } = await importer();
    list.add({ title: 'Buy bread' });
    const report = importTasks(list, 'Buy bread;;\nCall the bank;someday;\nSign the form;;home\n;low;');
    assert.equal(report.imported, 1);
    assert.deepEqual(report.rejected.map((entry) => entry.line), [1, 2, 4]);
    for (const entry of report.rejected) assert.ok(String(entry.reason).length > 0);
    assert.equal(valueOf(list.find('Sign the form')).title, 'Sign the form');
  });
});
