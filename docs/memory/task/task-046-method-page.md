---
id: task-046-method-page
type: task
title: "Method page"
status: in-review
release: v0.1
wave: W11
features: [F5.8]
acceptance: [results.feature]
requirements: [REQ-RES-02, REQ-CLI-09, REQ-RUN-10, REQ-RUN-17]
---

## Context

Second task of wave **W11 — Publish** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)). The W11
plan-phase decisions are in [task-045](task-045-site-build-and-landing-page.md). This task delivers **F5.8
method page**: the arms, the controls, the validity threats, the pins and the budget, written for a
non-technical reader (features 1.2, J5.4: "enough rigor to be trusted without reading the code").

What exists:

- `bench site build` and the site module (task-045), with the method page's slot and the link to it.
- The sources the page draws on: experiment design §2–§5 (arms, protocol, metrics, reporting rules,
  validity threats T1–T14), requirements 1.19, adr-004, the scenarios' specs, the three operating manuals
  and the baseline-docs table, `oracle/licenses/NOTICE.md`, and the execution's pins in its
  `campaign.yaml` and `aggregate.json`.
- **Every wave since W2 left the method page a statement to make.** They are collected in rel-v0-1's "Due
  before" lists, under "W11 (F5.8)", and this task makes each of them:
  - **W2:** the decision is always the neutral approver's, and the agent only executes it (REQ-RUN-17);
    web use seen only through `WebFetch` and `WebSearch`, not through shell commands (REQ-RUN-10);
  - **W3:** the three operating manuals and the baseline-docs table, published;
  - **W5:** the cost cap lets a session run one turn past it; how a killed step is counted; `step_tokens`
    is checked between invocations;
  - **W6:** adr-004's counting rules; what a hold-out result is; each harness's gaps (`provides: false`)
    and its expected failures;
  - **W7:** `oracle/licenses/NOTICE.md` (Apache-2.0, BSD-3-Clause IETF); the aggregate's rules (every
    value with its runs and `n`, losses, a hold-out "not scored"); S2's answer key is never published;
  - **W8:** the check file and its four kinds, and that checks read text, the AST excepted; content checks
    on added lines only, the prompt check, a code comment counting as a record (S3.md §9); the syntactic
    rules' limits (an alias not seen, tests and declaration files left out, `crypto` randomness counted);
    S8's four directives, published as rules;
  - **W9:** M-F1's rows, and that a revision the scenario asks for counts only when recorded; M-F2 is a
    reading; M-D3 from the seed; M-K4's rules, and that a v0.1 number is 0 or a special case; M-Q2's rule
    sets, complexity per function, jscpd's 50 tokens, coverage from `npm test`, the files measured; a
    final not reached is a loss;
  - **W10:** M-R1 on public tests; M-R2 read from syntax, an entry naming its file, what an entry is;
    M-R3's paths, the setup's and the generated ones left out, and that the seed's files raise the
    similarity; the runs compared (a final not reached left out), the pins compared, and no threshold;
    harness files written during the steps count in M-R3; what a finding note is, and that one is filed in
    WingFoil by hand;
  - **W11 (task-045):** the category map, the headline's rule, "beyond variance", and the markers.

Scope:

- **The method page** in the site `bench site build` writes (REQ-RES-02), in plain language: the arms, the
  controls, the run protocol, the approver policy, the validity threats, the pins and the budget
  (`results.feature` @F5.8), then each metric's rule, and every statement in the list above.
- **What is written once and what is generated.** Prose that does not change with an execution is
  versioned in this repository. What an execution fixes (its pins, its budget and spending, its scenarios
  and versions, the arms' `provides` and expected failures) is read from the execution's files. Where the
  prose lives and how it is kept in step with the requirements is this task's design.
- **The published material:** the operating manuals, the baseline-docs table, S8's directives and
  `NOTICE.md` are rendered or linked from the page; S2's answer key and the hold-out's content never are.
  The manuals and directives are a scenario's published files, and the leak scan's rules still hold.
- **Determinism:** the same inputs give the same bytes; no date.
- **Acceptance:** `results.feature` @F5.8 "The method page explains how to read the results", with a test
  titled `@F5.8 <Scenario name>`.

Out of scope:

- The landing page and the category pages: task-045.
- Publishing: [task-047](task-047-manual-publish-and-transcript-assets.md).
- New metrics, or a change to any scoring rule: the page states the rules; it does not change them.

**Done** means:

- `bench site build` writes the method page, with every statement of rel-v0-1's "W11 (F5.8)" lists, each
  traced to its source in the task's notes.
- The @F5.8 scenario is green.
- Tests, coverage and lint pass.

## Acceptance criteria

Classified in the design phase. Everything here is new behaviour: task-045's `method.html` holds only the
site's reporting rules.

- `results.feature` @F5.8 "The method page explains how to read the results": the arms, the controls, the
  run protocol, the approver policy, the validity threats, the pins and the budget, in plain language.
  **red-first**
- Every statement of rel-v0-1's "W11 (F5.8)" lists (W2–W10) and task-045's rules is on the page, each found
  by its anchor. **red-first**
- The execution's pins and budget are read from its files, not written by hand. **red-first**
- The operating manuals, the baseline-docs table, S8's directives and `NOTICE.md` with its two licence texts
  are published; a manual or a directive that differs from what the runs recorded is refused; S2's answer
  key and the hold-out's content are not published. **red-first**
- REQ-NFR-05: the same inputs give the same bytes; no date. **red-first**

## Design

Three findings shaped this design:

- **Most of the page does not change with an execution.** The arms, the controls, the protocol, the
  approver policy, the threats, each metric's rule and the W2–W10 statements are the benchmark's method. Only
  the pins, the budget and the spending are the execution's: they are in its `campaign.yaml` (the agent and
  its version, the model and the slices' models, the harnesses and their commits, the approver policy, the
  caps, the budget, the rate) and in its runs' `run.json` and `score.json` (each run's harness commit,
  scenario hash, manual's SHA-256 and tokens, the scorer image), and its spending in `aggregate.json`.
