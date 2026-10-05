---
id: task-060-campaign-validate-preflights-the-run-s-environment
type: task
title: "Campaign validate preflights the run's environment"
status: in-progress
release: v0.2
wave: W12
features: [F1.1]
acceptance: [campaign.feature]
requirements: [REQ-CLI-01, REQ-FMT-01]
fixes: [bug-014-a-campaign-does-not-preflight-the-environment-its-harness-needs]
---

## Context

Fixes [bug-014](../bug/bug-014-a-campaign-does-not-preflight-the-environment-its-harness-needs.md), planned in W12
at [rel-v0-2](../release/rel-v0-2.md)'s triage. v0.1's reference campaign first failed to start for a missing `BENCH_WINGFOIL_REPO` that nothing
declared. Every v0.2 arm adds environment needs.

**Scope:** `bench campaign validate` lists what the campaign's runs need: the credential file, each harness's source
(clone or artifact), the hold-out path for scoring. It checks those that are set, and says which are missing.
`campaign run` refuses to start without them, before the estimate. The README's commands section names them.

**No real agent, no spending.** **Done** means: tests, with the fake agent and an injected environment.

## Acceptance criteria

- `campaign validate` names each missing requirement of a campaign with a harness arm. **Red-first.**
- `campaign run` refuses before spending, naming the missing variable. **Red-first.**

## Design

Fixes bug-014 (`fixes` declared above, kanban-delivery 4). REQ-CLI-01 names the command only, and bug-014's Expected
is the behaviour, so no requirement is amended: `validate` keeps its exit codes, and `run` keeps every refusal it has.

### Classification of the acceptance criteria

Both are **red-first**: a test that fails on `main` precedes the code.

- `campaign validate` names each missing requirement of a campaign with a harness arm — today it prints nothing of
  the environment;
- `campaign run` refuses before spending, naming the missing variable — today it does refuse for
  `BENCH_WINGFOIL_REPO`, but **after** the estimate, one variable at a time; the red test asks for the refusal before
  the estimate line, with every missing requirement at once.

The environment is injected as the existing tests do (`vi.stubEnv`); no real agent, Docker or clone is involved.

### What a campaign's runs need

A new module `src/cli/preflight.ts`, `campaignRequirements(campaign, env = process.env): Requirement[]`, one entry
per need, in this order:

| Variable | Kind | Needed by | When | Checked when set |
|---|---|---|---|---|
| `BENCH_AGENT_TOKEN_FILE` | credential file | `run` | the agent is not `fake` | a readable file |
| `BENCH_FAKE_SCRIPT` | fake agent script | `run` | the agent is `fake` and the real ports are used | a readable file |
| `BENCH_WINGFOIL_REPO` (one per harness tool) | harness clone | `run` | a harness of that tool is pinned | a directory |
| `BENCH_HOLDOUT_PATH` | hold-out | `score` | a scenario of the campaign declares `holdout: true` | `checkHoldoutRoot` |

Each `Requirement` is `{ variable, kind, neededBy, state: 'set' | 'missing' | 'invalid', problem? }`; a path is
named, never a file's content (security-secrets). The harness row comes from one table, tool → variable, which v0.1
fills with `wingfoil` only; the competitor arms' tasks (task-064, task-066) add their rows. `checkSpending` and the
runner's `harnessSources` read the same table, so that the preflight and the build cannot name different variables.

### `campaign validate`

After its "is valid" line and the expected failures, one line per requirement:
`requires BENCH_WINGFOIL_REPO (harness clone of wingfoil, for run): missing`, `… : set`, or `… : invalid, <problem>`.
The exit code stays 0: the campaign file is valid whatever the environment of the machine that validates it, and a
missing variable is information for the maintainer before `run`, which refuses.

### `campaign run`

Right after `checkCampaign`, **before the estimate**: every requirement needed by `run` that is missing or invalid
is reported at once, each as `<variable>: not started: <kind> is missing|invalid…`, exit 1, nothing built or spent.
`BENCH_FAKE_SCRIPT` is skipped when ports are injected (the tests' doubles need no script, as `portsFor` already
assumes). The later checks (`--allow-spending`, the credential's content, the WingFoil clone in `checkSpending`)
stay where they are, as a second line of defence; with the preflight passed they find what they need.

Requirements needed by `score` never stop `run`: scoring is a separate command, which already refuses without its
hold-out.

### README

The commands section gains the four variables, what each names, and which command needs it, and says that `campaign
validate` lists them.

### Out of scope

`bench scenario dry-run` keeps its own checks (it runs one arm and already refuses at once); it can call the same
module later.

### Tests

- unit, `test/unit/cli/preflight.test.ts`: each row's "when", each state, the order, and that no content is printed;
- `test/unit/cli/main.test.ts`: `validate` lists the requirements of a campaign with a wingfoil arm and a real agent,
  missing and set; `run` with two missing variables refuses before any `estimate:` line, naming both, with nothing
  built; the existing "needs BENCH_WINGFOIL_REPO" test keeps passing with its message.
- `npm run test:bin` and `npm run test:docker` at the end: the CLI and the runner change.

## Execution notes

- `npx wingfoil memory add --type task --title "Campaign validate preflights the run's environment"`. Declared: creates the element from the template and
  commits it. Observed: `wf(task): add task-060-campaign-validate-preflights-the-run-s-environment`, `status: draft`.
