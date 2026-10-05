---
id: task-059-validation-in-every-arm-on-the-largest-step
type: task
title: "Validation in every arm on the largest step"
status: in-progress
release: v0.2
wave: W12
features: []
acceptance: []
requirements: [REQ-NFR-04]
---

## Context

Implements [dl-010](../decision-log/dl-010-validation-exercises-every-arm-the-largest-step-and-the-harness-environment.md),
approved at [rel-v0-2](../release/rel-v0-2.md)'s triage (option B).

**Scope:** `.wingfoil/workflows/custom/release-cycle.yaml` becomes version 3. Its validation phase asks for one
real-agent run per arm on the scenario with the largest step, each arm's environment preflighted (bug-014), the runs
consented like any real-agent run and recorded in the ledger. plan-004's step 4 reads it.

**No real agent, no spending** in this task. **Done** means: the workflow at version 3, read by
`npx wingfoil workflow list`.

## Acceptance criteria

- `npx wingfoil workflow list` reads `release-cycle` version 3. **Characterization** by command.

## Design

dl-010 was approved as option **B** at rel-v0-2's triage (`42b05a0`: "option B; release-cycle validation amended
(version 3), a task in W12"). The task fixes no bug (`fixes` stays empty): bug-014's preflight is task-060's, which
this text only relies on.

### Classification of the acceptance criteria