- **What the page publishes is Markdown already:** the three manuals (`arms/<arm>/manual.md`), S8's four
  directives (`scenarios/S8/1.0/arms/wingfoil/.wingfoil/directives/custom/*.md`), `NOTICE.md` (S1's
  `oracle/licenses/`). The licence texts are plain text.
- **What the runs recorded can be checked.** `run.json` records each manual's SHA-256 (REQ-RUN-12); the
  scenario hash covers S8's directives and S1's `NOTICE.md`. A manual changed since the runs is refused, as
  task-045 refuses a changed scenario.

### The prose: `site-content/method.md`

The method's prose is one Markdown file, versioned in the repository beside the code (`site-content/`,
not `site/`, which is git-ignored output). It is written for a non-technical reader, with a section per
subject and an anchor per statement:

1. **What is compared:** harness, not model; the arms (experiment design §2), what baseline-docs controls
   (T3) and the baseline-docs table (task-015's "same information" table, with its source).
2. **How a run goes:** the protocol (§3): one container per run, fresh sessions per step, the neutral
   approver and its classifier (dl-004), the decision always the approver's and the agent only executing it
   (REQ-RUN-17), caps (a session may run one turn past the cost cap; how a killed step is counted;
   `step_tokens` checked between invocations), web use seen only through `WebFetch`/`WebSearch`
   (REQ-RUN-10).
3. **What is measured:** each metric in plain words, with its rules from W6–W10 (adr-004's counting, a
   hold-out result, M-Q2's rule sets and files measured, the checks and their four kinds, content checks on
   added lines, the syntactic rules' limits, M-F1's rows and recorded revisions, M-F2 a reading, M-D3 from
   the seed, M-K4's rules, M-R1–M-R3 and their limits, a final not reached is a loss, expected failures and
   each harness's gaps).
4. **How to read the results:** task-045's rules (the category map, the comparisons, beyond variance, the
   headline, M-E1 not comparable, M-D1/M-D2 not apart), the aggregate's rules (every value with its runs and
   `n`), a finding note and that one is filed in WingFoil by hand.
5. **What could be wrong:** the validity threats T1–T14 (§5), each with its mitigation.
6. **This execution:** generated (below).
7. **Published material:** links to the pages below.

The build reads the file and renders it with a small Markdown converter of the subset the file uses:
headings with `{#anchor}`, paragraphs, lists, tables, inline code, emphasis, links. Every text node is
escaped. The same converter renders the manuals, the directives and `NOTICE.md`.

### Generated: "This execution"

From the execution's files, never by hand:

- **Pins:** the agent and its version; the campaign's model and each slice's; each harness with its version
  and the distinct commits its runs recorded; the approver policy; the scenarios with their versions and
  hashes; the scorer image(s) the scores record; the arms with their manuals' SHA-256 and tokens.
- **Budget:** the caps (`step_time_s`, `step_tokens`, `run_cost_eur`), `warn_eur` and `ceiling_eur`, and
  the rate `usd_to_eur`.
- **Spending:** the execution's total cost in EUR (the sum of its runs' M-K1, with the runs whose cost is a
  bound named), and its runs' count, slices apart.

### The published material

Under `site/<campaign-id>/<n>/material/`, linked from the method page:

- `manual-<arm>.html`, one per arm of the execution; refused when `arms/<arm>/manual.md`'s SHA-256 differs
  from the one its runs recorded;
- `directives-s8.html`: S8's four directives, when S8 is in the execution;
- `notice-s1.html`, `licence-apache-2.0.html`, `licence-bsd-3-clause-ietf.html`, when S1 is in it.

Nothing else of a scenario's `oracle/` or of the hold-out is read.

### Keeping the page in step

