import { err, ok } from './result.ts';
import type { Result } from './result.ts';
import {
  addTag,
  checkNewTask,
  checkTag,
  checkTitle,
  compareTasks,
  completeTask,
  createTask,
  removeTag,
  renameTask,
  reopenTask,
} from './task.ts';
import type { NewTask, Priority, Status, Task } from './task.ts';

/** Which tasks to show: by status, priority or tag; every task when nothing is given. */
export interface TaskFilter {
  readonly status?: Status;
  readonly priority?: Priority;
  readonly tag?: string;
}

/**
 * The task list: each title once, and every task with an id of its own. A task is named by its id or
 * its title. Every change returns the task as it now is.
 */
export interface TaskList {
  add(input: NewTask): Result<Task>;
  get(id: string): Result<Task>;
  find(key: string): Result<Task>;
  complete(key: string): Result<Task>;
  reopen(key: string): Result<Task>;
  rename(key: string, newTitle: string): Result<Task>;
  tag(key: string, tag: string): Result<Task>;
  untag(key: string, tag: string): Result<Task>;
  remove(key: string): Result<Task>;
  list(filter?: TaskFilter): readonly Task[];
  openCount(): number;
}

/** What the list is given by the app: where the time comes from, as ISO-8601 date-times. */
export interface TaskListOptions {
  readonly now: () => string;
}

/**
 * A new, empty task list, kept in memory. Ids are `t-1`, `t-2`… in the order tasks are added, never
 * reused; the time of every change comes from `options.now`, so the list itself reads no clock.
 *
 * @param options - where the list takes the time from
 */
export function createTaskList(options: TaskListOptions): TaskList {
  const tasks = new Map<string, Task>();
  let added = 0;

  const find = (key: string): Result<Task> => {
    const byId = tasks.get(key);
    if (byId !== undefined) return ok(byId);
    const title = key.trim();
    const byTitle = [...tasks.values()].find((task) => task.title === title);
    return byTitle === undefined ? err('not-found', `there is no task "${title}"`) : ok(byTitle);
  };

  const titleTaken = (title: string, except?: string): boolean =>
    [...tasks.values()].some((task) => task.title === title && task.id !== except);

  const change = (key: string, update: (task: Task) => Result<Task>): Result<Task> => {
    const found = find(key);
    if (!found.ok) return found;
    const updated = update(found.value);
    if (!updated.ok) return updated;
    const stored = { ...updated.value, updatedAt: options.now() };
    tasks.set(stored.id, stored);
    return ok(stored);
  };

  return {
    add(input) {
      const checked = checkNewTask(input);
      if (!checked.ok) return checked;
      if (titleTaken(checked.value.title))
        return err('duplicate', `there is already a task "${checked.value.title}"`);
      added += 1;
      const task = createTask(checked.value, `t-${added}`, options.now());
      tasks.set(task.id, task);
      return ok(task);
    },
    get(id) {
      const task = tasks.get(id);
      return task === undefined ? err('not-found', `there is no task with id "${id}"`) : ok(task);
    },
    find,
    complete: (key) => change(key, completeTask),
    reopen: (key) => change(key, reopenTask),
    rename(key, newTitle) {
      const title = checkTitle(newTitle);
      if (!title.ok) return title;
      const target = title.value;
      const found = find(key);
      if (found.ok && titleTaken(target, found.value.id))
        return err('duplicate', `there is already a task "${target}"`);
      return change(key, (task) => ok(renameTask(task, target)));
    },
    tag(key, tag) {
      const checked = checkTag(tag);
      if (!checked.ok) return checked;
      return change(key, (task) => ok(addTag(task, tag)));
    },
    untag: (key, tag) => change(key, (task) => ok(removeTag(task, tag))),
    remove(key) {
      const found = find(key);
      if (found.ok) tasks.delete(found.value.id);
      return found;
    },
    list(filter = {}) {
      return [...tasks.values()]
        .filter((task) => filter.status === undefined || task.status === filter.status)
        .filter((task) => filter.priority === undefined || task.priority === filter.priority)
        .filter((task) => filter.tag === undefined || task.tags.includes(filter.tag))
        .sort(compareTasks);
    },
    openCount() {
      return [...tasks.values()].filter((task) => task.status === 'open').length;
    },
  };
}
