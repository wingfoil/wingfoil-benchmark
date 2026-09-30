---
id: task-046-method-page
type: task
title: "Method page"
status: pending
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

Classified in the design phase.

- `results.feature` @F5.8 "The method page explains how to read the results": the arms, the controls, the
  run protocol, the approver policy, the validity threats, the pins and the budget, in plain language.
- Every statement of rel-v0-1's "W11 (F5.8)" lists (W2–W10) and task-045's rules is on the page.
- The execution's pins and budget are read from its files, not written by hand.
- The operating manuals, the baseline-docs table, S8's directives and `NOTICE.md` are published; S2's
  answer key and the hold-out's content are not.
- REQ-NFR-05: the same inputs give the same bytes; no date.

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