A test lists every anchor the method page must hold, each with its source (a requirement, an ADR, a
decision-log, or a wave's "Due before" line in rel-v0-1). A statement removed from `method.md`, or one the
list adds, fails it. The same test checks each anchor is unique.

### Modules

- `site-content/method.md` (new).
- `src/site/markdown.ts` (new): the converter, escaping every text.
- `src/site/method.ts` (new): reads `method.md`, the execution's pins and budget, and the published
  material, with the refusals; returns the method page and the material pages. `render.ts`'s `methodPage`
  is replaced by it; `build.ts` writes `material/`.
- Tests: the converter (each construct, escaping, an unknown construct as text); the generated section on
  the site fixture; the material pages and the refusals; @F5.8 through `main`; the anchors' list; the same
  bytes twice.

### Requirements 1.21

- **REQ-RES-02:** the method page's sections, the generated "This execution", the material pages, the
  manual refused when it differs.

No ADR.

### Choices to confirm

All three confirmed by the approver as proposed, 2026-10-01.

1. **The prose lives in `site-content/method.md`, rendered by a small converter of its own,** which also
   renders the manuals, directives and `NOTICE.md`. The method reads as a document and changes as one.
   - *Alternative A:* a pinned Markdown package (for example `marked`) as a runtime dependency: less code,
     but a new dependency whose HTML options must be set so that nothing passes unescaped.
   - *Alternative B:* the prose as HTML strings in TypeScript, the published files shown as preformatted
     text: no converter, but the method buried in code.
2. **The material gets pages of its own under `material/`,** linked from the method page, rather than inline:
   the method page stays readable, and each manual can be read whole.
   - *Alternative:* everything inline on one long method page.
3. **A test pins the list of anchors and their sources:** a statement owed by a wave cannot silently drop.
   - *Alternative:* the test checks a few key phrases only; the list lives in this task's notes.

### After the reviews

- A link of the text to material the execution does not publish (an arm or a scenario it did not run) is
  left as its label. The converter resolves each link as it renders it, so no second parser has to agree.
- A link is kept only to a relative page or an `https` address: never `/…`, never `//host`.
- "This execution" also lists each arm's declared harness capabilities (`provides`, from its runs), each
  arm's own harness commits, the slices with their arms and repetitions, and the spending with the slices
  apart and setup costs said to be left out.

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->

### WingFoil commands (declared vs observed)

- `npx wingfoil memory approve task-046-method-page --reason "…"`, run by the approver on main on 2026-10-01
  (`0008e2c`): `pending → backlog`, with the reason. Matches.
- `node_modules/.bin/wingfoil memory submit task-046-method-page` in the task's worktree, after the design
  (`f52f514`) and the approver's confirmation of its choices: `backlog → in-progress`, one commit, 1 file, a
  diff limited to `status`. Matches.

### Build

- **The prose** was drafted by a separate agent from the sources, with a source per anchor, and reviewed
  here before it entered the repository. Its doubts were settled:
  - the killed step ending the run is task-024's recorded deviation from REQ-RUN-08: true of the code;
  - each harness's `provides` is now generated from the runs, not quoted from `arms/wingfoil/arm.yaml` at
    `3df305e`;
  - execution-specific sentences were made general or named as the v0.1 reference campaign's.
- `ce10c9e` (red), `ea226ad` `feat(site)`: `site-content/method.md` (81 anchors), `src/site/markdown.ts`,
  `src/site/method.ts`, `material/`, the statements test; `9e2eb6c` (red), `d7fb8d7`: the declared
  capabilities; `4f71160`: long hashes wrap (after a look at W10's execution in a browser); `be8603f`:
  requirements 1.21.
- **W10's execution** `cb46676b5881/2` builds 15 pages, its three manuals matching the SHA-256 its runs
  recorded; the method page and the notice were checked in a browser for width and links.
- **Checks on the last commit:** `npm test` 1173/1173, coverage 98.5%, lint clean, `npm run test:bin` 8/8.
  `test:docker` not run: nothing of the runner or the scoring image changed.

### Review

Each round by a fresh, read-only agent; each finding fixed test-first.

- **First review** (code and prose against every source): the text linked material the execution does not
  publish; `//host` links accepted; the converter's private marker could come from the text; spending mixed
  the slices; REQ-RES-02's list of what the site reads incomplete; harness commits matched by tool, not arm;
  a file under a scenario's `arms/` crashed; the prose missed when a range is shown; T10's commit read as
  current; test gaps. It confirmed every W2–W10 "W11 (F5.8)" item on the page, and the prose against the
  code (the approver's replies and limit, the caps, the counting, M-R3's paths, M-K4). Fixed in `d2e4e30`,
  `eeb6b1e`.
- **Second review** (the fixes): material links with an anchor or `./` missed; a table cell split wrongly
  after an unmatched backtick (a regression of the first fix); a dangling link under `arms/`; `/…` links.
  Fixed in `e5bacf6`, `0afd527`.
- **Third review** (the second round's fixes): the separate link list paired backticks across blocks where
  the renderer pairs them per block, so a link could be missed (latent: no current text triggers it); an
  empty material page name. Fixed in `a2d86b2`, `23360a7` by letting the converter resolve each link.

- `node_modules/.bin/wingfoil memory submit task-046-method-page` after the notes: `in-progress →
  in-review`, one commit, 1 file, a diff limited to `status`. Matches.
