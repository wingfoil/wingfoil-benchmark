import { PRIORITIES } from './task.ts';
import type { Priority, Task } from './task.ts';

/** What the app's home screen shows about a list: how much is left, by priority and by tag. */
export interface Summary {
  readonly open: number;
  readonly done: number;
  readonly openByPriority: Readonly<Record<Priority, number>>;
  readonly openByTag: readonly { readonly tag: string; readonly open: number }[];
}

/**
 * The summary of `tasks`: open and done counts, the open tasks by priority, and the tags of open tasks
 * with how many each has, the busiest first, then by name.
 *
 * @param tasks - the tasks to summarize
 */
export function summarize(tasks: readonly Task[]): Summary {
  const open = tasks.filter((task) => task.status === 'open');
  const openByPriority = Object.fromEntries(
    PRIORITIES.map((priority) => [priority, open.filter((task) => task.priority === priority).length]),
  ) as Record<Priority, number>;
  const counts = new Map<string, number>();
  for (const task of open) for (const tag of task.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  const openByTag = [...counts]
    .map(([tag, count]) => ({ tag, open: count }))
    .sort((a, b) => b.open - a.open || (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0));
  return { open: open.length, done: tasks.length - open.length, openByPriority, openByTag };
}
