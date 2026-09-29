---
id: task-036-s3-multi-session-evolution-scenario
type: task
title: "S3 multi-session evolution scenario"
status: done
release: v0.1
wave: W8
features: [F6.3]
acceptance: [scenarios.feature, scoring.feature]
requirements: [REQ-FMT-04, REQ-FMT-08, REQ-SCO-01, REQ-SCO-02, REQ-SCO-06]
---

## Context

Second task of wave **W8 — Continuity and governance** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)),
the S3 half of its "Ends with" ("S3 and S8 scored"). The W8 plan-phase decisions are in
[task-035](task-035-check-format-and-content-checks.md). It follows `scenario-authoring` from goal to
validate; calibrate and register are calibration's (decision 4).

Scope: **S3@1.0** as [S3.md](../../02_specification/scenarios/S3.md) (1.0) specifies it, in
`scenarios/S3/1.0/`:

- **Goal:** the card of S3.md §1 in `scenario.yaml` (primary F, secondary C; Q-F1, Q-F2, Q-C1; the
  profiles; `capabilities: []` — §8, no expected failure in any arm).
- **Seed** (§3): an empty TypeScript project as S1's, its README describing a windsurf school renting
  boards and sails; no rental code and no statement of D1–D5.
- **Prompts** (§6, README §3): five, one fresh session each. Step 1 states D1–D5 and says D5 is not to
  be implemented yet and "will be needed later", nothing about recording; step 3 restates none of
  D1–D5; step 4 asks for hourly rentals and says nothing about D3; step 5 gives the `cancel` contract
  and not the policy. Entry points as §4.
- **Oracle** (§7): hidden functional suites per step (quotes, bookings, availability, discounts, hourly
  rentals, cancellations), including the scripted decision checks that are outcomes — D1 and D2 forms
  on every returned value, D4 overlaps (mixed day/hourly after step 4), D3's whole-day behaviour kept
  after step 4, D5's refunds after step 5 — each a named test, so that W9's M-F1 can read them;
  **D3's revision as a content check** in task-035's format (step 4, format-neutral patterns, no
  harness path). The patterns must not appear in the prompts or the seed (the leak scan).
- **Hold-out additions** (§7): the exact 24-hour limit, the 3-day threshold, UTC day boundaries, the
  mixed day/hourly overlap matrix — only in `WingFoil2-Benchmark-HoldOut`, under the suite ids.
- **Reference solution** (public) in `test/fixtures/reference/S3/01..05/`, one per step, with the D3
  revision recorded in one form in the reference and exercised in another (a WingFoil decision-log
  and a plain notes file) by the @F4.8 test task-037 closes (W8 decision 3).
- **Acceptance:** `READY` in the @F6.1 @F6.2 @F6.3 @F6.8 outline gains S3.

Out of scope: M-F1 and M-F2 (F4.7, W9); real-agent dry runs (calibration).

**Done** means: `bench scenario validate S3@1.0 --holdout …` passes; S3 dry-runs in the three arms with
the fake replaying the reference and scores without errors, D3's content check passing; the outline's S3
row green; tests, coverage, lint pass.

## Acceptance criteria

Classification confirmed in the design phase. One criterion changed after task-035: the check patterns
are no longer oracle literals, so the prompt check replaces the literal scan for them. One criterion
was added: decision tests are named by decision.

- `scenarios.feature` @F6.3 (outline, S3 row) — validated, dry-run in each arm, and scored by the public
  oracle without errors. **red-first**
- S3.md §7 — the reference passes every public suite at its steps, and the seed passes none by accident
  (adr-004 decision 10). **red-first**
- S3.md §7 — D3's content check passes on the reference's step 4 and fails on a step 4 that records no
  revision (a silent change). **red-first**
- S3.md §5, §7 — every decision test is named `D<n>: …`, so that W9's M-F1 can read decisions by name
  from `score.json`. There is at least one such test for each of D1–D5, at the steps §5 lists.
  **red-first** (added in the design)
