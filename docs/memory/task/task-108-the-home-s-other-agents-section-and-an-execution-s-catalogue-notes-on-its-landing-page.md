---
id: task-108-the-home-s-other-agents-section-and-an-execution-s-catalogue-notes-on-its-landing-page
type: task
title: "The home's other-agents section, and an execution's catalogue notes on its landing page"
status: approved
release: v0.3
wave: W15
features: [F5.5]
acceptance: [results.feature]
requirements: [REQ-RES-11]
fixes: []
tags: ["v0.3","site","codex"]
---

## Context

[campaign-006](../campaign/campaign-006-codex-harness-vs-docs-campaign-on-terra-on-approver-policy-v2.md) (Codex, three arms on `gpt-5.6-terra`, approver policy v2) is reviewed and to be published. The home
(task-104, REQ-RES-11) groups executions by kind; an execution of another agent than Claude Code belongs to the
`across-agents` group (T14: never mixed with the headlines), but that group's heading and line say "Across agents —
The same baseline arm under another agent", which fits campaign-004 (baseline only, compared across agents) and not
campaign-006 (three arms read against each other within Codex, with no across-agents page: M-R across needs one
approver policy). Its caveats would also be invisible: a catalogue entry's `notes` are shown on its across-agents page
only. The approver chose this task before the publication (2026-10-27). W15, before campaign-006's publication.

**No real-agent session. Spending: 0 €.**

**Done** means: the group reads "Other agents" with a line that covers both kinds of execution, its id unchanged; an
execution's `notes` are shown on its landing page; REQ-RES-11 amended; ready for campaign-006's catalogue entry.

## Acceptance criteria

1. The home's third group is headed **"Other agents"**, its line "Executions under another agent than Claude Code:
   its baseline compared across agents, or its arms compared with each other; never mixed with the headlines above.";
   the kind's id stays `across-agents`, so the catalogue and campaign-004's entry are unchanged. **Red-first**
   (`profiles.test.ts`).
2. An execution's catalogue `notes` are shown on its **landing page** (a list under the page's framing), as well as on
   its across-agents page; an execution without notes renders as before. **Red-first.**
3. REQ-RES-11 amended (requirements 1.39: the group's heading and line, the notes on the landing page) and the
   catalogue's header comment updated. **Characterization** (documents).
4. Every published execution's pages rebuild (`bench site build`) and the home builds with the current catalogue.
   **Characterization.**

## Design

- `src/site/profiles.ts`: `KINDS`' third entry, heading and line only.
- `src/site/build.ts` passes the entry's `notes` to `landingPage` (`src/site/render.ts`), which renders them after the
  framing, escaped, as the across-agents page does; the profile pages are untouched.
- The across-agents page's own title ("Across agents: … against …") stays: it is that comparison's name.
- Not in this task: campaign-006's catalogue entry and the site's publication, which follow it in `campaign-cycle`.

## Execution notes

- Drafted, submitted and approved on main (2026-10-27); `memory submit` (backlog → in-progress, `53627f16`);
  worktree `../WingFoil2-Benchmark-wt/task-108`, branch `task/task-108`, its own `npm ci`.
- **Red-first:** `8045da72` (the home's heading and line, the notes on the landing page in `render.test.ts` and through
  `bench site build` in `build.test.ts`) before the code.
- **The code:** `KINDS`' third entry's heading and line; `landingPage` gains `notes`, rendered as the across-agents
  page renders them (`<ul class="notes">`, escaped), after the framing, also on a baseline-only page (before its
  across-agents section); `build.ts` passes the catalogue entry's notes.
- **Criterion 4:** in the worktree, `bench site build` of the four published executions (`81ebb2691f9c/1`,
  `c82a5e74885b/2`, `bf3a1ac7dff5/1`, `4682bcc65d6b/1`) succeeded; the home's groups read Reference campaigns,
  Bridges, Other agents; campaign-004's landing page now carries its four notes.
- **Docs:** requirements 1.39 (REQ-RES-11); the catalogue's header comment.
- **Checks:** `scripts/pre-review.sh main` green; the site's unit tests (157) green.

### Review

Under dl-020; `scripts/pre-review.sh main` green before it.

- **Round 1** (an independent read-only agent, from a `mktemp` directory; both reflogs unchanged): correct,
  red-first, documented; a fresh build differs from the published site only in the home and campaign-004's landing
  page (and every `method.html`, from task-105's and task-106's method changes, not this task). **Nits only:**
  - fixed: the group's line reads "their baseline … their arms" (criterion 1 quoted "its"; the plural subject);
    the notes' place on a one-arm page pinned by a test;
  - recorded: on a multi-arm page the notes follow the framing and its headline paragraphs; `results.feature` has no
    step for the notes, which the unit and build tests cover.
  The review closes.

### Approval

- **No full suites,** at the approver's choice in chat (2026-10-27): the code changed since the last full suites
  (`task/task-106` at `1934a7dc`, all five stages green) is three files of `src/site/` and their unit tests; lint and
  `tsc` green in `pre-review.sh`, the site's unit tests (157) and the site's acceptance tests (`results`,
  `comparison`: 22) green.
- in-review → approved by the approver (`9914531e`); merged into main (`c16b5099`); `dist/` rebuilt in the main
  checkout.