**Characterization** by command: no product code changes. `workflow list` before (`99302ed`, after task-058's merge):
exit 0, 19 879 bytes. After: the same, except `release-cycle`'s `"version"` 2 → 3, the `validation` phase's
`description` and the `approval` it gains, and (since review round 2) the `calibration` phase's `description`.

### `release-cycle.yaml` (version 3), the `validation` phase

Its description keeps the fake-agent checks and replaces "one end-to-end run with the real agent on the cheapest
scenario" with dl-010 B:

- all acceptance tests green against the fake agent, coverage above 80 %, lint clean, and the Docker suite
  (`npm run test:docker`) green — plan-004's step 4 already lists it;
- **one real-agent run per arm of the release's campaign** (in v0.2 the seven arms of experiment design 1.2), all on
  **one scenario shared by every arm, the one with the largest step**: the scenario with the largest step transcript
  (`transcript.jsonl`, in bytes, which every step writes and the main checkout keeps) in calibration's dry runs,
  across all arms, the larger cost breaking a tie (one key, one choice, as dl-010's "S1 in three arms"), so that each
  arm's setup and environment and the largest output are exercised once. Bytes of the stream are bug-011's measure
  (its 1 MiB bound), not output tokens; calibration v0.1 recorded tokens and time per step but no sizes, so the
  `calibration` phase now asks for each dry-run step's transcript size, and plan-004's step 3 lists it;
- **each arm's environment checked** before any run: every variable and path it needs, by `campaign validate` once
  task-060 (bug-014's fix) makes it list them — the text names the dependency, since today the command checks the
  campaign file only;
- the runs are **consented** by the approver before they start, with the model and a ceiling estimated from
  calibration's dry runs (the phase's approval is that consent), **made from the main checkout** (plan-004's delivery
  rules), and **each is a line of the release's spending ledger**;
- the difference from a delivery wave check stays as version 2 says it.

The phase gains `approval: { by_role: approver }`: the consent is its gate, as `real-agent-check`'s is in
kanban-delivery. The header comment says what version 3 adds.

### plan-004

Step 4's "real-agent validation as dl-010 decides (if adopted: …)" becomes a pointer to `release-cycle` version 3's
validation phase: dl-010 has been adopted.

### Commit

One `chore(wingfoil)` commit with dl-010's approval as `Approver:`/`Reason:` trailers.

## Execution notes

- `npx wingfoil memory add --type task --title "Validation in every arm on the largest step"`. Declared: creates the element from the template and
  commits it. Observed: `wf(task): add task-059-validation-in-every-arm-on-the-largest-step`, `status: draft`.
- First `memory submit` refused: "missing required field on submit: requirements". The task serves no product
  requirement; [REQ-NFR-04] is the nearest, as task-052 did (WingFoil usage notes N17, N21: a required field cannot say "none").

### WingFoil commands (declared vs observed)

- `npx wingfoil memory submit task-059-…` → `379a6a7`, in the linked worktree `WingFoil2-Benchmark-task-059` with its
  own `npm ci`. Declared: `backlog → in-progress`, one commit. Observed: exit 0, JSON `from`/`to` as declared, one
  file, `status` only. Matches.
- `npx wingfoil workflow list` before (`99302ed`): exit 0, empty stderr, 19 879 bytes. After (`69a587c`): exit 0, empty
  stderr. The diff is `release-cycle`'s `"version"` 2 → 3, the `validation` description, and
  `"approval": {"by_role": "approver"}` on that phase; nothing else. Declared (schema at the pin): `approval` is a
  phase field. Observed: as declared. Matches.

### Build

1. `69a587c` (`chore(wingfoil)`, dl-010's approval as trailers): `release-cycle` 3 — header comment, the validation
   description and its approval; plan-004's step 4 points to it.

### Review

- **Round 1** (independent read-only Explore subagent, on `bb44537`): nothing blocking. It diffed `workflow list` on
  both checkouts structurally (only `release-cycle`'s version, validation description and approval), checked the
  text against dl-010 B, plan-004 step 4 and Constraints, the seven arms and `real-agent-check`'s consent wording,
  and the trailers against `42b05a0`. Findings and outcomes:
  1. should-fix — "preflighted (campaign validate)" claimed more than the command does before task-060. **Fixed:**
     the text names what is checked and that `campaign validate` lists it since task-060, in the description, the
     header comment and the Design.
  2. should-fix — "the scenario with the largest step (largest output and cost)" could pick different scenarios per
     arm, or two by two keys. **Fixed:** one scenario shared by every arm, chosen by the largest step output across
     all arms, cost breaking a tie.
  3. nit — the phase's approval meaning was implicit. **Fixed:** "the phase's approval is that consent".
  4. nit — where the runs are made from was unsaid. **Fixed:** "made from the main checkout".
- **Round 2** (a new independent read-only Explore subagent, on `6a6a5e5`): nothing blocking; it verified round 1's
  four outcomes, `workflow list` structurally (still three changes, all in `release-cycle`) and prettier. Findings
  and outcomes:
  1. should-fix — "the step that wrote the largest output" is not something calibration records (v0.1 has tokens and
     time per step, no sizes), and "output" could mean bytes or tokens. **Fixed:** the key is the step's
     `transcript.jsonl` size in bytes (bug-011's measure); the `calibration` phase records it per dry-run step, and
     plan-004's step 3 lists it. The workflow diff now also touches `calibration`'s description.
  2. nit — "lists them since … task-060" is false until task-060 merges. **Fixed:** "once task-060 … is merged".
  3. nit — the Context's Scope keeps the planning-time wording. **Not changed:** it is the text approved at the
     pending → backlog gate; the Design states the refined rule.
- **Round 3** (a new independent read-only Explore subagent, on `1d3ab51`): nothing blocking. It verified round 2's
  outcomes (one `transcript.jsonl` per step, written for every adapter, git-ignored and kept in the main checkout;
  calibration's clause; plan-004 step 3), judged the calibration change in scope (dl-010 B budgets validation from
  calibration, and the key needs a measure v0.1 lacked), and `workflow list` (four hunks, all in `release-cycle`).
  Findings and outcomes:
  1. should-fix — the Design's expected `workflow list` diff left out the calibration description. **Fixed.**
  2. nit — the header said "from task-060", the description "once task-060 … is merged". **Fixed:** the header
     says the latter.
  After the fixes, `99e4650` and `f10df2b` re-wrapped the header comment and the validation text to 100 columns;
  `workflow list` output identical before and after `f10df2b`.
- **Round 4** (a new independent read-only Explore subagent, on `f10df2b`): **clean**, no nit. It verified round 3's
  outcomes, that the re-wraps change nothing parsed (YAML of `1d3ab51` and HEAD compared as JSON), `workflow list`
  against main (four paths, all in `release-cycle`: version, calibration and validation descriptions, validation's
  approval), prettier, and line lengths.
- Final checks on `f10df2b`: `npm test` 1235/1235, coverage 98.04 % statements, 90.93 % branches; `npm run lint`
  clean. `test:bin`/`test:docker` not run: no CLI, runner, image or scoring change.
