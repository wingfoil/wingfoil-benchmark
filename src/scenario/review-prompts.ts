import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Issue, ReviewLoop, Scenario } from '../core/index.js';

import { scanPrompt } from './configuring.js';
import { loadLeakScanDeclarations } from './leak-scan.js';

/**
 * The review loop's two prompts checked before any run (REQ-FMT-01 and REQ-FMT-08 as amended in 1.58, task-148): each
 * file exists under the repository at `root` and has the SHA-256 the campaign or the dry-run profile pins (an issue at
 * `review_loop.prompt` or `review_loop.fixer_prompt`, naming the file); then each is scanned as the configuring prompt
 * is, against every scenario version run, each finding at the prompt's path, once per distinct message. No hold-out:
 * a campaign's check never reads it (REQ-CLI-10).
 */
export function reviewPromptIssues(root: string, loop: ReviewLoop, scenarios: readonly Scenario[]): Issue[] {
  const issues: Issue[] = [];
  const texts: { path: string; text: string }[] = [];
  for (const [key, pin] of [
    ['prompt', loop.prompt],
    ['fixer_prompt', loop.fixer_prompt],
  ] as const) {
    const file = join(root, pin.file);
    if (!existsSync(file)) {
      issues.push({ path: `review_loop.${key}`, message: `${pin.file}: not found` });
      continue;
    }
    const text = readFileSync(file, 'utf8');
    const sha256 = createHash('sha256').update(text).digest('hex');
    if (sha256 !== pin.sha256) {
      issues.push({
        path: `review_loop.${key}`,
        message: `${pin.file}: its SHA-256 is ${sha256}, not the pinned ${pin.sha256}`,
      });
      continue;
    }
    texts.push({ path: pin.file, text });
  }
  if (texts.length === 0 || scenarios.length === 0) return issues;
  const declarations = loadLeakScanDeclarations(join(root, 'scenarios', 'leak-scan.yaml'));
  if (!declarations.ok) return [...issues, ...declarations.issues];
  for (const { path, text } of texts) {
    const seen = new Set<string>();
    for (const scenario of scenarios) {
      for (const found of scanPrompt(path, text, scenario, declarations.value)) {
        // A literal is the version's: named with it; a harness name is the same finding whatever the version.
        const message = found.message.replace(
          /^holds a literal of /,
          `holds a literal of ${scenario.id}@${scenario.version}'s `,
        );
        if (seen.has(message)) continue;
        seen.add(message);
        issues.push({ path: found.path, message });
      }
    }
  }
  return issues;
}
