import { err, ok } from './result.ts';
import type { Result } from './result.ts';
import { addTag, compareTasks, completeTask, createTask, removeTag, renameTask, reopenTask } from './task.ts';
import type { NewTask, Priority, Status, Task } from './task.ts';

/** Which tasks to show: by status, priority or tag; every task when nothing is given. */
export interface TaskFilter {
  readonly status?: Status;
  readonly priority?: Priority;
  readonly tag?: string;
}

/** The task list: tasks by title, each title once. Every change returns the task as it now is. */
export interface TaskList {
  add(input: NewTask): Result<Task>;
  find(title: string): Result<Task>;
  complete(title: string): Result<Task>;
  reopen(title: string): Result<Task>;
  rename(title: string, newTitle: string): Result<Task>;
  tag(title: string, tag: string): Result<Task>;
  untag(title: string, tag: string): Result<Task>;
  remove(title: string): Result<Task>;
  list(filter?: TaskFilter): readonly Task[];
  openCount(): number;
}

/** A new, empty task list, kept in memory. */
export function createTaskList(): TaskList {
  const tasks = new Map<string, Task>();

  const find = (title: string): Result<Task> => {
    const task = tasks.get(title.trim());
    return task === undefined ? err('not-found', `there is no task "${title.trim()}"`) : ok(task);
  };

  const store = (before: Task, after: Task): Result<Task> => {
    tasks.delete(before.title);
    tasks.set(after.title, after);
    return ok(after);
  };

  const change = (title: string, update: (task: Task) => Result<Task>): Result<Task> => {
    const found = find(title);
    if (!found.ok) return found;
    const updated = update(found.value);
    return updated.ok ? store(found.value, updated.value) : updated;
  };

  return {
    add(input) {
      const task = createTask(input);
      if (tasks.has(task.title)) return err('duplicate', `there is already a task "${task.title}"`);
      tasks.set(task.title, task);
      return ok(task);
    },
    find,
    complete: (title) => change(title, completeTask),
    reopen: (title) => change(title, reopenTask),
    rename(title, newTitle) {
      const target = newTitle.trim();
      if (target !== title.trim() && tasks.has(target)) {
        return err('duplicate', `there is already a task "${target}"`);
      }
      return change(title, (task) => ok(renameTask(task, target)));
    },
    tag: (title, tag) => change(title, (task) => ok(addTag(task, tag))),
    untag: (title, tag) => change(title, (task) => ok(removeTag(task, tag))),
    remove(title) {
      const found = find(title);
      if (found.ok) tasks.delete(found.value.title);
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
