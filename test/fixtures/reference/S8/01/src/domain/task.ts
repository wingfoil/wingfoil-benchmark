import { err, ok } from './result.ts';
import type { Result } from './result.ts';

/** How urgent a task is. */
export type Priority = 'low' | 'normal' | 'high';

/** Every priority, from the least urgent to the most. */
export const PRIORITIES: readonly Priority[] = ['low', 'normal', 'high'];

/** Whether a task still has to be done. */
export type Status = 'open' | 'done';

/** A task of the list. */
export interface Task {
  /** Unique within its list, and kept when the task is renamed. */
  readonly id: string;
  readonly title: string;
  readonly priority: Priority;
  readonly tags: readonly string[];
  readonly status: Status;
}

/** What it takes to add a task: a title, and optionally a priority and tags. */
export interface NewTask {
  readonly title: string;
  readonly priority?: Priority;
  readonly tags?: readonly string[];
}

/**
 * A new open task, with its id. Its priority is `normal` unless given; its tags keep the order given,
 * each once.
 *
 * @param input - the task's title, priority and tags
 * @param id - the task's id
 */
export function createTask(input: NewTask, id: string): Task {
  return {
    id,
    title: input.title.trim(),
    priority: input.priority ?? 'normal',
    tags: unique(input.tags ?? []),
    status: 'open',
  };
}

/**
 * The task, done. A task already done cannot be completed again.
 *
 * @param task - an open task
 */
export function completeTask(task: Task): Result<Task> {
  if (task.status === 'done') return err('invalid-state', `"${task.title}" is already done`);
  return ok({ ...task, status: 'done' });
}

/**
 * The task, open again. Only a task that is done can be reopened.
 *
 * @param task - a task that is done
 */
export function reopenTask(task: Task): Result<Task> {
  if (task.status === 'open') return err('invalid-state', `"${task.title}" is still open`);
  return ok({ ...task, status: 'open' });
}

/**
 * The task under a new title.
 *
 * @param task - the task to rename
 * @param title - its new title
 */
export function renameTask(task: Task, title: string): Task {
  return { ...task, title: title.trim() };
}

/**
 * The task with one more tag; a tag it already has is not added twice.
 *
 * @param task - the task to tag
 * @param tag - the tag to add
 */
export function addTag(task: Task, tag: string): Task {
  return { ...task, tags: unique([...task.tags, tag]) };
}

/**
 * The task without a tag; a tag it does not have changes nothing.
 *
 * @param task - the task to untag
 * @param tag - the tag to remove
 */
export function removeTag(task: Task, tag: string): Task {
  return { ...task, tags: task.tags.filter((existing) => existing !== tag) };
}

/**
 * How urgent a priority is, as a number: the higher, the more urgent.
 *
 * @param priority - the priority to rank
 */
export function rank(priority: Priority): number {
  return PRIORITIES.indexOf(priority);
}

/**
 * The order the app shows tasks in: open before done, then the most urgent first, then by title.
 *
 * @param a - a task
 * @param b - another task
 */
export function compareTasks(a: Task, b: Task): number {
  if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
  if (a.priority !== b.priority) return rank(b.priority) - rank(a.priority);
  return a.title < b.title ? -1 : a.title > b.title ? 1 : 0;
}

function unique(tags: readonly string[]): string[] {
  return tags.filter((tag, index) => tags.indexOf(tag) === index);
}
