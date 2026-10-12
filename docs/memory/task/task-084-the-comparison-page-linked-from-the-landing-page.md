---
id: task-084-the-comparison-page-linked-from-the-landing-page
type: task
title: "The comparison page, linked from the landing page"
status: in-progress
release: v0.2
wave: W14
features: [F5.2]
acceptance:
  - "comparison.feature#The comparison is published with the newer execution"
requirements: [REQ-RES-07, REQ-RES-02]
fixes: []
---

## Context

F5.2, published: after task-083's record.

**Scope** (REQ-RES-07): for each comparison whose newer side is the execution being built, `compare-<earlier-id>-<m>.html`:
one row per category and arm with the delta change, its `n`, the differing pins, the **cross-model** mark, and "not
compared" where REQ-SCO-13 says so; the landing page links each comparison. Static HTML, no client script
(REQ-RES-02).

**Done** means: the scenario's test green; the W14 "Ends with" can be checked offline (a second fake execution
compared with the first and published).

**Wave:** W14 ("Comparison and Dana"), planned by the approver on 2026-10-10 ("Sì, come proposto"), eight tasks delivered one at a time: task-079 → task-086. W14 ends with "a second public campaign compared with the first": verified offline with the fake agent (a second execution compared with the first, as W12 and W13 were); the real second public campaign is plan-004's reference-campaign step.

**No real agent, no spending**: every test runs the fake agent.

## Acceptance criteria

- `comparison.feature#The comparison is published with the newer execution`: **red-first**. Today the site reads no
  comparison and has no `compare-*.html`.

## Design

**Fixes:** none.

**1. What the build reads** (REQ-RES-02 as amended): every `results/comparisons/<campaign-id>-<n>/*.json` of the
execution being built, which is the comparisons whose newer side it is (REQ-CLI-12). They are read in file-name order,
with a shape check like the aggregate's (`comparison_version` 1, `earlier`, `newer`, `rows`, `not_compared`,
`only_in`, `pins_differ`). A file that cannot be read, or that names another newer execution, refuses the build and
names it, as the build refuses an unreadable `campaign.yaml` today. An execution with no comparison builds as before.

**2. `compare-<earlier-id>-<m>.html`** (REQ-RES-07), one per comparison, static HTML from the shared page shell, with
no script and every text escaped:
- **heading:** the newer execution against the earlier one, each with its campaign, execution, default model and the
  date it ended when the file records one. The order is the maintainer's choice, and the page says so;
- **cross-model:** when the default models differ, a note at the top, and the mark `cross-model` on every row it
  applies to (T14);
- **pins that differ:** a list, `pin: earlier → newer`, or "none";
- **the rows**, in a table, grouped by category, then scenario version, arm and model, with one row per metric of the
  category map. Each row shows:
  - the metric;
  - each side's delta against its own baseline, with the arm's `n`, the baseline's `n`, the range from n = 3 and the
    certainty, formatted as the category pages format them (`formatDelta`, `formatFigure`);
  - the change of the delta;
  - a side without a delta shows its note ("no baseline", "not measured", "not comparable: …"), with the arm's value
    where the comparison kept one, and the row then shows no change;
- **not compared:** a list, each group with its reason (REQ-SCO-13);
- **on one side only:** a list.

**3. The landing page** links each comparison: a section "Compared with earlier executions" listing each by campaign
and execution, with `cross-model` where it applies, linking `compare-<earlier-id>-<m>.html`. It appears only when the
execution has a comparison, so an execution without one keeps its bytes (REQ-NFR-05, REQ-RES-02's permanent URL).

**4. Not here:** the root index of every built execution with its date, and stable URLs (task-085).

**5. W14's "Ends with":** after this task, "a second execution compared with the first and published" can be checked
offline. It is recorded in rel-v0-2 when W14's last task is done, not in this task.

**Tests** (red first):
- **Acceptance:** the scenario. The site fixture's execution (`abcdef012345/1`) is the newer side. An earlier
  execution of TC is stored and scored, then compared with `bench campaign compare`, and the site is built. The
  landing page must link `compare-0123456789ab-1.html`, and that page must show each side's delta, the change, the
  `n` and the differing pins.
- **Unit**, on hand-built comparison files:
  - a cross-model comparison marked;
  - a side with a note and the arm's kept value;
  - not compared and one side only listed;
  - the range at n = 3;
  - escaping;
  - no `<script`;
  - an unreadable or misplaced comparison file refusing the build;
  - no section on a landing page without comparisons.
## Execution notes

## Review notes
