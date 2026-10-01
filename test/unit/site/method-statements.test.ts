import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { renderMarkdown } from '../../../src/site/markdown.js';
import { METHOD_FILE } from '../../../src/site/method.js';
import { repoPath } from '../../support/paths.js';

/**
 * Every statement the method page owes, by its anchor in `site-content/method.md`, with where it comes from
 * (task-046, the approver's choice 3): a requirement, an ADR, a decision-log, a task's design, or a wave's
 * "Due before" line in rel-v0-1. A statement removed from the page, or added without a source, fails here.
 */
const STATEMENTS: readonly (readonly [string, string])[] = [
  [
    'method',
    'task-046 Design "The prose" (page purpose); experiment design §1 (object: a harness); 05_journeys J5.4 framing via task-046 Context',
  ],
  ['what-is-compared', 'task-046 Design "The prose" section 1'],
  [
    'harness-not-model',
    'experiment design §1 (object, comparison "with the agent and model fixed"); REQ-RES-03 ("harness, not model"); experiment design §5 T14 (cross-model shown apart)',
  ],
  [
    'arms',
    'experiment design §2 Arms table; REQ-RUN-12 (manual copied as `CLAUDE.md`); task-015 Design (`PROJECT_RULES.md`); arms/baseline-docs/manual.md',
  ],
  [
    'baseline-docs-control',
    'experiment design §2 parity rules and §5 T3; REQ-RUN-11; task-015 Design ("The input is the wingfoil arm’s configuration as the agent meets it", results kept under `generated/`); scenarios/README K3; dl-005 Context',
  ],
  [
    'baseline-docs-table',
    'task-015 Design table "What counts as ’the same information’" (content column paraphrased for a lay reader; rendered/why columns kept); rel-v0-1 W3 Due before',
  ],
  [
    'operating-manuals',
    'experiment design §2 parity rules (operating manuals); REQ-RUN-12; task-014 Design decision 2 (`ceil(UTF-8 bytes ÷ 4)`); rel-v0-1 W3 Due before ("publishes the three manuals"); task-046 Design "The published material"',
  ],
  [
    'identical-prompts',
    'experiment design §2 parity rules (prompts identical, leak scan); REQ-FMT-08; experiment design §5 T4',
  ],
  ['how-a-run-goes', 'task-046 Design "The prose" section 2; experiment design §3'],
  ['campaign-pins', 'experiment design §3.1; REQ-FMT-01 (baseline arm required, T7)'],
  ['run-container', 'experiment design §3.2; REQ-RUN-02; experiment-design decision 4 (internet allowed)'],
  ['setup-phase', 'experiment design §3.3; REQ-RUN-03; REQ-RUN-14'],
  [
    'fresh-sessions',
    'experiment design §3.4; REQ-RUN-05; task-019 Design "Two defences" (auto-memory cleared before every step, every arm)',
  ],
  [
    'neutral-approver',
    'experiment design §3.5 (policy v1, 3 interventions); REQ-RUN-07; experiment design §5 T9 (interventions reported per arm)',
  ],
  [
    'approver-classifier',
    'dl-004 Decision (rules 1–3, preparation, versioning, "what is not the classifier’s business") and Consequences ("will be wrong at the edges", v2 never a quiet edit); REQ-RUN-06',
  ],
  [
    'approver-decision',
    'REQ-RUN-17; rel-v0-1 W2 and W3 Due before; arms/wingfoil/manual.md (agent runs `memory approve` after "Approved. Proceed.")',
  ],
  ['caps', 'experiment design §3.6; REQ-RUN-08'],
  [
    'cost-cap-one-turn',
    'rel-v0-1 W5 Due before; rel-v0-1 W5 "What the pinned agent does at its caps" (0.0419 USD for 0.04); task-024 Design ("one turn past the cap at most") and Known limits; REQ-RUN-04 (`--max-budget-usd`)',
  ],
  [
    'killed-step',
    'rel-v0-1 W5 Due before; task-024 Design "The step caps" (upper bound = the `--max-budget-usd` given) and "Deviation from the Design" (a time-capped step ends the run in practice)',
  ],
  [
    'step-tokens-between-invocations',
    'rel-v0-1 W5 Due before; task-024 Design "The step caps" and Known limits',
  ],
  ['web-use', 'REQ-RUN-10; experiment design §3.2 and §5 T13; rel-v0-1 W2 item via task-046 Context'],
  [
    'harness-gaps',
    'REQ-FMT-10 (amended 1.9); arms/wingfoil/arm.yaml `provides` and its comment; scenarios/README K5 (mutating MCP Tools later); rel-v0-1 W6 Due before; task-030 (a `false` is a known gap)',
  ],
  [
    'expected-failures',
    'REQ-SCO-10 (amended 1.9); experiment design §4.6; rel-v0-1 W6 Due before; scenarios/*/1.0/scenario.yaml `capabilities` (only S8: `[directive-delivery]`); S8.md §8',
  ],
  ['what-is-measured', 'task-046 Design "The prose" section 3'],
  ['scoring-isolation', 'experiment design §3.7; REQ-SCO-01; REQ-SCO-03; adr-004 decisions 1–4'],
  ['m-q1', 'experiment design §4.1 M-Q1; REQ-FMT-04 (`oracle.suites`, `after_steps`); adr-004 decision 11'],
  [
    'counting-rules',
    'adr-004 decisions 5 (120 s per test), 6, 7, 8, 9, 11; rel-v0-1 W6 Due before; adr-004 Consequences "W11 (F5.8)"',
  ],
  [
    'holdout-result',
    'adr-004 amendment 1 decisions 13–16; REQ-SCO-09; REQ-SCO-07 (not in M-R1); requirements amendment 1.14 (hold-out enters neither M-F1 nor M-D3); experiment design §5 T13; rel-v0-1 W6 Due before',
  ],
  [
    'm-q2',
    'REQ-SCO-04 (amended 1.16); experiment design §4.1 M-Q2; task-041 Design spike (`--min-tokens 50`) and notes "For W11"; adr-004 amendment 3 decisions 20–22; task-041 notes (agent’s tests may vary coverage); rel-v0-1 W9 Due before',
  ],
  [
    'checks',
    'REQ-SCO-06 (amended 1.12, 1.13); REQ-SCO-05; adr-004 amendment 2 decisions 18–19 (no check runs the agent’s code); rel-v0-1 W8 Due before',
  ],
  [
    'content-checks',
    'REQ-SCO-06 `content`; requirements amendment 1.12; S3.md §9 ("D3 content check favours verbose arms": some record, amount not scored); task-036 Design "Known limit" (a comment counts as a record); rel-v0-1 W8 Due before',
  ],
  [
    'syntactic-limits',
    'REQ-SCO-05 `ast` (test and declaration files left out); requirements amendment 1.13 (`crypto` randomness); S8.md amendment 1.1 (alias not seen); rel-v0-1 W8 Due before',
  ],
  [
    's8-directives',
    'S8.md §4 and §6 ("No prompt mentions the rules"); scenarios/S8/1.0/arms/wingfoil/.wingfoil/directives/custom/r1–r4; task-046 Design "The published material" (`directives-s8.html`); rel-v0-1 W8 Due before',
  ],
  [
    'm-e1',
    'experiment design §4.4 M-E1; REQ-SCO-05 (violations per step with place); S8.md §7 (per rule); REQ-RES-03 category map E (summed over steps)',
  ],
  [
    'm-f1',
    'experiment design §4.3 M-F1; REQ-SCO-12; requirements amendment 1.14; task-039 Design table (the four rows); rel-v0-1 W9 Due before',
  ],
  [
    'm-f2-reading',
    'experiment design §4.3 M-F2; REQ-SCO-12; task-039 Design ("attributed … is the metric’s meaning, not a computation"); rel-v0-1 W9 Due before',
  ],
  [
    'm-d3-from-seed',
    'experiment design §4.1 M-D3; REQ-SCO-12 (`seed`, M-D3); task-039 notes "For W11" (public tests only); rel-v0-1 W9 Due before',
  ],
  ['m-k1-k2', 'experiment design §4.2 M-K1, M-K2; REQ-RUN-09; sequencer decision 1 (via REQ-RUN-09)'],
  [
    'm-k3',
    'experiment design §4.2 M-K3; REQ-SCO-08 (`cost.setup`); task-039 Design decision 2 / task-040 (setup runs no agent, adr-003 decision 11)',
  ],
  [
    'm-k4',
    'experiment design §4.2 M-K4; REQ-SCO-08 (amended 1.15, rules in order, expected failure computed, v0.1 number 0); task-040 notes "For W11" (rules and order, baseline-docs paired too, overhead in each step’s cost); task-039 Design decision 2 (each session reads the manual again); rel-v0-1 W9 Due before',
  ],
  ['m-r1', 'experiment design §4.5 M-R1; REQ-SCO-07 (public tests only); rel-v0-1 W10 Due before'],
  [
    'm-r2',
    'experiment design §4.5 M-R2; REQ-SCO-05 (M-R2’s public interface, amended 1.17); requirements amendment 1.17 (code that does not compile still has an interface; an entry names its file); rel-v0-1 W10 Due before',
  ],
  [
    'm-r3',
    'experiment design §4.5 M-R3; REQ-SCO-07 (M-R3’s paths); task-042 Design decision 2 (seed’s files raise similarity); rel-v0-1 W10 Due before',
  ],
  [
    'm-r-runs-and-pins',
    'REQ-SCO-07 (runs compared, pins compared, Jaccard pairs and mean, no threshold); experiment design §4.5 (no threshold in v0.1, first campaign gives reference values); task-042 Design decision 3; rel-v0-1 W10 Due before',
  ],
  [
    'm-r3-harness-files',
    'rel-v0-1 W10 Due before (calibration item and W11 item); task-042 independent review finding 5 (approver’s choice 2026-09-29)',
  ],
  [
    'final-not-reached-loss',
    'REQ-SCO-12 (M-F1 and M-D3 in aggregation); task-034 Design "Losses" (final M-Q1 as 0 of census total; a step not reached is not a loss by itself); adr-004 Consequences W7; rel-v0-1 W9 Due before',
  ],
  ['how-to-read', 'task-046 Design "The prose" section 4'],
  ['category-map', 'REQ-RES-03 (amended 1.20, the category map); task-045 Design "The category map"'],
  [
    'not-covered',
    'REQ-RES-03 (a category is covered …); REQ-RES-02 (uncovered: the release that plans it); experiment design §1 goals table; experiment design §4.6',
  ],
  ['m-d1-m-d2', 'REQ-RES-03 ("M-D1 and M-D2 are not reported apart in v0.1"); task-045 Choices to confirm 1'],
  ['comparisons', 'REQ-RES-03 (a comparison); task-045 Design "Each comparison’s outcome"'],
  [
    'beyond-variance',
    'experiment design §4.6; REQ-RES-03; experiment design §5 T8 (no claim of significance in v0.1)',
  ],
  [
    'preliminary',
    'experiment design §4.6; REQ-RES-03 (preliminary comparison marked when the value has n > 1); task-045 Design findings (only S1 repeated; D, E, F n = 1)',
  ],
  [
    'm-e1-not-comparable',
    'REQ-RES-03 (M-E1 not comparable); task-045 "After the reviews" (approver’s choice 2026-10-01, the reason)',
  ],
  [
    'headline',
    'REQ-RES-03 (the headline’s grammar); task-045 W11 plan-phase decision 3 and Design "The headline"; task-045 Choices to confirm 2',
  ],
  ['chart', 'REQ-RES-03 (the chart); task-045 "After the reviews" (chart reads every covered scenario)'],
  ['same-weight', 'REQ-RES-03 (one markup for every outcome; arm order); task-045 Design "The landing page"'],
  [
    'aggregate-values',
    'REQ-FMT-07 (amended 1.15); experiment design §4.6; REQ-RES-02 (runs with their `bench run show` command); rel-v0-1 W7 Due before',
  ],
  [
    'losses',
    'REQ-SCO-10; REQ-RES-03 (a loss named with its reason, an expected failure with the missing capability); task-034 Design "Losses"; experiment design §4.6; rel-v0-1 W7 Due before',
  ],
  [
    'holdout-not-scored',
    'adr-004 decision 16; task-034 Design (`holdout`: "not scored", never a zero); REQ-RES-03 (hold-out marked with n, or "not scored"); rel-v0-1 W7 Due before',
  ],
  [
    'answer-key-unpublished',
    'rel-v0-1 W7 Due before; S2.md §1 card and §6 (answer key hold-out only, public describes defect kinds only); REQ-RES-02 (site never reads an oracle file, the hold-out or a transcript); task-045 Design "What never reaches `site/`"',
  ],
  [
    'model-slices',
    'experiment design §5 T14 and §6; rel-v0-1 W5 Due before (W7 item); REQ-RES-03 (slices’ runs counted apart); REQ-RES-02 (slices apart)',
  ],
  [
    'finding-notes',
    'REQ-RES-05 (amended 1.19); REQ-CLI-07; rel-v0-1 W10 Due before (calibration item: "handed to WingFoil by the maintainer"; W11 item); task-045 Context Out of scope ("a finding note stays in `findings/`")',
  ],
  [
    'oracle-licences',
    'scenarios/S1/1.0/oracle/licenses/NOTICE.md; S1.md §6 and amendment 1.2; REQ-FMT-04 `third_party`; dl-002; rel-v0-1 W7 Due before; task-046 Design "The published material"',
  ],
  ['validity-threats', 'experiment design §5 (heading); task-046 Design "The prose" section 5'],
  ['threat-t1', 'experiment design §5 T1'],
  ['threat-t2', 'experiment design §5 T2'],
  ['threat-t3', 'experiment design §5 T3'],
  ['threat-t4', 'experiment design §5 T4'],
  ['threat-t5', 'experiment design §5 T5'],
  ['threat-t6', 'experiment design §5 T6'],
  ['threat-t7', 'experiment design §5 T7'],
  ['threat-t8', 'experiment design §5 T8'],
  ['threat-t9', 'experiment design §5 T9'],
  [
    'threat-t10',
    'experiment design §5 T10 and decision 6 (amendment 1.1); scenarios/README K5 (sequencer decision 3: public campaign on the latest released WingFoil)',
  ],
  ['threat-t11', 'experiment design §5 T11'],
  ['threat-t12', 'experiment design §5 T12'],
  ['threat-t13', 'experiment design §5 T13; REQ-RUN-10 (shell network use not seen)'],
  ['threat-t14', 'experiment design §5 T14 and §6'],
  ['this-execution', 'task-046 Design "Generated: ’This execution’"'],
  [
    'published-material',
    'task-046 Design "The published material" and Scope ("S2’s answer key and the hold-out’s content never are")',
  ],
];

describe('the method page statements (F5.8, task-046)', () => {
  const { anchors } = renderMarkdown(readFileSync(repoPath(METHOD_FILE), 'utf8'));

  it('holds every statement it owes, each once, and no statement without a source', () => {
    expect([...anchors].sort()).toEqual(STATEMENTS.map(([anchor]) => anchor).sort());
    expect(new Set(anchors).size).toBe(anchors.length);
  });

  it('names a source for every statement', () => {
    for (const [anchor, source] of STATEMENTS) expect(source.trim(), anchor).not.toBe('');
  });

  it('leaves the generated sections their own anchors', () => {
    for (const generated of ['pins', 'budget', 'spending']) expect(anchors).not.toContain(generated);
  });
});
