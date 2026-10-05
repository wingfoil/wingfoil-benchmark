---
id: task-060-campaign-validate-preflights-the-run-s-environment
type: task
title: "Campaign validate preflights the run's environment"
status: in-review
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

Right after `checkCampaign`, **before the estimate**: every requirement needed by `run` is checked, and all unmet
ones are reported at once, exit 1, nothing built or spent:

- a **missing** variable is always refused, with the wording the later checks already used, `<variable>: is not
  set: <what it names>` (one `PURPOSES` table, which `checkSpending` and `portsFor` now read too), so that
  `scenario dry-run`'s tests and every message a maintainer has seen stay the same;
- a variable that names the **wrong kind of path** is refused, `<variable>: is invalid: <path> <problem>`, only with
  the real ports: injected ports (the tests' doubles) use no path of this machine, as `/clones/wingfoil` in the
  existing tests shows;
- `BENCH_FAKE_SCRIPT` is skipped when ports are injected (the doubles need no script, as `portsFor` assumes).

This **moves the environment ahead of the budget guard**: W5 decision 5's order was the spending flag, then the
credential, then the clone, all after the estimate and the ceiling. A real-agent campaign without its credential is
now refused before the ceiling and before `--allow-spending`. The three existing tests about those later refusals
(`refuses to spend before anything runs…`, `refuses the ceiling before it asks for the spending flag…`, `refuses to
spend without an explicit opt-in…`) therefore get a machine with what the runs need (`stubMachine()`), their
assertions unchanged; and the bin test of W5's "Ends with" gets the fake agent's script, so that the ceiling is what
refuses. The later checks (`--allow-spending`, the credential's content, the WingFoil clone in `checkSpending`)
stay where they are, as a second line of defence and as `scenario dry-run`'s checks.

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

### Review

- **Round 1** (independent read-only Explore subagent, on `dd82ffe`; no full suite, the machine loaded): not clean.
  It ran `tsc` and the CLI, dry-run and campaign acceptance tests (100, green), and read `test:bin`'s cases.
  Findings and outcomes:
  1. **blocking** — `test:bin` fails twice: `validate`'s exact stdout now has a `requires` line, and W5's "Ends
     with" runs a fake campaign with real ports and no script, so the preflight refuses before the ceiling.
     Confirmed by the `test:bin` run (2 failed). **Fixed:** the bin helper passes an environment; the validate case
     expects the `requires BENCH_FAKE_SCRIPT … missing` line, and the ceiling case gets the fake script.
  2. should-fix — the Design's messages and "invalid always refused" no longer matched the build, and the new order
     (environment before the ceiling and the flag) was unsaid. **Fixed:** the Design's `campaign run` section says
     all three, and why the three existing tests got `stubMachine()` with unchanged assertions.
  3. should-fix — `runCampaignCommand`'s and `checkSpending`'s docstrings did not mention the preflight. **Fixed.**
  4. should-fix — the planned "no content is printed" test was missing. **Fixed:** `validate` and a refused `run`
     against a stubbed token file; no output contains its content.
  5. should-fix — untested branches. **Fixed:** an invalid path with injected ports is not refused (the run
     completes and resolves `/clones/wingfoil`); an unreadable token file is invalid (skipped as root); an unset
     hold-out never appears in `run`'s refusal.
  6. nit — the singular `validate` test depended on the shell's `BENCH_FAKE_SCRIPT`, and one test unstubbed inline.
     **Fixed:** stubbed empty, `missing` asserted; the inline unstub removed (a file-level `afterEach` does it).
  7. nit — README said "not set" only. **Fixed:** "or names the wrong kind of path".
  8. nit — a harness tool without a table row is skipped silently. **Fixed:** a comment on the table and a test that
     pins it (`wingfoil` only) and shows an unknown tool is not listed.
- **Round 2** (a new independent read-only Explore subagent, on `2f4ff00`): **clean**. It verified the eight
  outcomes, ran the CLI tests (66/66) also under a hostile shell environment, `tsc`, and found the Design's `campaign
  run` section matching the code and the test isolation sound. Two cosmetic nits, **not changed**: a docstring in
  `run.ts` breaks mid-sentence after the inserted clause, and `scenario.ts`'s re-export sits between imports; a code
  change would only re-open the suites.
- Final checks on `2f4ff00`: `npm run lint` clean; `npm test` 78 files, 1249/1249, coverage 98.03 % statements,
  90.78 % branches (`preflight.ts` 100 % statements, 87.87 % branches); `npm run test:bin` 8/8; `npm run
  test:docker` 16/16. An earlier full run under load average ~90 had one unrelated failure (`@F4.8 Directive
  violations…`, scoring), green alone and in this run.

### Review and approval

- `npx wingfoil memory submit task-060-…` → `cbec070`. Declared: `in-progress → in-review`, one commit. Observed: exit
  0, JSON `from`/`to` as declared, one file, `status` only. Matches.