- REQ-FMT-08 / REQ-SCO-06 — S3's prompts and seed hold no oracle literal and no harness name, and step
  4's prompt does not satisfy D3's check (`scenarios.feature` @F3.2 on S3's prompt). **characterization**
- S3.md §7 hold-out — the additions pass on the reference's last step, and score apart, in counts.
  **characterization**

## Design

**Classification confirmed**, with the change and the addition above. As for S1 and S2, the outline's
criterion is automated twice:

- in `test/acceptance/` with the Docker doubles (`READY` gains S3);
- in `test/docker/` with the real scoring image, as the W8 wave check's S3 half (W8 decision 5).

S3.md needs no amendment. §4 leaves the request and response shapes to the prompts, and they are fixed
below.

### `scenarios/S3/1.0/`

```
scenario.yaml
seed/                 package.json, tsconfig.json, .gitignore, README.md
prompts/              01.md … 05.md
oracle/bookings/      bookings.test.mts
oracle/availability/  availability.test.mts
oracle/discount/      discount.test.mts
oracle/hourly/        hourly.test.mts
oracle/cancellation/  cancellation.test.mts
oracle/checks/        d3-revision.yaml
```

`scenario.yaml` holds S3.md's card:

- `categories: {primary: F, secondary: [C]}`;
- `profiles: [solo-developer, team-developer, architect]`;
- `gqm: [Q-F1, Q-F2, Q-C1]`;
- `capabilities: []` (§8: keeping decisions is what is measured, so no expected failure);
- `holdout: true`.

It declares five suites, one per feature, each one self-contained `.test.mts` file, since each is mounted alone. Each is scored from the step that introduces its feature to
the last, so a later step that breaks it shows. Their ids are also the hold-out's directory names:

| Suite | `after_steps` | What it holds |
|---|---|---|
| `bookings` | `[1, 2, 3, 4, 5]` | inventory, quotes, bookings; D1, D2 and D4 on them |
| `availability` | `[2, 3, 4, 5]` | the free equipment in a period; D2 on its query |
| `discount` | `[3, 4, 5]` | 10% off rentals of 3 days or more |
| `hourly` | `[4, 5]` | hourly rentals; D3 kept for whole days; D4 across day and hourly bookings |
| `cancellation` | `[5]` | refunds; D5 |

A decision test cannot sit in a suite scored before the step that tests it, since it would count as a
failure at the earlier steps. So the decisions live in the feature suites, and are **named by
decision**: `` `D1: ${…}` ``, `` `D3: …` ``. In W9, M-F1 reads, per decision, the tests of that name at
the final snapshot from `score.json` (`failed` lists every failing public test by name). S3 adds no
field and no metric. The names are template literals, so the leak scan does not take them for
literals.

### The contract (§4, fixed by the prompts)

Money and times appear only in the forms D1 and D2 require. The field names are neutral (`price`,
`total`, `refund`), so that D1 is a decision the agent keeps, and not a word it copies.

- **Step 1:**
  - `createRentalService()` returns a service with in-memory storage.
  - `service.addEquipment({ id, kind: 'board' | 'sail', dailyPrice })`.
  - `service.quote({ itemId, start, end })` returns `{ itemId, start, end, total }`.
  - `service.book({ itemId, start, end })` returns `{ id, itemId, start, end, total }`.
  - `start` and `end` are ISO-8601 UTC strings.
  - `quote` and `book` throw an `Error` for an unknown item, an invalid period, or (`book`) an
    overlapping booking.
- **Step 2:** `service.availability({ start, end, kind? })` returns the ids of the equipment free for
  the whole period, sorted.
- **Step 3:** rentals of 3 days or more get 10% off the total. The prompt's example prices divide
  exactly, and the tests use prices that do.
- **Step 4:**
  - `addEquipment` accepts an `hourlyPrice`.
  - A period that starts and ends on whole hours, but not on day boundaries, is an hourly rental,
    priced by the hour.
  - Whole-day periods are priced as before.
  - The prompt says nothing about D3 (§6).
- **Step 5:** `service.cancel(bookingId, at)` returns `{ bookingId, refund }`. The prompt gives the
  contract and not the policy (§6).

What the decisions mean in tests:

| ID | Tested as |
|---|---|
| D1 | every `total`, `refund` and price-derived value is an integer, in cents (e.g. 2 days at 2 500 → 5 000) |
| D2 | every returned `start`/`end` is an ISO-8601 UTC string ending in `Z`, equal to the instant requested |
| D3 | before step 4: a period that is not whole UTC days is refused. After step 4: whole-day bookings are priced and overlap-checked as before (outcome), and the revision is recorded (the content check) |
| D4 | an overlapping booking of the same item is refused; adjacent periods are not; after step 4, a day booking and an hourly booking overlapping on the same item are refused both ways |
| D5 | after step 5: a cancellation 24 hours or more before the start refunds the whole total, and less than 24 hours refunds nothing |

A D3 test at steps 1–3 ("a period that is not whole days is refused") is in `bookings`, which is also
scored at steps 4 and 5. There the refusal is exactly what step 4 revises. So that test is written for
**a period that is neither whole days nor whole hours** (e.g. 10:30 to 12:00). It is refused before
step 4 and after it. The whole-hour refusal that step 4 lifts is not in any public suite: the suite
would have to change meaning at step 4, and D3's revision is the content check's job.

### The seed (§3, K3)

It follows S1's seed:

- `package.json`: `"type": "module"`, no dependency, and `"test": "node --test"`, which finds no test
  and exits 0.
- `tsconfig.json` and `.gitignore`: the same as S1's.
- `README.md`: a paragraph about a windsurf school renting boards and sails, as §3 asks. It holds no
  rental code and states no decision.
- No `src/`.

### The prompts (§6, README §3)

Five, in a product owner's voice, with no harness, no tool and no word about keeping records:

1. States D1–D5 as the school's rules, and the step-1 contract. It says the cancellation policy (D5) is
   not to be implemented now and "will be needed later".
2. The `availability` contract.
3. The discount rule, restating none of D1–D5.
4. Hourly rentals with an hourly price, and nothing about whole days.
5. The `cancel` contract, and not the policy.

Their final text is written in the build and read at review. The validator checks the leak scan, and
checks that prompt 4 does not satisfy D3's check.

### D3's content check (REQ-SCO-06, task-035)

`oracle/checks/d3-revision.yaml`, at step 4, with two groups:

- one naming the decision: `whole day`, `whole-day`, `whole days`, `full day`, `full-day`,
  `entire day`, `daily only`, `days only`;
- one naming a revision: `revis`, `supersed`, `replac`, `no longer`, `instead of`, `now also`,
  `amend`, `changed`, `update`.

The two must match in one file or one commit message of step 4. Prompt 4 names neither whole days nor
a revision, so the loader accepts the check.

Known limit, as S3.md §9 foresees: a comment in step 4's code that says "whole-day bookings are no
longer the only kind" counts as a record. The check asks only that *some* record of the revision
exists (format-neutral, F4.8). It does not measure how good the record is.

### The reference solution (public)

`test/fixtures/reference/S3/01..05/`. S3's oracle is public, unlike S2's answer key. It holds:

- step 1: `src/index.ts` and a small domain module, D5 left out, and a `DECISIONS.md` recording D1–D5 as
  a careful developer would;
- step 2: `availability`;
- step 3: the discount;
- step 4: hourly rentals, with `DECISIONS.md` recording D3's revision. A silent variant (the same step 4
  without that record) is built in the tests, not stored;
