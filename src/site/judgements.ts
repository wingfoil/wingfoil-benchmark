import type { Judgement } from '../results/index.js';

import { escapeHtml, page } from './render.js';

const e = escapeHtml;

/** The page of an execution's judgements (REQ-SCO-06 as amended in 1.49, task-128), beside its landing page. */
export const JUDGEMENTS_PAGE = 'judgements.html';

/** How many judgements an execution has, and how many disagree with the automatic verdict. */
export interface JudgementCount {
  readonly judged: number;
  readonly disagreements: number;
}

export function judgementCount(judgements: readonly Judgement[]): JudgementCount {
  return {
    judged: judgements.length,
    disagreements: judgements.filter((judgement) => judgement.verdict !== judgement.automatic).length,
  };
}

/** The count as the landing page links it: "3 judgements, 1 disagreement with the automatic verdict". */
export function judgementSummary({ judged, disagreements }: JudgementCount): string {
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
  return `${plural(judged, 'judgement')}, ${plural(disagreements, 'disagreement')} with the automatic verdict`;
}

/**
 * The maintainer's judgement of each v2 content check at each step of each run, beside the automatic verdict
 * (REQ-SCO-06 as amended in 1.49, task-128), in the file's order, a disagreement marked; the count above the table.
 */
export function judgementsPage(heading: string, judgements: readonly Judgement[]): string {
  const rows = judgements
    .map((judgement) => {
      const agree = judgement.verdict === judgement.automatic;
      return (
        `<tr${agree ? '' : ' class="disagreement"'}><td>${e(judgement.run)}</td><td>${e(judgement.check)}</td>` +
        `<td>${judgement.step}</td><td>${judgement.automatic}</td><td>${judgement.verdict}</td>` +
        `<td>${agree ? 'agree' : 'disagree'}</td><td>${e(judgement.note ?? '')}</td></tr>\n`
      );
    })
    .join('');
  return page(
    `${heading} — the maintainer's judgements`,
    `<p><a href="index.html">← ${e(heading)}</a></p>\n<h1>The maintainer's judgements</h1>\n` +
      "<p>Each v2 content check, at each step of each run, judged by the maintainer against the scenario's rubric " +
      '(<code>oracle/rubric.md</code>), beside the automatic verdict.</p>\n' +
      `<p class="judgement-count">${e(judgementSummary(judgementCount(judgements)))}.</p>\n` +
      '<table>\n<thead><tr><th>Run</th><th>Check</th><th>Step</th><th>Automatic</th><th>Maintainer</th>' +
      '<th>Agreement</th><th>Note</th></tr></thead>\n' +
      `<tbody>\n${rows}</tbody>\n</table>\n`,
    2,
  );
}
