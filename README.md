# WingFoil Benchmark

A benchmark that measures **where a harness for AI coding agents makes a difference**, and where it does not. A
harness is the process and memory tooling around an agent; the one measured first is
[WingFoil](https://github.com/wingfoil/wingfoil). The same agent and model work through the same multi-step tasks
with and without the harness, and the results are compared on quality, cost and determinism, by rules published
before any run.

## v0.1: the first preliminary result

- **Results:** <https://wingfoil.github.io/wingfoil-benchmark/c82a5e74885b/2/> *(to confirm once Pages is enabled)*
- **How it works:** the [method page](https://wingfoil.github.io/wingfoil-benchmark/c82a5e74885b/2/method.html), every
  rule, its limits included.
- **Release notes:** [docs/releases/v0.1.md](docs/releases/v0.1.md): what was compared, the results in short, the
  spending, and the known limits.

v0.1 compares three arms (**baseline**, **baseline-docs** and **wingfoil**, on WingFoil v0.2.2) on four scenarios
(S1, S2, S3 and S8), with Claude Code and `claude-sonnet-5`, plus one run of S1 on Opus 5. Its results are
preliminary: only S1 was repeated (three times), and no difference is claimed as significant. Competing harnesses
(Spec Kit, OpenSpec) are planned for v0.2.

**The benchmark is built by WingFoil's maintainer.** That is threat T1 of the
[experiment design](docs/01_vision/09_experiment-design.md). The questions, metrics and scenarios were fixed before
any run, losses are published like wins, and every run's record, its cost and its agent transcript are public, so
that the results can be checked and contested.

## What is where

| Path | What it holds |
|---|---|
| [`docs/01_vision/`](docs/01_vision/) | the product vision, the personas, the features, the release sequencer and the experiment design |
| [`docs/02_specification/`](docs/02_specification/) | requirements, acceptance scenarios (Gherkin), scenario specifications, traceability |
| [`docs/calibration/`](docs/calibration/) | the calibration of v0.1 (dry runs, measured costs, budget) and the spending ledger |
| [`docs/memory/`](docs/memory/) | the project's records, managed with WingFoil: releases, tasks, bugs, decisions, campaigns |
| [`docs/releases/`](docs/releases/) | release notes |
| [`scenarios/`](scenarios/) | the scenarios, their seeds, prompts and public hidden tests, per version |
| [`arms/`](arms/) | each arm's operating manual, setup and configuration |
| [`campaigns/`](campaigns/) | campaign files; the reference campaign of v0.1 is `v0-1-reference.yaml` |
| [`results/`](results/) | every execution's records and scores, run by run (transcripts are release assets) |
| [`findings/`](findings/) | finding notes, generated from results, for WingFoil's maintainer to file |
| [`site-content/`](site-content/) | the method page's prose; the rest of the site is generated |
| [`src/`](src/) | the `bench` command: runner, scoring, aggregation, site |

The hold-out tests and S2's answer key live in a separate, private repository, so that public material cannot be
used to pass them (threats T5 and T13).

## Tooling

This repository is itself managed with WingFoil. The WingFoil version that manages this repository
is pinned in `vendor/` (built from a fixed WingFoil commit) and is **independent** of the WingFoil
version under test, which each benchmark campaign selects on its own.

```bash
npm install
npx wingfoil --help
```

Private oracles and hold-out scenarios live in a separate, private repository.

## Development

One TypeScript package (Node.js ≥ 22.12), organized as modules under `src/` that depend only downwards
(`docs/02_specification/requirements.md` REQ-ARC-01/02; the lint enforces the rule).

```bash
npm test          # unit and acceptance tests, coverage at or above 80%
npm run lint      # ESLint and Prettier
npm run typecheck
npm run build     # compiles src/ into dist/
```

Acceptance tests live in `test/acceptance/`, one per Gherkin scenario of
`docs/02_specification/acceptance/`, named `@<feature> <scenario title>`. A traceability test fails
when a scenario of a started task has no test.

Scenarios live in `scenarios/<id>/<version>/scenario.yaml`. The trivial scenario used by the runner's
own tests is `test/fixtures/scenarios/T0/1.0/`.

## Commands

`npm run build` compiles the `bench` command; then:

```bash
npx bench campaign validate campaigns/<name>.yaml
```

```bash
BENCH_FAKE_SCRIPT=<script.json> npx bench campaign run campaigns/<name>.yaml
```

```bash
BENCH_AGENT_TOKEN_FILE=<token-file> npx bench campaign run campaigns/<name>.yaml --allow-spending
```

`validate` checks the campaign file (`docs/02_specification/requirements.md` REQ-FMT-01): every harness pinned
to a released version or a commit, the baseline arm present, every scenario it names present under
`scenarios/<id>/<version>/`. It prints the campaign's identity, the digest that names its results.
`run` executes every scenario × arm × repetition with the default model, then each model slice's
scenarios × arms × repetitions with the slice's model: one Docker image per campaign, one container per
run, whose only mount is that run's fresh workspace (a copy of the scenario seed, made a git
repository). Workspaces land in `runs/<campaign-id>/<n>/`, the execution in
`results/<campaign-id>/<n>/`, which holds `run.json` per run and `steps/<NN>/{usage.json,
transcript.jsonl, diff.patch}` per step. Transcripts are git-ignored.

Each step is a **fresh agent session**: nothing but the repository carries state from one step to the
next, and after each step the workspace is committed as `step <NN>`.

When a session ends **waiting for input** — a question, or a request for approval — the **neutral
approver** answers it in the same session, with the fixed reply of the approver policy the campaign
pins (`approver_policy: v1`): *"Approved. Proceed."* to an approval request, *"No further input is
available. Make the most reasonable choice, record it, and proceed."* to a question. Each reply is an
**intervention**, recorded in `run.json` with its step, kind and text. After three in one step, a
session still waiting gets no reply and the step ends as `intervention cap reached`; the run goes on.
The policy is the same in every arm.

Which agent runs is the campaign's `agent.name`. The **scripted fake agent** costs nothing and reads
its script from `BENCH_FAKE_SCRIPT`; a script may name a recorded session for the fake to replay, and
one recorded session per reply it expects from the approver, so the whole pipeline can be exercised
without an agent. **Claude Code** reads its long-lived token from
the file named by `BENCH_AGENT_TOKEN_FILE` — created with `claude setup-token` — which reaches the
container as an environment variable and is scrubbed out of every stored transcript. Because it
spends real money, a campaign naming it refuses to start unless `--allow-spending` is passed.

```bash
npx bench scenario dry-run <id>@<version> --arm <arm> [--model <id>] [--allow-spending]
```

A **dry run** is one real run of a scenario version in one arm, made to measure what it costs. It
takes what a campaign file would pin — agent, harnesses, approver policy, caps, currency rate — from
`scenarios/dry-run.yaml`, and it is stored in `results/dry-runs/<n>/`, marked `dry_run: true` in its
`run.json` and never counted as a campaign's result. Before it starts, it prints what the latest
completed dry run of the same version, arm and model cost; when it ends, it prints what this one cost
per step and in total.

```bash
npx bench campaign estimate campaigns/<name>.yaml
```

`estimate` prices a campaign before it runs, from its scenarios' dry runs: for every scenario version,
arm and model the campaign file describes — its model slices included — the latest completed dry run's
cost times the repetitions, then the total in euro at the campaign's rate, as an API-equivalent cost.
It starts nothing. A key with no dry run fails the estimate, naming the dry run to make. `campaign run`
prints the same total before it starts, and what the campaign spent when it ends.

Before anything is built, `campaign run` applies the **budget guard**: a campaign whose cost cannot be
estimated does not start, nor does one whose estimate is above its `ceiling_eur` — no option overrides
the ceiling. Above `warn_eur` it shows the estimate and the threshold and starts only when the
maintainer answers `y` on a terminal; without a terminal it does not start.

While it runs, the caps hold. Each session is given what is left of the run's `run_cost_eur` as the
agent's own budget, and stops there: the step and the run end `cap reached`, the step's snapshot kept.
Every command of a step runs under `timeout` with what is left of `step_time_s`: a step killed there
ends `time cap reached`, and since a killed session reports no cost, it is counted at the most it can
have cost. A session whose tokens exceed `step_tokens` is not resumed (`token cap reached`). No run
starts once the runs so far have spent `ceiling_eur` (`campaign ended: budget exhausted`), nor after a
session met the subscription's usage limit (`quota exhausted`).

A run that is interrupted — a killed process, a closed terminal, a reboot — can leave its container
behind. The runner never removes a container it did not create: at the start of a campaign it lists
the ones earlier runs of that campaign left, warns about each with the `docker rm --force` that clears
it, and fails the run whose container name is still taken, with the same command.

```bash
npx bench score <campaign-id>/<n> [--holdout <path>]
npx bench score dry-runs/<n>
```

`score` scores every run of an execution with its scenario's **hidden tests**, outside every run
container. Each step's snapshot is rebuilt from what the run stored — the seed, the setup's patch and
each step's patch — and checked against the tree the run recorded. Each suite then runs under
`node:test` with `tsx`, in a scoring container built from `docker/score-image/`, with no network, the
suite mounted read-only and the snapshot copied in. A suite's total is what it counts on the seed; a
test a snapshot does not pass, or never reports, fails. The result is `score.json` beside `run.json`:
M-Q1 for every step a suite is bound to and for the final snapshot, byte-identical when scored again
(adr-004). With `--holdout` (or `BENCH_HOLDOUT_PATH`), the hold-out's additions run the same way, in
containers of their own beside the public suite, and are stored apart under `holdout`, in counts only:
no name, message or output of a hold-out test is printed or stored. Without one, `holdout` says why it
was not scored. `score.json` also records the run's **cost** per step and in total — tokens by kind,
API-equivalent cost in USD and euro, wall time, turns and interventions — from what the run stored; a
step killed at its time cap counts at the most it can have cost, marked `cost_reported: false`.

An arm with a harness declares the capabilities its harness **provides** (`arms/<arm>/arm.yaml`); a
scenario declares the ones it needs. A run whose harness lacks one is an **expected failure**: it runs
and is scored like any other, and is marked in `run.json` and `score.json` with the missing capability
named — never skipped. `campaign validate` lists them before anything runs. The baseline arms are the
reference and are never marked. One line per run: `T3@1.0 baseline fake-model r1: step 01 0/1, step 02 1/1, final 1/1;
hold-out final 1/2`.

```bash
npx bench run show <campaign-id>/<n>/runs/<scenario>@<ver>/<arm>/<model>/r<k> [--full]
npx bench run compare <run> <run>
```

`run show` prints one stored run: its pins, every step's usage, models, commits, diff and test results. `run compare`
sets two runs side by side, step by step.

```bash
npx bench finding <campaign-id>/<n> --scenario <id>@<version> --metric <metric> --arms <arm>,… --as bug|decision-log
```

`finding` writes a finding note under `findings/` from an aggregated execution: the campaign, the WingFoil commit,
the runs and the metric's values, ending with a block in the shape of a WingFoil bug or decision record.

```bash
npx bench site build <campaign-id>/<n>
npx bench site publish [--remote <name>]
npx bench transcripts pack <campaign-id>/<n>
```

`site build` writes the static site of an execution into `site/`. `site publish` pushes `site/` to the `gh-pages`
branch, only when the repository is public and only what a fresh build gives. `transcripts pack` packs an
execution's transcripts into one release asset and prints the `gh release create` command, which it does not run.

Exit codes: `0` success, `1` failure (one line per problem, or a run that failed), `2` usage error.

```bash
npm run test:bin     # the built command line
npm run test:docker  # W1's to W3's runs, a dry run, bug-003's, and W6's scoring, in a real container (needs Docker)
```

## License

MIT — see [LICENSE](LICENSE).
