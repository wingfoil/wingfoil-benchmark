---
id: task-073-setup-contest-process
type: task
title: "Setup contest process"
status: draft
release: v0.2
wave: W13
features: [F7.2]
acceptance:
  - "competitors.feature#A setup can be contested from its page"
  - "competitors.feature#A corrected setup runs as a new campaign and the old one stays published"
requirements: [REQ-RES-10, REQ-RES-02, REQ-FMT-13]
fixes: []             # optional: the bugs this task fixes, e.g. [bug-005-a-bug-cannot-name-…]
---

## Context

The setup contest process ([rel-v0-2](../release/rel-v0-2.md), W13, F7.2; REQ-RES-10):

- `.github/ISSUE_TEMPLATE/contest-setup.yml` asks for the arm, the setup step, what the tool's official documentation
  says and the proposed correction; every setup page links it;
- `site-content/contests.yaml` (`{campaign, arm, issue, followed_by}`), written by the maintainer and read by the site:
  a contested execution's setup page links its contest and the campaign that followed;
- **task-067's review point B**, which the approver placed here (2026-10-07): a contested execution must stay
  buildable after its arm is corrected. Today a rebuild is refused once a ran harness arm's files differ from the
  `arm_digest` its runs recorded (and the manual's sha256). The approver's choice: **read the arm — setup page and
  manual — at its recorded state**, from the repository's history, so the old pages stay as they ran and gain the
  links.

The third F7.2 scenario ("a campaign file whose pinned arm digest no longer matches the arm is refused") was delivered
by task-064. **No real agent, no spending.** **Done** means: the two scenarios green; a site built after an arm's
correction keeps the contested execution's setup and manual pages as they ran, with the contest's links.

## Acceptance criteria

- `competitors.feature#A setup can be contested from its page`. **Red-first.**
- `competitors.feature#A corrected setup runs as a new campaign and the old one stays published`. **Red-first**
  (including the rebuild after the arm's correction, point B).

## Design

<!-- Written in the task's design phase. -->

## Execution notes

- `npx wingfoil memory add --type task --title "Setup contest process"`. Declared: creates the element from the template and
  commits it. Observed: `wf(task): add task-073-setup-contest-process`, `status: draft`. Matches.