- step 5: `cancel` with D5.

The fake replays it through `referenceScript`, and `referenceRun` gives the checks' tests a real run.

### Hold-out additions (§7, K2) — in `WingFoil2-Benchmark-HoldOut` only

`scenarios/S3/1.0/<suite>/*.test.mts` under the suite ids:

- `cancellation`: exactly 24 hours before the start, and one second less;
- `discount`: 2 days against 3 days;
- `bookings` and `hourly`: UTC day boundaries, and the mixed day/hourly overlap matrix.

They are written with the public suites' rules. This task records their count and the hold-out's
commit, never their content.

### Tests

- **Unit, `test/unit/scenarios/s3.test.ts`, local scoring double** (as S1 and S2):
  - the seed passes no test of any suite;
  - each reference step passes every test of the suites scored at it;
  - every decision D1–D5 has a `D<n>:` test at the steps §5 lists;
  - D3's check passes on the reference and fails on the silent variant (`referenceRun`, `scoreChecks`);
  - with the hold-out, its additions pass after step 5 and fail on the seed.
- **Acceptance:** `READY` gains `S3` in the @F6.1 @F6.2 @F6.3 @F6.8 outline. The `scenarios.feature`
  @F3.2 scenario "a step prompt of S3 that mentions WingFoil" already runs on T3 standing in for S3. It
  stays as it is.
