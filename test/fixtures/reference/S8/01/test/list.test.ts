import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createTodoList, summarize } from '../src/index.ts';

function valueOf<T>(result: { ok: true; value: T } | { ok: false; error: unknown }): T {
  if (!result.ok) assert.fail(JSON.stringify(result.error));
  return result.value;
}

describe('task list', () => {
  it('adds an open task with a normal priority by default', () => {
    const list = createTodoList();
    const task = valueOf(list.add({ title: '  Buy milk ' }));
    const { title, priority, tags, status } = task;
    assert.deepEqual({ title, priority, tags, status }, { title: 'Buy milk', priority: 'normal', tags: [], status: 'open' });
    assert.equal(typeof task.id, 'string');
    assert.equal(list.openCount(), 1);
  });

  it('refuses a second task with the same title', () => {
    const list = createTodoList();
    list.add({ title: 'Call the plumber' });
    const again = list.add({ title: 'Call the plumber' });
    assert.equal(again.ok, false);
    if (!again.ok) assert.equal(again.error.code, 'duplicate');
  });

  it('completes a task once, and reopens it', () => {
    const list = createTodoList();
    list.add({ title: 'Water the plants' });
    assert.equal(valueOf(list.complete('Water the plants')).status, 'done');
    assert.equal(list.complete('Water the plants').ok, false);
    assert.equal(valueOf(list.reopen('Water the plants')).status, 'open');
  });

  it('lists open tasks first, the most urgent first', () => {
    const list = createTodoList();
    list.add({ title: 'b', priority: 'low' });
    list.add({ title: 'a', priority: 'high' });
    list.add({ title: 'c' });
    list.complete('a');
    assert.deepEqual(
      list.list().map((task) => task.title),
      ['c', 'b', 'a'],
    );
  });

  it('filters by tag, and keeps each tag once', () => {
    const list = createTodoList();
    list.add({ title: 'Paint the fence', tags: ['garden', 'garden'] });
    list.add({ title: 'Fix the tap' });
    list.tag('Fix the tap', 'house');
    assert.deepEqual(
      list.list({ tag: 'garden' }).map((task) => task.tags),
      [['garden']],
    );
  });

  it('summarizes what is left, by priority and by tag', () => {
    const list = createTodoList();
    list.add({ title: 'x', priority: 'high', tags: ['work'] });
    list.add({ title: 'y', tags: ['work', 'home'] });
    list.add({ title: 'z', tags: ['home'] });
    list.complete('z');
    const summary = summarize(list.list());
    assert.deepEqual(summary.openByPriority, { low: 0, normal: 1, high: 1 });
    assert.deepEqual(summary.openByTag, [
      { tag: 'work', open: 2 },
      { tag: 'home', open: 1 },
    ]);
    assert.deepEqual([summary.open, summary.done], [2, 1]);
  });
});
