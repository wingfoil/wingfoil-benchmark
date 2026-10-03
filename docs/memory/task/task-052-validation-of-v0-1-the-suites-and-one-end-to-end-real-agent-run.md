---
id: task-052-validation-of-v0-1-the-suites-and-one-end-to-end-real-agent-run
type: task
title: "Validation of v0.1: the suites and one end-to-end real-agent run"
status: done
release: v0.1
wave: validation
features: []
acceptance: []
requirements: [REQ-NFR-04]
---

## Context

Plan-003 step 4, **validation**, in release v0.1 ([rel-v0-1](../release/rel-v0-1.md)), after calibration
(task-049, task-050, approved with the revised budget's option A) and bug-010's fix (task-051). `release-cycle` 2:
"All acceptance tests green against the fake agent, coverage above 80 %, lint clean, one end-to-end run with the real
agent on the cheapest scenario. That run validates the release as a whole; a delivery wave check verified one wave's
'Ends with'. Its cost is a line of the release's spending ledger." Like a calibration task, it delivers no feature.

**What it does:**

- `npm test` (unit and acceptance, the fake agent) with coverage above 80 %, `npm run lint`, and
  `npm run test:docker` (the runner, the arms and the scenarios' oracles in real containers, WingFoil v0.2.2),
  on `main` as it stands after task-051.
- **One end-to-end run with the real agent**, through the whole chain the reference campaign will use:
  `bench campaign validate`, `bench campaign estimate`, `bench campaign run --allow-spending`, `bench score` with the
  hold-out, `bench run show`, `bench site build` locally (never published), and `bench transcripts pack` checked
  without a release being created. A real campaign execution, not a dry run: its campaign file carries the pins of
  calibration's profile (Claude Code 2.1.280, `claude-sonnet-5`, the ECB rate 0.8851, `step_time_s` 3600,
  `step_tokens` 20 000 000) and option A's run cap.
- **The cheapest scenario:** **S3@1.0 in the baseline arm** (its counted dry run: 0.84 €, the lowest of calibration;
  S2's baseline 0.94 €). One run, no harness to build.

**Spending — consented by this task's pending → backlog approval:**

| Run | Model | Cap (`run_cost_eur`) | Ceiling (`ceiling_eur`) | Expected |
|---|---|---|---|---|
| S3@1.0 × baseline × 1 | Sonnet 5 (Claude Code 2.1.280) | 3 € | 3 € | about 0.85 € |

The agent runs on the maintainer's subscription, from the main checkout (so that its git-ignored transcript outlives
the task branch), with `BENCH_AGENT_TOKEN_FILE` naming the token file calibration used; its content is never read.
A run that fails is a ledger line and is not re-run without a new consent; a rate limit is now waited out
(task-051).

**Left to the design phase:** where the validation's campaign file and its execution live (committed under
`campaigns/` and `results/<id>/<n>/`, or kept out of the repository as W3's wave check was), and what of the chain
is checked by hand against what.

**Out of scope:** the reference campaign (plan-003 step 5) and its file; publishing.

**Done** means: the suites green on `main` with the figures recorded; the run completed, scored and shown, the site
built from it, its transcript packable, and its cost a ledger line; anything the chain gets wrong filed as a bug.

## Acceptance criteria

<!-- A validation task: no Gherkin scenario. What is checked at review: the suites' figures, the run's record,
     score and ledger line, the site build and the pack check, each with its output. -->

## Design

Validation changes no code: it runs what v0.1 delivered and writes down what it observed. The only files it adds
are the campaign file, the execution's records, a ledger line and these notes. Anything the chain gets wrong is filed
as a bug and is not fixed here.

### The suites — on `main` as it stands after task-051

They run in the main checkout at its `HEAD` (`92b1bf8`, documentation only since task-051's merge), each in the
foreground and never interrupted (a killed Docker test leaves its container behind, bug-003):

| Suite | Command | Recorded |
|---|---|---|
| Unit and acceptance, fake agent | `npm test` | files, tests, coverage of statements and branches (above 80 %) |
| Lint | `npm run lint` | clean, or the findings |
| Docker | `npm run test:docker` | passed / skipped / failed; the WingFoil clone at `v0.2.2` and the hold-out are present, so nothing should be skipped |

If one suite fails, the failure is filed as a bug and the real-agent run waits for the approver.

### The campaign file — `campaigns/v0-1-validation.yaml`

```yaml
harnesses: {}
scenarios:
  - id: S3
    version: '1.0'
arms: [baseline]
agent: { name: claude-code, version: 2.1.280 }
models: { default: claude-sonnet-5 }
repetitions: { S3: 1 }
approver_policy: v1
caps: { step_time_s: 3600, step_tokens: 20000000, run_cost_eur: 3 }
budget: { warn_eur: 2, ceiling_eur: 3 }
currency: { usd_to_eur: 0.8851 }
```

- **Pins** from calibration's profile (`scenarios/dry-run.yaml`): Claude Code 2.1.280, `claude-sonnet-5`, policy
  `v1`, `step_time_s` 3600, `step_tokens` 20 000 000, the ECB rate 0.8851. The baseline arm needs no harness, so
  `harnesses` is empty and `BENCH_WINGFOIL_REPO` is not needed.
- **The cap is 3 €, not option A's 30 €.** The Context says "option A's run cap", but its spending table and the
  consent give 3 € as both the cap and the ceiling. The consented figure wins. Option A's 30 € belongs to the
  reference campaign.
- **`warn_eur` 2**, below the ceiling and above the estimate. `campaign run` asks `[y/N]` above `warn_eur` and,
  without a terminal, refuses. With 0.84 € estimated it does not ask, so the run can go in the background.
- Checked already (no spending): `bench campaign validate` reports `campaign d032e3e98de3 is valid (1 scenario,
  1 arm)`; `bench campaign estimate` reports `0.9505 USD, 0.8413 EUR`, read from `results/dry-runs/8`, the
  completed S3 baseline dry run, whose scenario hash is S3@1.0's current one.

### Where it lives — committed, run from the main checkout (to confirm)

The file and the execution's records are **committed**: `campaigns/v0-1-validation.yaml` and
`results/d032e3e98de3/1/`, transcripts excepted (git-ignored). The reasons:

- the run validates the release as a whole, so its record is the evidence the review checks;
- the reference campaign will commit its own the same way (plan-003 step 5);
- W3's wave check kept its execution outside the repository, and as a result bug-007 could only quote it.

Nothing reads one execution while handling another: `estimate` reads only `results/dry-runs/`, `site build` builds
only the execution it is given, and `validate`'s hash check (REQ-FMT-09) only agrees with S3@1.0's hash.

**Mechanics.** `campaign run` writes `results/` next to the file's `campaigns/` directory, and `score`, `run show`,
`site build` and `transcripts pack` read from the working directory. The whole chain therefore runs in the
**main checkout**, with an untracked copy of the campaign file there, so the transcript stays outside the task
worktree. The records are committed on the task branch:

1. In the main checkout, after `npm run build` there:
   `node dist/cli/main.js campaign validate`, then `estimate`, then
   `BENCH_AGENT_TOKEN_FILE=$HOME/.claude/bench-token node dist/cli/main.js campaign run campaigns/v0-1-validation.yaml --allow-spending`.
   It runs in the background and the shell waits for it. During the run: `systemd-inhibit --what=sleep`, no network
   switch, no other heavy Claude use.
2. `node dist/cli/main.js score d032e3e98de3/1 --holdout ../WingFoil2-Benchmark-HoldOut`.
3. `node dist/cli/main.js run show d032e3e98de3/1/runs/S3@1.0/baseline/claude-sonnet-5/r1` (and `--full`).
4. `node dist/cli/main.js site build d032e3e98de3/1` writes `site/`, which is git-ignored and never published.
5. The token check on the stored files: `grep -rl "sk-ant-"` and a fixed-string search for the token file's value,
   which prints only file names. Then `results/d032e3e98de3/1/` is copied to the task worktree without
   `transcript.jsonl` and committed there, with the campaign file.
6. `BENCH_AGENT_TOKEN_FILE=… node dist/cli/main.js transcripts pack d032e3e98de3/1` runs in the main checkout
   **after** the copy:
   - it writes `releases/d032e3e98de3-1/transcripts.tar.gz` (git-ignored) and prints the `gh release create`
     command, which is **not run**;
   - it also adds a `transcripts` field to each `run.json`. That field names a release that will not exist, so the
     committed `run.json` is the one from before the pack.
7. At delivery, before the merge, the untracked copies in the main checkout are removed: the campaign file and
   `results/d032e3e98de3/1/` except the transcripts, which are ignored and stay. Otherwise git refuses to merge
   over untracked files. The merge then brings the committed records back. Before removing anything,
   `git status --ignored` is listed.
8. At delivery, rel-v0-1's `validation` checklist line is ticked, citing the suites' figures, campaign
   `d032e3e98de3/1`, its cost and the ledger, as calibration's line was (`86c6512`).

### What is checked, against what

| Step | Checked against |
|---|---|
| `campaign validate` | the id printed = the file's id at the start (`d032e3e98de3`); the file unchanged |
| `campaign estimate` | 0.8413 € = dry run 8's 0.9505 USD × 0.8851 |
| `campaign run` | **Outcome:** `run.json` says `completed`, `dry_run` false, with its pins: agent 2.1.280, `claude-sonnet-5`, S3@1.0's hash, the manual's sha256.<br>**Cost:** the printed cost = the sum of the steps' `costUsd` × 0.8851, below the cap.<br>**Records:** each step's time and tokens against the caps; `rate_limit_waits` (task-051) recorded if any; the execution's outcome.<br>**Token:** none in the stored files. |
| `score` (hold-out) | `score.json` and `aggregate.json` written; each step's tallies and the final and hold-out results against dry run 8's `score.json`. This compares to a reference; it is not an equality test, because the agent's work differs from run to run. |
| `run show` | its figures against `run.json` and `score.json` |
| `site build` | the pages exist (`site/d032e3e98de3/1/index.html`, the category pages, `method.html`, `material/`); opened locally in the browser pane, the run's figures read as in `aggregate.json` and the method page renders. No `site publish`. |
| `transcripts pack` | **Token check:** both the shape and the value passed.<br>**Tarball:** its list holds the run's step transcripts; its sha256 is printed in `run.json`'s field.<br>**Release:** the `gh` command printed, not run; no GitHub release exists. |
| ledger | one line: `2026-10-0x \| task-052 \| validation: S3@1.0 baseline \| task-052 pending → backlog, 92b1bf8 \| Sonnet 5 (Claude Code 2.1.280) \| 3 € \| X USD (Y €; steps …) \| results/d032e3e98de3/1`, and the total updated |

rel-v0-1 lists two checks for validation: whether a resumed Sonnet 5 session stays on Sonnet, and what Claude Code's
`--max-budget-usd` compares against when a session resumes. Both are already settled. W3 settled the first, and
task-024's spike in W5 settled the second: a resume's cap is compared with what the resume itself spends. This run
adds nothing to either unless a rate limit makes it resume, and no resume is forced.

### Spending and failure

One run, cap 3 €, ceiling 3 €, about 0.84 € expected. A run that fails, or that stops at the cap or at quota, is a
ledger line, is filed as a bug when the chain is at fault, and **is not re-run** without a new consent. A rate limit
is waited out by the runner (task-051).

### Choices confirmed by the approver (2026-10-03)

1. **Where it lives:** committed (`campaigns/v0-1-validation.yaml`, `results/d032e3e98de3/1/`), run in the main
   checkout and copied to the branch, as above.
2. **The cap:** 3 € per run, 3 € ceiling, `warn_eur` 2 — the consented figures, not option A's 30 €.
3. **The pack:** run after the records are committed; the committed `run.json` carries no `transcripts` field.

## Execution notes

- `npx wingfoil memory add --type task --title "Validation of v0.1: the suites and one end-to-end real-agent run"`
  — declared: creates the element at `draft` and commits it. Observed: `98a9f7c wf(task): add …`.
- `npx wingfoil memory submit task-052-…` (draft → pending) — declared: moves `status` and commits the file.
  Observed: `f9f0a0f wf(task): submit …`, `status: pending`.
- The approver's `npx wingfoil memory approve task-052-…` (pending → backlog) — declared: moves `status` and commits
  with the approver and the reason. Observed: `92b1bf8 wf(task): approve … [pending → backlog]`, `status: backlog`.
  It is the consent to the run's spending (cap 3 €, ceiling 3 €).
- Handoff: the calibration session (task-049/050/051) confirmed on 2026-10-03 that it holds nothing for task-052 and
  gave the token file's path, the commands it used and the ledger's format; it leaves this task to this session.
- `npx wingfoil memory submit task-052-…` (backlog → in-progress) — declared: moves `status` and commits the file.
  Observed: `6fe9e35 wf(task): submit …`, `status: in-progress`, on the task branch in its own worktree
  (`../WingFoil2-Benchmark-task-052`, its own `npm ci`); the Design committed first (`987b794`, `9099a8b`).

### Build — the suites on `main` (`92b1bf8`), 2026-10-03

- `npm test`: **77 files, 1212 tests passed**; coverage **98.03 % statements**, 90.87 % branches, 98.76 % functions,
  99.17 % lines; 190 s.
- `npm run lint`: clean (ESLint, then Prettier "All matched files use Prettier code style!").
- `npm run test:docker`: **1 file, 16 tests passed, none skipped** (the WingFoil clone at `v0.2.2` and the hold-out
  present); 973 s; no container left behind.

### Build — the real-agent run

- In the main checkout, `npm run build`, the campaign file copied there untracked: `campaign validate` →
  `campaign d032e3e98de3 is valid (1 scenario, 1 arm)`; `campaign estimate` → `0.9505 USD, 0.8413 EUR at 0.8851
  EUR/USD` from `results/dry-runs/8`. Both as at design.
- `BENCH_AGENT_TOKEN_FILE=$HOME/.claude/bench-token systemd-inhibit --what=sleep node dist/cli/main.js campaign run
  campaigns/v0-1-validation.yaml --allow-spending`, consent `92b1bf8`.
  **Completed**, 22:34–22:41 (6.5 min): `campaign d032e3e98de3, execution 1`, `1 run completed, 0 failed`, `cost:
  1.0064 USD, 0.8908 EUR` — below the 3 € cap; the estimate was 0.8413 € (+6 %).
- `run.json` checked: `outcome: completed`, agent `claude-code 2.1.280`, `claude-sonnet-5`, policy `v1`, S3@1.0's
  hash `sha256:1c12448d…` (the one dry run 8 has), the manual `CLAUDE.md` 120 tokens, sha256 `e3408598…` (the same as dry run 8's); no `dry_run` field (a campaign run carries
  `campaign: d032e3e98de3` instead); no interventions; no rate-limit
  waits (no resume happened, so the run adds nothing to rel-v0-1's two resume checks; both were settled earlier, W3 and
  task-024). Steps:

  | Step | Cost USD | Turns | Time | Tokens (all kinds) |
  |---|---|---|---|---|
  | 01 | 0.1524 | 11 | 78.0 s | 0.32 M |
  | 02 | 0.0982 | 10 | 37.8 s | 0.23 M |
  | 03 | 0.1235 | 12 | 41.2 s | 0.32 M |
  | 04 | 0.3524 | 22 | 133.1 s | 0.79 M |
  | 05 | 0.2799 | 15 | 93.6 s | 0.56 M |

  The sum of the steps' `costUsd` × 0.8851 = 0.8908 €, the printed figure. No step near `step_time_s` 3600 or
  `step_tokens` 20 M.
- `bench score d032e3e98de3/1 --holdout ../WingFoil2-Benchmark-HoldOut`: `step 01 11/11, step 02 16/16, step 03
  20/20, step 04 30/30, step 05 34/37, final 34/37; hold-out final 16/17; checks 0/1; M-F1 3/5`; `aggregate.json`
  written. Against dry run 8 (the same scenario, arm and model): final 35/37 there, 34/37 here (both fail D5's
  cancellation tests, here one more); hold-out 16/17 both; `d3-revision` failed at step 4 both; M-F1 3/5 both. A
  reference, not an equality: the agent's work differs from run to run.
- `bench run show d032e3e98de3/1/runs/S3@1.0/baseline/claude-sonnet-5/r1`: the pins, each step's session, tokens,
  cost (0.1524 … 0.2799 USD), turns and time as in `run.json`, the commits, transcript and diff, and the test results.
- `bench site build d032e3e98de3/1`: `site: site/d032e3e98de3/1/ (10 pages)`, "A, B, C, D, E and G are not covered
  in this campaign"; files: `index.html`, `category-a…g.html`, `method.html`, `material/manual-baseline.html`, plus
  `site/index.html` and `site/style.css`. Opened in the browser pane: the landing reads M-Q1 **91.9 %** (34/37),
  n = 1, M-F1 60.0 % (3/5) "preliminary", hold-out 16/17 — as `aggregate.json`; the method page renders. (The pane
  shows files as `data:` snapshots without the relative `../../style.css`; the link resolves on disk.) Not published.
- Token check before the commit: `grep -rl "sk-ant-"` and the fixed-string search for the token file's value over
  `results/d032e3e98de3/1/` (transcripts included) and `site/`: no file. Records copied to the branch without
  `transcript.jsonl` and committed with the ledger line (`9d33738`; total 76.2187 USD).
- `BENCH_AGENT_TOKEN_FILE=… bench transcripts pack d032e3e98de3/1`, in the main checkout after the commit:
  `releases/d032e3e98de3-1/transcripts.tar.gz (5 transcripts, sha256:31e47a2c…)`, the five steps' transcripts in
  it; the `gh release create …` command printed as "not run here", and `gh release view d032e3e98de3-1` → "release
  not found". With the token file set it checked the value too: without it, it says "checked for the shape of an
  Anthropic key only". Packed three times, the same sha256 each time. The uncommitted `run.json` in the main
  checkout now carries `transcripts: {release: d032e3e98de3-1, …}`; the committed one does not (choice 3).
- Every step of the chain behaved as declared: no bug filed.

### Review

**Independent review** by a fresh read-only agent on the branch and the main checkout's untracked execution
(2026-10-03): no blocker. It recomputed every figure in the notes from `run.json`, `usage.json` and `score.json`
(step costs, turns, times, tokens, 1.0064 USD × 0.8851 = 0.8908 €, +5.9 % over the estimate; the scores against dry
run 8; the site's 91.9 %, 60.0 %, 16/17). It also checked:

- `diff -r` of the committed records against the main checkout's: they differ only by the five transcripts and the
  pack's `transcripts` field; no transcript is tracked;
- the campaign file's pins against `scenarios/dry-run.yaml` and the consent;
- `campaign validate` and `campaign estimate`, re-run;
- the tarball's sha256, and that the tarball was written after the records' commit;
- the ledger line's format, its consent commit and its total;
- `sk-ant-`: found in no committed file.

Its findings and their outcome:

1. *should-fix*: the notes called the `--max-budget-usd`-on-resume question open, but rel-v0-1 records it as
   settled by task-024's spike, and the "stays on Sonnet" check as settled by W3. **Fixed** in the Design and the
   notes.
2. *should-fix*: no planned close-out of rel-v0-1's `validation` checklist line. **Fixed:** delivery step 8.
3. *nit*: two `wingfoil` command notes (draft → pending, the approval) lacked the declared/observed form. **Fixed.**
4. *nit*: the Design's checks "`dry_run` false" and "the manual's sha256" were not recorded. **Fixed:** a campaign
   run has no `dry_run` field; the manual's sha256 equals dry run 8's.
5. *nit*: "Nothing in the chain went wrong" overstated. **Fixed:** "Every step of the chain behaved as declared".
6. *nit*: the suites' figures have no stored output. **Kept as is:** the figures are quoted from the runs on
   `92b1bf8`, and the branch changes no code, so they apply to it.
- `npx wingfoil memory submit task-052-…` (in-progress → in-review) — declared: moves `status` and commits the file.
  Observed: `8849f4f wf(task): submit …`, `status: in-review`; the body committed first (`90fbe85`).

### Approval

The approver's `memory approve` (in-review → approved), `4ead1a1`: "Validation of v0.1 accepted: suites green on main
(1212 tests, 98.03% coverage, lint clean, Docker 16/16); S3@1.0 baseline run d032e3e98de3/1 completed, scored, shown,
site built, pack checked, 1.0064 USD in the ledger".

### Delivery

Before the merge, `git status --ignored` listed in the main checkout; its 22 untracked copies (the campaign file and
`results/d032e3e98de3/1/` without the transcripts, including the `run.json` the pack had rewritten) removed, the five
git-ignored transcripts kept, as `releases/d032e3e98de3-1/` and `site/`. Merged into `main` with `--no-ff`
(`65de6f2`); the transcripts still in place after it. `npx wingfoil memory submit task-052-…` (approved → done) —
declared: moves `status` and commits the file. Observed: `fd89b0d wf(task): submit …`, `status: done`. `rel-v0-1`'s
validation line ticked. Next: the reference campaign (plan-003 step 5), with option A's budget and the approver's
consent.
