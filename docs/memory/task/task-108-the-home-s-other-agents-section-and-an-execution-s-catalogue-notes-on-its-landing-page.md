---
id: task-108-the-home-s-other-agents-section-and-an-execution-s-catalogue-notes-on-its-landing-page
type: task
title: "The home's other-agents section, and an execution's catalogue notes on its landing page"
status: backlog
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

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
