---
id: task-002-campaign-file-and-validation
type: task
title: "Campaign file and validation"
status: in-progress
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

- **`core`** gains `campaign.ts`: the Zod schema of the campaign file and its types, and
  `canonicalJson(value)`.
- **`campaign`**: `loadCampaign(file): Result<Campaign>` (read, parse, validate, check scenarios) and
  `campaignId(data)`.
- **`results`**: `nextExecution(resultsRoot, campaignId): number` (REQ-FMT-02 numbering, over the
  layout of REQ-FMT-06). It lives here because the executions are the results' directories; the
  runner (task-003) and the CLI use it.
- **`cli`**: `main(argv, io): Promise<number>` (the exit code) and `src/cli/main.ts`, the `bench` bin.

`.wingfoil/dna.yaml` lists `campaign`, `results` and `cli` (hand edit, N14).

### Campaign file (REQ-FMT-01, REQ-FMT-03, REQ-RUN-16)

| Field | Rule |
|---|---|
| `harnesses` | map arm → `{ tool, version, commit? }`; every key is one of `arms`; `version` is a released version (semver, optionally `v`-prefixed) or a commit SHA (7–40 hex); `commit`, when given, is a 40-hex SHA; `latest`, branch names and ranges are rejected with a message naming the arm and the field |
| `scenarios` | non-empty list of `{ id, version }` (the scenario id and version patterns of task-001), no duplicates |
| `arms` | non-empty list of kebab-case names, no duplicates, **must include `baseline`** (T7) |
| `agent` | `{ name, version }`; `name` is `claude-code` or `fake` (adr-001 default 7); `version` is a released version (semver), never `latest` |
| `models` | `{ default, slices? }`; `default` is a model id; each slice is `{ model, scenarios, arms, repetitions }`, whose scenarios and arms are among the campaign's |
| `repetitions` | map scenario id → integer ≥ 1, with exactly one entry per campaign scenario |
| `approver_policy` | a version such as `v1` |
| `caps` | `{ step_time_s, step_tokens, run_cost_eur }`, all positive |
| `budget` | `{ warn_eur, ceiling_eur }`, positive, `warn_eur ≤ ceiling_eur` |
| `currency` | `{ usd_to_eur }`, positive |

Unknown keys are rejected at their own path (as for scenarios). Model ids are not checked against a
list: the campaign pins them, the agent refuses unknown ones at run time.

**Scenarios exist.** The scenarios root follows REQ-ARC-03: `campaigns/<name>.yaml` sits next to
`scenarios/`, so the root is `<campaign file directory>/../scenarios`. Each scenario is loaded with
`loadScenario`; its issues are reported as `scenarios[<i>]: <id>@<version>: <path> <message>`. This also
lets the fixture `test/fixtures/campaigns/smoke.yaml` use `test/fixtures/scenarios/`, with no extra
option.

Arm definitions (`arms/<arm>/arm.yaml`, REQ-FMT-05) arrive in W3, so arm names are not checked
against directories yet.

### Identity and executions (REQ-FMT-02)

- `canonicalJson`: the parsed YAML value serialized as JSON with object keys sorted by code point at
  every level, arrays in their order, no whitespace. The identity is computed on the parsed file, not
  on the schema's output, so defaults the schema may add never change it.
- `campaignId`: the first 12 hex characters of the SHA-256 of that text. Formatting, comments and key
  order in the YAML do not change it; any value change does.
- `nextExecution(resultsRoot, id)`: 1 + the highest `n` among the directories `results/<id>/<n>/`
  whose name is a positive integer (other entries ignored), or 1 when there is none. The results root
  is `<campaign file directory>/../results`, by the same layout rule.

### `bench campaign validate <file>` (REQ-CLI-01)

- Valid: prints `campaign <id> is valid (<n> scenarios, <m> arms)` to stdout, exit 0.
- Invalid (schema, pins, scenarios, file not found or not YAML): one line per issue on stderr,
  `<path>: <message>`, exit 1.
- Usage error (no file, extra arguments, unknown command or subcommand): usage text on stderr, exit 2.
- The argument parser is a small hand-written router (two words and one positional); no dependency.
- `main` takes its output streams as parameters, so tests run it in-process. `src/cli/main.ts` only
  calls it with `process.argv` and sets `process.exitCode`.

### Tests

- Acceptance (`test/acceptance/campaign.test.ts`): the three `@F1.1` scenarios, against a temporary
  repository layout (`campaigns/`, `scenarios/S1…S8/1.0/`, `results/`) built from task-001's fixture
  helpers.
- Unit: schema rules (each row above, happy and error paths), canonical JSON and identity, execution
  numbering, CLI exit codes and output.
- The built bin is not run by `npm test` (it needs `npm run build`). In review, `npm run build` then
  `npx bench campaign validate test/fixtures/campaigns/smoke.yaml` is run and its output recorded.
- Fixture: `test/fixtures/campaigns/smoke.yaml`, the trivial campaign (scenario T0, arm `baseline`,
  agent `fake`), used again by task-003.

## Execution notes

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
