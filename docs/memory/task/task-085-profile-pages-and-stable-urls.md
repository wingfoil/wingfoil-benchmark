---
id: task-085-profile-pages-and-stable-urls
type: task
title: "Profile pages and stable URLs"
status: in-progress
release: v0.2
wave: W14
features: [F5.7]
acceptance:
  - "comparison.feature#A result profile filters the landing page"
  - "comparison.feature#A published link keeps showing the same values"
requirements: [REQ-RES-08, REQ-RES-02, REQ-RES-04]
fixes: []
---

## Context

F5.7, for Dana (the adoption decider, persona 2), served from this release.

**Scope:**
- REQ-RES-08: `site-content/profiles.yaml`, copied and versioned from `docs/01_vision/04_personas.md` §2; for each
  profile, `profile-<profile>.html`: the landing page restricted to its categories, with a headline generated over
  them only; no client script;
- **stable URLs:** every execution, comparison and profile page keeps its URL across later publications, and a
  published page keeps its values (the scenario "A published link keeps showing the same values"): checked against
  what `bench site publish` (REQ-RES-04) keeps on `gh-pages`.

**Done** means: both scenarios' tests green with the fake agent.

**Wave:** W14 ("Comparison and Dana"), planned by the approver on 2026-10-10 ("Sì, come proposto"), eight tasks delivered one at a time: task-079 → task-086. W14 ends with "a second public campaign compared with the first": verified offline with the fake agent (a second execution compared with the first, as W12 and W13 were); the real second public campaign is plan-004's reference-campaign step.

**No real agent, no spending**: every test runs the fake agent.

## Acceptance criteria

- `comparison.feature#A result profile filters the landing page`: **red-first**. There is no `profiles.yaml` and no
  profile page yet.
