---
id: task-055-method-page-re-read-before-publishing-v0-1
type: task
title: "Method page re-read before publishing v0.1"
status: pending
release: v0.1
wave: campaign
features: [F5.8]
acceptance: [results.feature]
requirements: [REQ-RES-02]
---

## Context

campaign-cycle's last phase, `publish`, builds the site of the reference campaign's execution `c82a5e74885b/2`
([campaign-001](../campaign/campaign-001-v0-1-reference-campaign.md), reviewed `5f3c2fc`), and the approver then
approves publishing it. The method page's prose, `site-content/method.md` (task-046, W11), was written before
calibration and the campaign. Several items were left due "before publishing". The approver asked for this task on
2026-10-04.

**What is due, and where it was left:**

1. **rel-v0-1, W11, "Before publishing":** re-read `method.md` against the requirements as they stand, now 1.25. The
   statements test pins the anchors, not their wording.
2. **rel-v0-1, W11, "Calibration and the reference campaign":**
   - the text names the campaign's shape (only S1 repeated); re-read it against the shape as it ran;
   - `harness-gaps` and T10 describe the development pin `3df305e`;
   - "This execution" reads the real pins, among them the released WingFoil's `provides`. To check on the built
     page.
3. **Calibration §10, still open:**
   - the slice decided in §5: the Opus 5 slice reduced to the **wingfoil arm** (option A). Today `model-slices` and
     T14 speak of "a comparison slice" without saying it covers one arm only;
   - a statement that the wingfoil arm's process (a task and a decision-log per request, each approved) is the
     operating manual's choice (§7), so that its overhead is read as the manual's process, not as WingFoil's minimum.
4. **task-054's deviation:** a sentence that Claude Code may call a smaller model for its own work. It did: Haiku
   4.5, 0.19 USD in `c82a5e74885b/2`. The models each step used are recorded in `run.json`.
5. **The executions:** `/2` is the one published. Whether the page says that `/1` existed and why it is not
   published (bug-011) is the design's to propose.

**Scope:** the prose of `method.md`, and its anchors where a statement is added; the statements test where an anchor
is added. No change to the site's generator unless the built page shows a fact read wrongly. That would be a bug of
its own.

**No real agent, no spending.**

**Done** means:

- every item above is either reflected in the page or stated as not needed, with the reason;
- the site is rebuilt on `c82a5e74885b/2` and read in the browser pane: the method page, the landing page and one
  category page;
- `npm test` is green, and lint is clean.

## Acceptance criteria

<!-- One line per criterion (Gherkin scenario or requirement), each classified as red-first
     (new behaviour: a failing test precedes the code) or characterization (existing behaviour). -->

## Design

<!-- Modules, interfaces, data formats touched; decisions taken and their reasons. -->

## Execution notes

- `npx wingfoil memory add --type task --title "Method page re-read before publishing v0.1"`. Declared: creates the
  element from the template and commits it. Observed: `wf(task): add task-055-…`, `status: draft`.
