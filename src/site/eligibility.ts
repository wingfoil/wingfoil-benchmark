import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { loadRegister } from '../campaign/index.js';
import { ELIGIBILITY_CRITERIA, fail, ok, REGISTER_FILE } from '../core/index.js';
import type { Register, Result } from '../core/index.js';

import { renderMarkdown } from './markdown.js';
import type { SiteModel } from './model.js';
import { eligibilityShell, escapeHtml } from './render.js';

/** Where the published criteria are versioned, in the repository (REQ-RES-09). */
export const ELIGIBILITY_FILE = 'site-content/eligibility.md';

const e = escapeHtml;

/**
 * The register as the page shows it: one row per assessed tool and version, WingFoil included — each criterion's
 * result, its verdict and its reason — then each entry's evidence, criterion by criterion. No date: the landing page
 * of `site/` is the only page that holds one (REQ-RES-02); an assessment's date stays in the register.
 */
export function registerHtml(register: Register): string {
  const head =
    '<tr><th scope="col">Tool</th><th scope="col">Version</th>' +
    ELIGIBILITY_CRITERIA.map((id) => `<th scope="col">${e(id)}</th>`).join('') +
    '<th scope="col">Verdict</th><th scope="col">Reason</th></tr>';
  const rows = register.entries
    .map(
      (entry) =>
        `<tr><th scope="row">${e(entry.tool)}</th><td>${e(entry.version)}</td>` +
        ELIGIBILITY_CRITERIA.map((id) => {
          const result = entry.criteria[id].result;
          return `<td class="${result}">${result}</td>`;
        }).join('') +
        `<td class="verdict ${entry.verdict}">${entry.verdict}</td><td>${e(entry.reason)}</td></tr>\n`,
    )
    .join('');
  const evidence = register.entries
    .map(
      (entry) =>
        `<h3>${e(entry.tool)} ${e(entry.version)}</h3>\n<ul>\n` +
        ELIGIBILITY_CRITERIA.map(
          (id) =>
            `<li><strong>${e(id)}</strong>: ${entry.criteria[id].result} — ${e(entry.criteria[id].evidence)}</li>\n`,
        ).join('') +
        '</ul>\n',
    )
    .join('');
  return (
    `<div class="scroll">\n<table class="eligibility">\n<thead>${head}</thead>\n<tbody>\n${rows}</tbody>\n` +
    `</table>\n</div>\n${evidence}`
  );
}

/**
 * The eligibility page (REQ-RES-09, F7.4): `site-content/eligibility.md`, the published criteria, with the register
 * rendered where it says `<!-- register -->`. Refused when either is missing or the register is invalid: a site that
 * compares tools says by which rule they were admitted.
 */
export function eligibilityPage(root: string, model: SiteModel): Result<string> {
  if (!existsSync(join(root, ELIGIBILITY_FILE)))
    return fail([{ path: ELIGIBILITY_FILE, message: 'not found: the eligibility page has no text' }]);
  const register = loadRegister(root);
  if (!register.ok) return register;
  if (register.value === undefined)
    return fail([{ path: REGISTER_FILE, message: 'not found: the eligibility page lists the register' }]);
  const text = readFileSync(join(root, ELIGIBILITY_FILE), 'utf8');
  const rendered = renderMarkdown(text, { blocks: { register: registerHtml(register.value) } });
  return ok(eligibilityShell(model, rendered.html));
}
