import type { TaskList } from './list.ts';
import type { Priority } from './task.ts';

/** A line of a bulk import that was not added, and why: `line` counts from 1. */
export interface RejectedLine {
  readonly line: number;
  readonly reason: string;
}

/** What a bulk import did: how many tasks it added, and the lines it could not add. */
export interface ImportReport {
  readonly imported: number;
  readonly rejected: readonly RejectedLine[];
}

/**
 * Adds to `list` one task per line of `text`, written `title;priority;tags`: an empty priority is a
 * normal one, and tags are separated by spaces. Blank lines are skipped. A line the list refuses is
 * reported with the list's reason, and the others are still added.
 *
 * @param list - the list to add the tasks to
 * @param text - the lines to import
 */
export function importLines(list: TaskList, text: string): ImportReport {
  let imported = 0;
  const rejected: RejectedLine[] = [];
  text.split(/\r?\n/).forEach((raw, index) => {
    if (raw.trim() === '') return;
    const [title = '', priority = '', tags = ''] = raw.split(';');
    const added = list.add({
      title,
      ...(priority.trim() === '' ? {} : { priority: priority.trim() as Priority }),
      tags: tags.split(' ').filter((tag) => tag !== ''),
    });
    if (added.ok) imported += 1;
    else rejected.push({ line: index + 1, reason: added.error.message });
  });
  return { imported, rejected };
}