- `comparison.feature#A published link keeps showing the same values`: **red-first** for its second line. Today
  `site/index.html` is a `meta` refresh to the execution built last, so it lists neither execution nor any date. Its
  first line (an earlier execution's pages keep their address and bytes when another is built) holds today and is
  pinned by the same test.

## Design

**Fixes:** none.

**1. `site-content/profiles.yaml`** (REQ-RES-08): personas §2's table, copied and versioned.
- Each profile has an `id` (the kebab-case form the scenarios' `profiles:` use, e.g. `solo-developer`), the `name` of
  the table, and its `categories` (A–G).
- A header comment names the source and its version: `docs/01_vision/04_personas.md` §2, version 1.0.
- A test parses the personas table and asserts that the file says exactly the same thing, so that the copy cannot
  drift unnoticed.
- The build reads it as it reads `method.md`. A missing or malformed file refuses the build, naming it: unique ids,
  known categories.

**2. `profile-<id>.html`** (REQ-RES-08), one per profile:
- it is the landing page restricted to the profile's categories: its rows, its comparisons, and so its headline
  (REQ-RES-03's rules over those categories only) and its chart (only those categories' scenarios). The categories
  not covered are named among the profile's only;
- the heading names the profile, and links back to the execution's landing page;
- it is pre-rendered, with no script (REQ-RES-02);
- the landing page links each profile page in a "Views by profile" list. This list is a new section on every landing
  page: presentation, which REQ-RES-02 as amended allows a rebuild to add;
- the rendering reuses the landing page's own code with a restricted model, so that the two cannot diverge.

**3. The root index** (REQ-RES-02 as amended):
- `site/index.html` lists every execution built under `site/`, by campaign and execution, linking `<id>/<n>/`, with
  the date it ended read from that execution's `results/<id>/<n>/execution.json`, never the build's clock;
- an execution without `execution.json` (v0.1's) reads "end date not recorded";
- the list is sorted by campaign then execution, so the same `site/` gives the same bytes;
- it is the only page that holds a date: the existing "no date" test is kept for every other page;
- `buildSite` writes it from the executions present under `site/` after the build;
- a pure `rootIndexPage(root, executions)` computes it, so that `site publish`'s check (REQ-RES-04 as amended) can
  compare `site/index.html` with the index of the executions it finds. Today it compares it with the `meta` refresh
  of one fresh build.

**4. Stable URLs** (REQ-RES-02's permanent URL, the scenario's first line):
- building one execution replaces `site/<id>/<n>/` only, and leaves every other execution's pages as they are;
- the test builds and publishes an earlier execution, then builds and publishes a newer execution of another
  campaign;
- it checks that every page of the earlier one on `gh-pages` keeps its path and bytes;
- it checks that the root index lists both, each with its end date.

**5. Not here:** the site's publication itself (plan-004 step 6).

**Tests** (red first):
- **Acceptance**, `test/acceptance/comparison.test.ts`: both scenarios, over the site fixture's execution and a second
  one of another campaign, with `execution.json` files carrying `ended`.
- **Unit:**
  - `profiles.yaml` against the personas table;
  - a malformed `profiles.yaml` refusing the build;
  - a profile page restricted to its categories, with its headline;
  - a profile with no covered category;
  - the root index's order, dates and "not recorded";
  - `checkSiteCopy` accepting a fresh root index of two executions, and refusing a stale one.
## Execution notes

**WingFoil commands, declared vs observed:** `npx wingfoil memory submit task-085-…` on main (`d53eecb`), after the
Design's own commit (`69fba65`, W-01): declared backlog → in-progress; observed `{"from": "backlog", "to":
"in-progress"}`, exit 0, one `wf(task): submit …` commit (W-14).

**Build** on `task/task-085` (worktree `../WingFoil2-Benchmark-wt/task-085`, its own `npm ci`):
- red first:
  - `9f91e65`: the two acceptance scenarios. The stable-URL one builds and publishes the site fixture's execution, then a
    second execution of another campaign, both with `execution.json`. Its first line, an earlier execution's pages
    keeping their bytes, already held. It failed on the root index.
  - `e35cc06`: unit tests for `profiles.yaml` against the personas table, a malformed file, the root index, a profile
    with no covered category, and a build without `profiles.yaml`.
  - After the red commit, the acceptance headline expectation was corrected to the headline's real form, which ends
    with its "(preliminary: …)" clause.
- `3d85081`, the implementation:
  - `site-content/profiles.yaml`;
  - `src/site/profiles.ts`, holding `loadProfiles`, `rootIndexPage` and `builtExecutions`, the last moved from
    `publish.ts`;
  - `profilePage`, plus `landingContent` shared with the landing page;
  - `buildSite` writes the profile pages and the root index;
  - `checkSiteCopy` compares `site/index.html` with the root index of the executions it finds;
  - the README.
  - Three tests pinned the old behaviour and are amended in the same commit: the build's page list and page count,
    the root page's `meta` refresh, and the publish commit's message.
- Checks, niced with 2 workers: `tsc` and `npm run lint` clean, `test/unit` and `test/acceptance` green (1529 passed,
  8 skipped).

**Decisions taken in the build, inside the Design:**
- The profile page's heading is `<profile>: <categories>`, and the page links back to the landing page. The
  "Compared with" and "Views by profile" sections stay on the landing page only.
- The publish commit says `The root index lists <n> execution(s).`, since there is no longer one execution the root
  page leads to.
- `rootPage`, the `meta` refresh, is removed.

## Review notes

### Review

**Round 1**: a fresh, independent, read-only agent (a `Plan` subagent), on `dce24b5`. Verdict: not clean (five
should-fix). Red tests `011b5e2`, fixes `a334268`:
1. should-fix: an `execution.json` that could not be read was shown as "end date not recorded" → **fixed**:
   `rootIndex` refuses it, an end that is not a date, and a built execution whose `results/` is gone, naming each.
   `buildSite` reads all of it before writing anything.
2. should-fix: the stale-index remedy named every execution, which `site build` does not take → **fixed**: it names
   one, since any build rewrites the index.
3. should-fix: no test refused a stale root index → **fixed**.
4. should-fix: `site/` is git-ignored, so publishing from a fresh clone with only the newer execution built would have
   removed the earlier execution's pages from `gh-pages`, breaking its permanent URL → **fixed**: publish lists the
   executions the fetched `gh-pages` holds and refuses to drop one, naming the build to run. The behaviour predates
   this task, but this task is the one that claims the guarantee.
5. should-fix: a profile page showed the whole execution's run counts and runs not run → **fixed**: its own runs,
   slices apart, and its own runs not run. The arm columns stay the execution's, so that every page of an execution
   shows the same arms.
6. nit: the full timestamp was printed → **fixed**: the day (`ended 2026-10-05`), checked to be a date.
7. nit: numeric ordering and date-free profile pages were untested → **fixed**: `/10` after `/2`, and the profile
   pages checked with an `execution.json` that holds dates.
8. nit: REQ-RES-04's 1.22 text still speaks of "the root page of the execution it leads to" and of a commit "naming
   the root page's execution". The 1.26 amendment only says the check accepts the new page kinds. **Recorded** as a
   follow-up for the approver: a wording amendment of REQ-RES-04 to the root index. The code follows REQ-RES-02 as
   amended in 1.26, which replaced the `meta` refresh.