- **Docker, "W8 (task-036): S3"**, in the three arms (wingfoil `skipIf` there is no clone):
  - a dry run with the fake replaying the reference, scored by the real image;
  - each suite at its steps all passing;
  - D3's check passing at step 4 on `DECISIONS.md`.
- **By hand:** `bench scenario validate S3@1.0 --holdout ../WingFoil2-Benchmark-HoldOut`, its line in
  the build notes.

No real agent and no spending (W8 decision 5).

## Execution notes

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "…"` → `73fbca2`. Declared: one commit
  `wf(task): add <id>`, one new file from the template, `status: draft`, id from `task-{n}-{slug}`.
  Observed: exit 0, exactly that commit, 1 file, body identical to the template. Matches.
- Content filled and committed by hand in `docs(task): scope the W8 tasks of release v0.1` (`b8df60c`),
  so that `submit` carries only the state change (usage note N13).
- `npx wingfoil memory submit task-036-s3-multi-session-evolution-scenario` → `aeedd31`. Declared: `draft → pending`, required fields checked, one
  commit `wf(task): submit <id>`. Observed: exit 0, 1 file, diff limited to `status: draft` →
  `status: pending`. Matches (subject without transition: N9).
- `npx wingfoil memory approve … [pending → backlog]` → `9af9c2c`, run by the approver.
- Design committed by hand on `task/task-036-s3-multi-session-evolution-scenario` (`561e2f9`), in a
  linked worktree with its own install (N13).
- `npx wingfoil memory submit task-036-s3-multi-session-evolution-scenario` → `5cbd956`. Declared:
  `backlog → in-progress`, one commit `wf(task): submit <id>`. Observed: exit 0, 1 file, diff limited to
  `status: backlog` → `status: in-progress`. Matches (N9).

### Build

Commits:

- `27536f8`: the tests, red — S3 missing, and the outline's S3 row.
- `2cc9107`: S3@1.0 and its public reference.
- Hold-out `15f6d29`: four files of additions (below).

**As designed**, with these points found in the build:

- **The suites, in census counts.**

  | Suite | Tests |
  |---|---|
  | `bookings` | 11 |
  | `availability` | 5 |
  | `discount` | 4 |
  | `hourly` | 10 |
  | `cancellation` | 7 |

  That is 37 in all. Every decision has named tests: D1 and D2 in `bookings` (and D1 in `discount`,
  `hourly` and `cancellation`), D3 in `bookings` and `hourly`, D4 in `bookings`, `availability` and
  `hourly`, D5 in `cancellation` only.
- **No D2 test in `availability`.** The design's table had one ("D2 on its query"). The query returns
  ids, not times, so there is nothing of D2's to check in its answer. D2 is checked on every period the
  API returns, in `bookings` and `hourly`.
- **The leak scan found two describe names:** `'availability'` and `'cancellation'`, words of prompts 2
  and 1. They became `'free equipment'` and `'cancelling a booking'`. In the hold-out, the suite names
  in backticks in the header comments were quoted strings too, and are now plain words.
- **The reference's step-4 code has no word of revision.** A first version commented `// D3, revised:`
  next to an error message saying "whole days". D3's check matched it, so the silent variant passed,
  which is exactly S3.md §9's known limit (a comment counts). The comment now says only what the code
  does, and the record is in `DECISIONS.md` alone. The silent variants fail:
  - step 4 leaving `DECISIONS.md` as step 1 wrote it;
  - step 4 deleting it.
