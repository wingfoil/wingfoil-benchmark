import { Document, Scalar } from 'yaml';

import { developerRules } from './constitution.js';

/**
 * OpenSpec's project configuration from a scenario's project rules (REQ-FMT-14, task-071). The rules stay declared once,
 * in the scenario, as the wingfoil arm's directives (dl-005); this generator renders the same ones the constitution and
 * baseline-docs do — those the developer role reads — into OpenSpec 1.14.0's own place for them, `openspec/config.yaml`'s
 * `context:` ("constraints that should guide OpenSpec artifacts and workflows", task-070), beside the `schema:` its init
 * writes. The context is Markdown, one section per rule, its title the directive's and its body unchanged but for a
 * leading heading repeating the title and the levels of the headings below it; the YAML is written by the `yaml`
 * library, as a block, so no quoting is by hand. Deterministic, and outside the scenario's content hash.
 */

/** The schema OpenSpec 1.14.0's init writes, kept: the generator replaces the file init leaves. */
const SCHEMA = 'spec-driven';

/** `openspec/config.yaml` for the scenario configuration `files` (path → text), or `undefined` when it declares no rule. */
export function renderOpenSpecConfig(files: ReadonlyMap<string, string>): string | undefined {
  const rules = developerRules(files);
  if (rules.length === 0) return undefined;
  const context = [
    "The project's rules. Every change follows them.",
    '',
    ...rules.flatMap(({ title, body }) => [`## ${title}`, '', ...(body === '' ? [] : [body, ''])]),
  ]
    .join('\n')
    .replace(/[ \t]+$/gm, '');
  const doc = new Document({ schema: SCHEMA, context });
  const node = doc.get('context', true);
  if (node instanceof Scalar) node.type = Scalar.BLOCK_LITERAL;
  return doc.toString({ lineWidth: 0 });
}
