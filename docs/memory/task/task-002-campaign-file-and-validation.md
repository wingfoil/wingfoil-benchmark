---
id: task-002-campaign-file-and-validation
type: task
title: "Campaign file and validation"
status: in-review
release: v0.1
wave: W1
features: [F1.1]
acceptance: [campaign.feature]
requirements: [REQ-FMT-01, REQ-FMT-02, REQ-FMT-03, REQ-CLI-01, REQ-RUN-16, REQ-ARC-03, REQ-ARC-05, REQ-NFR-04]
---

## Context

Second task of wave **W1 — Skeleton** of release v0.1 ([rel-v0-1](../release/rel-v0-1.md)). It
depends on task-001 (package and scenario loader).

Scope of F1.1: the Zod schema of `campaigns/<name>.yaml` (REQ-FMT-01, including the mandatory
baseline arm and the Opus comparison slices), campaign identity as the first 12 hex characters of the
SHA-256 of the canonical JSON (REQ-FMT-02), the execution numbering `<campaign-id>/<n>`, refusal of
unpinned harness versions (REQ-FMT-03), a pinned `agent.version` (REQ-RUN-16), and the first command,
`bench campaign validate <file>` (REQ-CLI-01), with exit codes 0 / 1 / 2. The `cli` and `campaign`
modules are created here and added to `.wingfoil/dna.yaml` (REQ-ARC-05).

Validation also checks that every scenario the campaign names exists and loads (task-001).

