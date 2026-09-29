import { importLines } from './domain/import.ts';
import type { ImportReport } from './domain/import.ts';
import { createTaskList } from './domain/list.ts';
import type { TaskList } from './domain/list.ts';

export type { ImportReport, RejectedLine } from './domain/import.ts';
export type { TaskFilter, TaskList } from './domain/list.ts';
export type { Result, TodoError, TodoErrorCode } from './domain/result.ts';
export { summarize } from './domain/summary.ts';
export type { Summary } from './domain/summary.ts';
export { PRIORITIES } from './domain/task.ts';
export type { NewTask, Priority, Status, Task } from './domain/task.ts';

/**
 * A new, empty task list for the app, kept in memory.
 * The list takes the time of every change from here: the domain reads no clock of its own.
 */
export function createTodoList(): TaskList {
  return createTaskList({ now: () => new Date().toISOString() });
}

/**
 * Imports tasks into `list`, one per line of `text`, written `title;priority;tags`. Blank lines are
 * skipped; a line that cannot be added is reported with its number and the reason, and the others are
 * still added.
 *
 * @param list - the list to add the tasks to
 * @param text - the lines to import
 */
export function importTasks(list: TaskList, text: string): ImportReport {
  return importLines(list, text);
}