- **The reference is generated from one template**, with blocks per step, so the five versions of
  `src/rentals.ts` cannot drift apart. The template is not kept, since the five files are what is
  reviewed.
- **The hold-out additions**, in counts:

  | Suite | Tests | What they check |
  |---|---|---|
  | `bookings` | 3 | a month end; a `+02:00` midnight refused (D2); back-to-back at midnight UTC |
  | `discount` | 2 | exactly 2 and 3 days; a week across a month end |
  | `hourly` | 10 | the mixed day and hourly overlap matrix |
  | `cancellation` | 2 | exactly 24 hours, and one second short |

  After step 5 they all pass, and on the seed none does.
- **Two timeouts raised, test code only:**
  - S1's unit tests had no `describe` timeout, so they had Vitest's default of 5 s, while S2's had 120 s
    for the same kind of real runs. With S3's tests in the same run, four of them timed out; this is
    also what the task-035 build saw once. They now have 120 s, as S2's do.
  - The @F6.x outline test took 173 s alone with S1–S3, and more than its 240 s under a full run. Its
    limit is now 600 s, which leaves room for S8.

**Checks:**

- `bench scenario validate S3@1.0 --holdout ../WingFoil2-Benchmark-HoldOut` on the built CLI →
  `scenario S3@1.0 is valid (hold-out: 4 files)`. Without the hold-out: `(hold-out: not configured)`.
- `npm test`: 922/922 (+8). Coverage 99.08% statements, 94.73% branches, 99.9% lines.
- `npm run typecheck` and `npm run lint`: clean.
- `npm run test:docker -- -t S3`: 2/2. S3 ran in baseline, baseline-docs and wingfoil, scored by the real
  image. Each suite passed at its steps, and D3's check passed at step 4 on `DECISIONS.md`.
- `npm run test:bin`: 5/5.
- `npm run test:docker`: 13/13 (+2), with no `bench-` container left.

No real agent, no spending. No `wingfoil` command in the build phase.

### Review

- `npx wingfoil memory submit task-036-s3-multi-session-evolution-scenario` → `aeac5fb`. Declared: `in-progress → in-review`, one commit `wf(task): submit <id>`. Observed: exit 0, 1 file,
  diff limited to `status: in-progress` → `status: in-review`. Matches (N9).
- Traceability: `features: [F6.3]`, `acceptance: [scenarios.feature, scoring.feature]` (scoring's @F4.8 on
  S3 is task-037's), requirements as scoped. No amendment: S3.md is followed as written.
- **For the approver's review:**
  - the prompts' text (`scenarios/S3/1.0/prompts/`);
  - the D3 test in `bookings` on a period off the hour (the design's choice);
  - the timeouts raised in S1's unit tests and the outline test.

### Approval

- `npx wingfoil memory approve task-036-s3-multi-session-evolution-scenario --reason "…"` → `1813e8c`, run
  by the approver (`in-review → approved`, `Approver:`/`Reason:` trailers, only `status` changed). Matches.
- Its reason is the review decision, 2026-09-29: S3@1.0 accepted — prompts, five suites with decisions
  named D1–D5, D3's revision check, hold-out additions — and the test timeouts raised.