Out of scope: the `Background` of `campaign.feature` (recorded dry-run costs) serves F1.2 and F1.3
(W5), not F1.1. The third F1.1 scenario ("the same campaign file identifies the same campaign … as a
new execution") is covered here at the level of identity and execution numbering. Its end-to-end form,
with stored results, is checked by task-003.

**Done** means: `bench campaign validate` accepts the example campaign of `campaign.feature` and
prints its identity; it rejects an unpinned harness naming the arm and the field; tests, coverage and
lint pass.

## Acceptance criteria

Classification confirmed in the design phase. All behaviour is new: **red-first**.

- `campaign.feature` @F1.1 "A campaign file pins every variable" — accepted, identified by a digest of
  its content. **red-first**
- `campaign.feature` @F1.1 @error "A campaign with an unpinned harness is rejected" — the message names
  the arm and the unpinned field. **red-first**
- `campaign.feature` @F1.1 "The same campaign file identifies the same campaign" — identity is stable
  under key reordering and formatting (canonical JSON); the next execution number follows the ones
  already stored. **red-first**
- REQ-FMT-01 error path — a campaign without the baseline arm is rejected. **red-first**
- REQ-FMT-03 — `latest` and branch names are rejected; released versions and commit SHAs are accepted.
  **red-first**
- REQ-CLI-01 — exit 0 on a valid file, 1 on an invalid one, 2 on a usage error. **red-first**

## Design

Conventions from [adr-001](../adr/adr-001-w1-toolchain-and-runner-conventions.md). Builds on task-001's
`core` (`Result`, `Issue`, `formatPath`) and `scenario` (`loadScenario`).

### Modules created (REQ-ARC-01, REQ-ARC-05)

- **`core`** gains `campaign.ts` (the Zod schema of the campaign file, its types, and
  `campaignConsistency`), `canonical-json.ts`, and `yaml-file.ts` (`readYamlFile`, `parseWith`), the
  file reading and issue mapping shared with the scenario loader, which now uses them.
- **`campaign`**: `loadCampaign(file): Result<Campaign>` (read, parse, validate, check consistency,
  compute the identity, locate `scenarios/` and `results/`) and `campaignId(data)`. It does **not**
  load scenarios: `campaign` may not import `scenario` (REQ-ARC-02).
- **`results`**: `nextExecution(resultsRoot, campaignId): number` (REQ-FMT-02 numbering, over the
  layout of REQ-FMT-06). It lives here because the executions are the results' directories; the
  runner (task-003) and the CLI use it.
- **`cli`**: `checkCampaign(file)` (the campaign plus every scenario it names, loaded), `main(argv, io):
  Promise<number>` (the exit code), and `src/cli/main.ts`, the `bench` bin. The runner (task-003) may
  need `checkCampaign` too; it can move to `runner`, which may import both `campaign` and `scenario`.

`.wingfoil/dna.yaml` lists `campaign`, `results` and `cli` (hand edit, N14).

### Campaign file (REQ-FMT-01, REQ-FMT-03, REQ-RUN-16)

| Field | Rule |
|---|---|
| `harnesses` | map arm → `{ tool, version, commit? }`; **one entry per arm except `baseline` and `baseline-docs`, which must have none** (dl-003, checked with `Object.hasOwn`, so an arm named after a property of `Object.prototype` cannot inherit one); `version` is a released version (semver with optional prerelease and build metadata, optionally `v`-prefixed, no leading zeros) or a commit SHA (7–40 hex); `commit`, when given, is a 40-hex SHA that starts with `version` when `version` is a SHA; `latest`, branch names, ranges and a version YAML reads as a number are rejected with a message naming the arm and the field |
| `scenarios` | non-empty list of `{ id, version }` (the scenario id and version patterns of task-001), no duplicates |
| `arms` | non-empty list of kebab-case names, no duplicates, **must include `baseline`** (T7) |
| `agent` | `{ name, version }`; `name` is `claude-code` or `fake` (adr-001 default 7); `version` is a released version (semver), never `latest` |
| `models` | `{ default, slices? }` (dl-003 decision 3); `default` is a model id; each slice is `{ model, scenarios, arms, repetitions }`, whose scenarios and arms are among the campaign's, without duplicates, whose model is not the default, and no two slices cover the same model, scenario and arm |
| `repetitions` | map scenario id → integer ≥ 1, with exactly one entry per campaign scenario |
| `approver_policy` | a version such as `v1` |
| `caps` | `{ step_time_s, step_tokens, run_cost_eur }`, all positive |
| `budget` | `{ warn_eur, ceiling_eur }`, positive, `warn_eur ≤ ceiling_eur` |
| `currency` | `{ usd_to_eur }`, positive |

Unknown keys are rejected at their own path (as for scenarios). Cross-field rules (harness and slice
arms, slice scenarios, one repetition count per scenario) are checked only once the schema passes, so
one wrong field does not cascade into issues about the fields that refer to it. Model ids are not checked against a
list: the campaign pins them, the agent refuses unknown ones at run time.

The scenario seed is pinned through `scenario@version`, not by a campaign field (dl-003 decision 2).

**Scenarios exist** (checked by `checkCampaign` in `cli`). The scenarios root follows REQ-ARC-03, and
the campaign file must live in a `campaigns/` directory, so that the roots it derives are inside the
repository: `campaigns/<name>.yaml` sits next to `scenarios/`, so the root is `<campaign file
directory>/../scenarios`. Each scenario is loaded with `loadScenario`; its issues are reported as
`scenarios[<i>]: <id>@<version>: <path> <message>`. This also
lets the fixture `test/fixtures/campaigns/smoke.yaml` use `test/fixtures/scenarios/`, with no extra
option.

Arm definitions (`arms/<arm>/arm.yaml`, REQ-FMT-05) arrive in W3, so arm names are not checked
against directories yet.

### Identity and executions (REQ-FMT-02)

- `canonicalJson`: the parsed YAML value serialized as JSON with object keys sorted at every level by
  UTF-16 code unit (JavaScript's default order, as RFC 8785 prescribes), arrays in their order, no
  whitespace. The identity is computed on the parsed file, not
  on the schema's output, so defaults the schema may add never change it.
- `campaignId`: the first 12 hex characters of the SHA-256 of that text. Formatting, comments and key
  order in the YAML do not change it; any value change does.
- `nextExecution(resultsRoot, id)`: 1 + the highest `n` among the directories `results/<id>/<n>/`
  whose name is a positive integer no larger than `Number.MAX_SAFE_INTEGER` (other entries ignored;
  symbolic links to directories count, broken ones do not), or 1 when there is none. A results
  directory that exists but cannot be listed throws, naming the directory: a broken environment is not
  a campaign that fails validation. The results root
  is `<campaign file directory>/../results`, by the same layout rule.

### `bench campaign validate <file>` (REQ-CLI-01)

- Valid: prints `campaign <id> is valid (<n> scenarios, <m> arms)` to stdout (singular for 1), exit 0.
- Invalid (schema, pins, scenarios, file not found or not YAML): one line per issue on stderr,
  `<path>: <message>`, exit 1.
- Usage error (no file, an empty or option-like file argument, extra arguments, unknown command or
  subcommand): usage text on stderr, exit 2. `bench --help` and `bench -h` print the same text on
  stdout and exit 0: asking for help is not an error.
- A campaign naming the `claude-code` agent validates: F1.1 requires it. Refusing to *run* an agent
  that has no adapter yet (adr-001 default 7) belongs to `campaign run`, in task-003.
- The argument parser is a small hand-written router (two words and one positional); no dependency.
- `main` takes its output streams as parameters, so tests run it in-process. `src/cli/main.ts` only
  calls it with `process.argv` and sets `process.exitCode`.

### Tests

- Acceptance (`test/acceptance/campaign.test.ts`): the three `@F1.1` scenarios, against a temporary
  repository layout (`campaigns/`, `scenarios/S1…S8/1.0/`, `results/`) built from task-001's fixture
  helpers.
- Unit: schema rules (each row above, happy and error paths), canonical JSON and identity, execution
  numbering, CLI exit codes and output.
- The built bin is not run by `npm test` (it needs `npm run build`), and `src/cli/main.ts` is
  excluded from coverage: importing it in a test would run the CLI with Vitest's own arguments. In review, `npm run build` then
  `npx bench campaign validate test/fixtures/campaigns/smoke.yaml` is run and its output recorded.
- Fixture: `test/fixtures/campaigns/smoke.yaml`, the trivial campaign (scenario T0, arm `baseline`,
  agent `fake`), used again by task-003.

## Execution notes

### Build

- **Design error caught by the lint rule:** the first implementation loaded scenarios inside
  `loadCampaign`, as the Design said; `bench/module-boundaries` reported
  "module 'campaign' must not import 'scenario' (REQ-ARC-02)". Scenario checks moved to `cli`
  (`checkCampaign`), the Design above was corrected, and the tests were adapted (`ba48a56`).
- **Cascading issues:** cross-field checks written as a Zod `superRefine` ran even when base fields were
  invalid, so one bad arm name produced three issues. They became `campaignConsistency`, run after the
  schema passes.
- **Found by running the bin:** "1 scenarios, 1 arms"; fixed test-first.
- **Commit history, correction:** the commits up to `d6b4006` were split from a finished working tree,
  not written in the order they suggest. `ba48a56`, labelled "(red)", fails only because the modules
  it imports do not exist yet, not for the reasons its message gives; the first implementation that
  broke the REQ-ARC-02 lint rule and the "1 scenarios" bug are not in the history at all. The plural
  test was seen failing before the fix, but the history does not show it. From `d0a0da7` on, every red
  test is committed before the code that makes it pass, and each red run is quoted in these notes.
- **Bin check (after `npm run build`):** `npx bench campaign validate test/fixtures/campaigns/smoke.yaml`
  → `campaign 9491f7cd4bb7 is valid (…)`, exit 0; the same command on a scenario file → one line per
  issue, exit 1; `npx bench` → the usage, exit 2. (This note first claimed the bin ran although `tsc`
  does not make it executable; review round 1 disproved it.)

### Review, round 1

- **Reviewer:** an independent reviewer that did not write the code, read-only, each finding proven by
  a probe.
- **Result:** 1 blocker, 3 majors, 8 minors and nits.
- **Blocker, reproduced by the author:** after a clean `npm run build`, `npx bench` failed with
  `Permission denied` (exit 127), because `tsc` does not set the execute bit. The Execution note that
  claimed the bin ran was wrong. Fixed test-first: `test/bin/bench.test.ts` (red `21674be`, `cff2dd3`)
  builds and runs the bin through `npx`, and `npm run build` now sets the mode
  (`scripts/make-bin-executable.mjs`). `npm run test:bin` runs those tests, outside `npm test`.
- **Major 1 (approver decision A):** a campaign with a `wingfoil` arm and `harnesses: {}` was accepted.
  Now every arm but `baseline` and `baseline-docs` must pin a harness, those two must not, and a
  `commit` must extend a SHA `version` ([dl-003](../decision-log/dl-003-campaign-pins-harness-coverage-seed-and-the-models-shape.md)).
- **Major 2 (approver decision B):** F1.1 lists a "seed" the schema rejects, and `models` is an object
  where REQ-FMT-01 says list. Recorded in dl-003, with amendments to requirements and features due.
- **Major 3:** the commit history was not honest; see the correction above.
- **Minors and nits fixed:** versions with leading zeros or read as numbers; slices that repeat work;
  YAML problems spanning several lines and YAML warnings printed outside the issue format; campaign
  files outside `campaigns/`; `nextExecution` and symlinks, unsafe integers and unreadable
  directories; `--help` treated as a usage error and empty or option-like file arguments; exports
  nothing used; missing doc comments; the "code point" claim about the key order, which is UTF-16.
- **Characterization tests:** a harness without a version and a broken symlink in `nextExecution`
  (both added after the code, to cover a branch); the astral-plane key in `canonicalJson` is in the
  red commit `762733a`, where it already passed.
- **Checklist (at `aaf940f`):** `npm test` 227/227; coverage 100% statements, lines and functions,
  99.5% branches (the one branch left is task-001's guard in the lint rule); `npm run lint` and
  `tsc --noEmit` clean; `npm run test:bin` 4/4 against the built bin.

### Review, round 2

- **Result:** 1 major, 3 minors, 6 nits; the blocker and 11 of 12 round-1 findings confirmed fixed.
- **Major, and the lesson of this task:** `npm run lint` failed on the **committed** tree, because
  `eslint.config.js` (the Node globals for `scripts/`) was only in the working tree. Every "lint
  clean" claim before that was true of the working tree, not of what a reviewer would check out.
  Fixed (`94bd009`, `a3ed293`), and from now on the review checklist is run on an export of HEAD
  (`git archive HEAD | tar -x -C <dir>`, `node_modules` symlinked): lint 0, tests 230/230 there.
- **Fixed** (red `6ed171f`, `cf43252`, then `787e1bf`, `4b08d4b`):
  - an arm named `constructor` inherited a harness from `Object.prototype`, so the coverage rule was
    bypassed: now `Object.hasOwn`;
  - a validated `version` was typed `unknown`, so task-003 would have had to cast the pin: the schema
    now states it is a string, which the type-check enforces;
  - slice coverage cascaded onto scenarios and arms already reported;
  - build metadata (`1.2.3+build`) is valid semver and is now accepted;
  - the bin script explains a missing `dist/`;
  - the bin test asserts the mode straight after an explicit build, because `npx` repairs the mode
    itself in some layouts and could hide a build that does not set it.
- **Documented, not changed:** a campaign with only `baseline` and `baseline-docs` pins no harness,
  although baseline-docs is generated from the wingfoil arm's configuration (W3, F2.5, closes this);
  hex words that are also branch names stay accepted (dl-003).
- **Open, for the approver:** dl-003 is `pending`, and the validator is already stricter than
  REQ-FMT-01 1.1. Its amendments (requirements 1.2, features 1.3) follow its approval.
- **Checklist (at `4b08d4b`, on an export of HEAD):** `npm test` 232/232; coverage 100% statements,
  lines and functions, 99.5% branches; `npm run lint` and `tsc --noEmit` clean; `npm run test:bin`
  4/4 against the built bin.

### Review, round 3

- **Result:** round-2 findings A, B, C, F fixed; D partly; E open (dl-003 awaits the approver). One new
  **blocker, caused by a round-2 fix of mine**: dropping the `typeof version !== 'string'` guard
  (trusting the new transform) meant that a harness pinning a `commit` with a missing, null or numeric
  `version` made the validator throw `TypeError: … reading 'padEnd'` instead of returning an issue.
  The object-level check runs even when the field's own check failed, so the value may be anything the
  file held. Fixed test-first (red `1fa45d2` → `e3fbc34`), with cases for `undefined`, a number and
  `null`.
- **D:** the bin test now removes `dist/` before building, because `tsc` keeps the mode of a file it
  overwrites, so an already executable `dist/` would have hidden a build that does not set it.
- **Lesson:** coverage said 100% while this crash was reachable, because the existing tests covered the
  line with a valid version. Coverage counts lines, not the states a value can be in.
- **Checklist (at `e3fbc34`, on an export of HEAD):** `npm test` 235/235; coverage 100% statements,
  lines and functions, 99.5% branches; `npm run lint`, `prettier --check` and `tsc --noEmit` clean;
  `npm run test:bin` 4/4 against the built bin.

### WingFoil commands (declared vs observed)

- `npx wingfoil memory add --type task --title "…"` → `742654a`. Declared: one commit
  `wf(task): add <id>`, one new file from the template, `status: draft`, id from `task-{n}-{slug}`.
  Observed: exit 0, empty stderr, exactly that commit, 1 file, body identical to the template. Matches.
- Content filled and committed by hand in `docs(task): scope the W1 tasks of release v0.1`, so that
  `submit` carries only the state change (usage note N13).
- `npx wingfoil memory submit task-002-campaign-file-and-validation` → `2d88edd`. Declared: `draft → pending`, required fields checked,
  one commit `wf(task): submit <id>` with no bracket and no body. Observed: exit 0, empty stderr, 1 file,
  diff limited to `status: draft` → `status: pending`. Matches (subject without transition: N9).
- `npx wingfoil memory approve task-002-campaign-file-and-validation --reason "…"` → `ea6c461`, run after the approver's explicit
  consent in chat. Declared: `pending → backlog` gate, approver role checked, subject with
  `[from → to]`, `Approver:`/`Reason:` body, only `status` changed. Observed: exit 0, empty
  stderr, subject `wf(task): approve task-002-campaign-file-and-validation [pending → backlog]`, both trailers present, 1-line diff.
  Matches.
