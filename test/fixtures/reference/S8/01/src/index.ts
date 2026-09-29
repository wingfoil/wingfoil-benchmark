import { createTaskList } from './domain/list.ts';
import type { TaskList } from './domain/list.ts';

export type { TaskFilter, TaskList } from './domain/list.ts';
export type { Result, TodoError, TodoErrorCode } from './domain/result.ts';
export { summarize } from './domain/summary.ts';
export type { Summary } from './domain/summary.ts';
export { PRIORITIES } from './domain/task.ts';
export type { NewTask, Priority, Status, Task } from './domain/task.ts';

/**
 * A new, empty task list for the app, kept in memory.
 */
export function createTodoList(): TaskList {
  return createTaskList();
}
