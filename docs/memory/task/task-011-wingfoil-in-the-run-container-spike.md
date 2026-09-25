---
id: task-011-wingfoil-in-the-run-container-spike
type: task
title: "WingFoil in the run container spike"
status: pending
release: v0.1
wave: W3
features: []
acceptance: []
requirements: [REQ-RUN-14, REQ-RUN-17, REQ-RUN-03, REQ-FMT-05]
---

## Context

First task of wave **W3 — Arms** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)). W3 has no
high-uncertainty feature in the sequencer. It still depends on how WingFoil `3df305e` behaves
**inside the run container**, which nothing in the repository has observed yet: every `wingfoil`
command so far ran on the host, against this repository, as the managing WingFoil. The approver asked
for a spike first (W3 plan phase), so that the design of the four delivery tasks rests on observed
behaviour, not on WingFoil's documentation.

It is a **knowledge task**: it adds no behaviour and no code under `src/`. Its probes are throwaway
scripts under `spikes/task-011/`, as task-004's were.

**Its `features` and `acceptance` are empty on purpose**, as in task-004: the traceability test reads
`features` as "this task delivers these", and this task delivers none of F2.5, F2.6 or F2.7.

### Questions to answer

1. **Building the WingFoil under test (REQ-RUN-14).** Does `npm pack` on a clean `git archive` of
   `3df305e`, taken from the local WingFoil clone, give an installable tarball, or does the package
   need a build step first? How long does it take, how large is it, and is its `sha256` the same on a
   second build?
2. **Installing it in the run image.** In `node:22-bookworm` as user `node`: global or
   workspace-local install, what the install downloads (dependencies need the network, which is
   allowed: experiment-design decision 4), how long it takes, and whether `npx wingfoil` then
   resolves to that build and nothing else.
3. **Initialising a project without a terminal.** `wingfoil init` in a workspace that already has the
   runner's `seed` commit: which files it writes, whether it commits, whether it prompts, and how its
   commits sit in the history the runner scores (`seed`, `step <NN>`, REQ-RUN-05).
4. **The scenario's configuration ([dl-005](../decision-log/dl-005-a-scenario-s-project-rules-live-in-the-scenario-as-the-wingfoil-arm-s-configuration.md)).**
   Which files hold the DNA, the directives and the Memory decisions in `3df305e`. Can a prepared
   directory be copied in as it is, or must parts of it go through `wingfoil` commands to be valid?
   The answer fixes the layout of `scenarios/<id>/<version>/arms/wingfoil/`.
5. **Approval authority (REQ-RUN-17).** How `3df305e` declares a member and its role, how it maps the
   git identity to a member, and whether an agent committing as "Benchmark Approver" can run
   `memory approve` and `memory reject`.
6. **The MCP server.** The command that starts it, the `--mcp-config` JSON Claude Code needs, and
   whether it starts in the container with no terminal attached.
7. **With a real session (see spending below).** With `--setting-sources project`, is the workspace's
   `CLAUDE.md` loaded (REQ-RUN-12 relies on it)? Do the WingFoil MCP tools appear in the session's
   `init` event? Are `--mcp-config` and `--strict-mcp-config` accepted on `--resume` (the W2 carry-over
   in rel-v0-1)?

### W3 plan-phase decisions (accepted by the approver, 2026-09-25)

Recorded here because they shape the whole wave.

1. **Four delivery tasks, after this spike:** task-012 arm definitions and the setup phase, task-013
   WingFoil under test and approval authority, task-014 operating manuals, task-015 the baseline-docs
   generator.
2. **A scenario's project rules live in the scenario, in WingFoil's format**
   ([dl-005](../decision-log/dl-005-a-scenario-s-project-rules-live-in-the-scenario-as-the-wingfoil-arm-s-configuration.md)).
3. **The runner reads the WingFoil source from a configured local clone**, read-only. It verifies that
   the pinned commit exists there and records the full SHA in `run.json`. Nothing is written into the
   WingFoil repository.
4. **W3's "Ends with" is verified with the real Docker and the fake agent**, as in W2 (T1 in the three
   arms, with the wingfoil arm really installing WingFoil `3df305e`), **plus one real-agent run** in
   the wingfoil arm. That run also covers the W2 carry-overs listed in rel-v0-1: a resumed Sonnet 5
   session stays on Sonnet, and what `--max-budget-usd` compares against on a resume. It needs the
   approver's explicit consent when it is run (plan-003 constraint).

**Spending, proposed and to be confirmed at this task's pending → backlog gate:** questions 1–6 need
no agent and spend nothing. Question 7 needs one short real session on the maintainer's subscription,
**up to about 0.50 € equivalent**. If the approver does not accept it, question 7 moves to the wave's
real-agent run, and task-012 and task-014 are designed on the documented behaviour, marked as
unverified.

### Produces

- **adr-003**, the W3 arm conventions: what this spike found, and the design defaults of the wave
  (where the tarball is built and cached, how the arm's setup is recorded, the layout of
  `arms/wingfoil/` in a scenario);
- the answers to questions 1–7 in the Execution notes, each with the command that was run and what it
  printed;
- if something observed departs from the specification, an amendment proposal for the approver,
  never a silent deviation;
- WingFoil friction as numbered notes in the usage-notes inbox.

**Done** means: the questions are answered with evidence, adr-003 is written, the spending (if any)
is reported, and no credential reached the workspace, the logs or this repository.

## Acceptance criteria

No Gherkin criterion and no classification: this task adds no behaviour. Its exit criteria are the
seven questions above.

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
