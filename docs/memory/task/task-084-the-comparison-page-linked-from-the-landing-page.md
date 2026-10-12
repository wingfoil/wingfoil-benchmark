---
id: task-084-the-comparison-page-linked-from-the-landing-page
type: task
title: "The comparison page, linked from the landing page"
status: done
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

**WingFoil commands, declared vs observed:** `npx wingfoil memory submit task-084-…` on main (`d93f727`), after the
Design's own commit (`a9a442f`, W-01). Declared: backlog → in-progress. Observed: `{"from": "backlog", "to":
"in-progress"}`, exit 0, one `wf(task): submit …` commit (W-14).

**Build** on `task/task-084` (worktree `../WingFoil2-Benchmark-wt/task-084`, its own `npm ci`):
- red first:
  - `6fe8e3f`: the acceptance scenario in `test/acceptance/comparison.test.ts`. It builds the site fixture's execution with
    an earlier execution of TC, compares the two with `bench campaign compare`, and builds the site. The test failed
    on the landing page's missing link.
  - `da8efc4`: unit tests in `test/unit/site/comparisons.test.ts`. They failed because the module did not exist.
    After the red commit, one expectation was corrected before the code was written: `75%` became `75.0%`, the
    format `formatFigure` gives a share.
- `596d827`, the implementation:
  - `src/site/comparisons.ts`: reading, the page, and its name;
  - `landingPage` takes the links;
  - `buildSite` reads the comparisons;
  - `page` in `render.ts` is exported for the new module;
  - a CSS rule for `.cross-model` and `.change`;
  - the README.
- Checks, niced with 2 workers: `tsc` and `npm run lint` clean; `test/unit` and `test/acceptance` green (1516 passed,
  8 skipped).

**Decisions taken in the build, inside the Design:**
- `render.ts` takes the landing page's links as plain data (`ComparisonLink`), computed in `build.ts`. `comparisons.ts`
  imports the page shell from `render.ts`, so the reverse import would be circular.
- Each side shows `n = <arm> / <baseline>`, and then, once either side has three runs, `range <arm> / <baseline>`, with
  `—` for a side below three runs.
- `style.css` gains one rule. Every execution's stylesheet is shared (`site/style.css`), so a rebuild changes its bytes
  and no execution's values. That is presentation, which REQ-RES-02 as amended allows.

## Review notes

### Review

**Round 1**: a fresh, independent, read-only agent (a `Plan` subagent), on `62150ae`. Verdict: not clean (one blocker).
Red tests `56db448`, fixes `5518df9`:
1. **blocker:** the page printed each execution's end date, which REQ-RES-02 as amended forbids ("`site/index.html`
   … is the only page that holds a date") → **fixed**: no date on the page. This corrects the Design's "the date it
   ended", which contradicted the requirement; the requirement stands.
2. **should-fix:** an unchecked earlier campaign could name a page outside `site/` (`../../../x`), or crash the
   build → **fixed**: each execution must be `<campaign-id>/<n>`, and is otherwise refused, naming the file.
3. **should-fix:** a file not named after its earlier execution (a stray copy) overwrote a page and doubled a link →
   **fixed**: it is refused.
4. **should-fix:** rows and lists were not checked beyond a few fields, so a truncated file threw → **fixed**: every
   field the page reads is checked.
5. **should-fix:** rows were not grouped by category → **fixed**: a stable sort by category, then scenario, arm and
   model.
6. **should-fix (tests):** no test of the build refusing a bad comparison, of a landing page without comparisons, or
   of the link's escaping → **fixed**, all three.
7. **nit:** a noted side's kept value had no `n` → **fixed**: `75.0% (n = 1)`.
8. **nit:** "Not compared" items repeated "not compared:" → **fixed**: the prefix is dropped under that heading.
9. **nit:** a README line ran over its width → **fixed**: the paragraph is reflowed.

**Round 2**: a fresh, independent, read-only agent, on `06ee98c`.
- It verified the nine round-1 outcomes.
- It checked the shape against what task-083 writes. The acceptance test runs the real writer and then the build.
- It checked `site publish`'s fresh-build comparison, which still holds with comparisons.

Verdict: clean, with one optional nit, **no change**. The landing page's links follow file-name order, so `…-10` comes
before `…-2`. That order is deterministic, and it is the one the Design states.

### Full suites

`scripts/full-suites.sh task/task-084` on 2026-10-12, at the approver's request ("Avvia la suite"), on `1a8e675` (the
in-review submit), worktree clean: `LINT 0 TEST 0 BUILD 0 BIN 0 DOCKER 0`. `npm test` 1522 passed, 8 skipped, statement coverage 97.63 %; `test:bin` 8/8; `test:docker` 20 passed, 2 skipped. Log: `.cache/full-suites/2026-10-12/task_task-084-1a8e675-192956.txt`. The
commit after it adds only these notes.

**WingFoil command, declared vs observed:** `npx wingfoil memory submit task-084-…` on the branch: declared
in-progress → in-review; observed `{"from": "in-progress", "to": "in-review"}`, exit 0, one `wf(task): submit …`
commit (`1a8e675`). No task was `in-review` on main or on a task branch before it.

