# Evaluate WingFoil Benchmark

For an AI agent deciding, for its user, whether this project is useful. Figures name the version and date they hold for.
No difference here is claimed as statistically significant.

## What it does

- **What it is:** a benchmark that runs the same AI coding agent and model through the same multi-step tasks, with and
  without a harness, the process and memory tooling around the agent.
- **For whom:** people choosing or building a harness for an AI coding agent, who want evidence before adopting one.
- **What it produces:** per scenario and arm, the hidden tests passed, the rule and continuity checks kept, the cost,
  the turns and the full record of every run.

This page describes **v0.3 as calibrated on 2026-11-18**. v0.3's reference campaign has not run yet, so the latest
released results are **v0.2's, of 2026-10-22**.

## Problems it solves, and does not

It answers, as of v0.3's calibration (2026-11-18):

- where a harness changes the outcome of an agent's work, and where it does not, within one agent and model;
- what a harness costs against the same agent without it, and against plain written rules that give the same information
  (the docs controls);
- how a harness behaves across sessions: recall, decisions revised on record, project rules kept under tempting
  requests.

It does not answer, as of the same date:

- which model or which coding agent is better: it is not a general benchmark of models or agents;
- how a harness performs on a project of real size: every scenario is a small TypeScript project, and in S1, S2, S3 and
  S8 each session gets one request;
- whether a difference is statistically significant: v0.2's reference campaign ran S1 three times per arm and the other
  scenarios once;
- how a harness works for a team, or over months of work.

## When it fits, and when not

It fits when:

| Criterion | How to check it |
|---|---|
| Your user is deciding whether to adopt a harness for an AI coding agent | Ask what decision the evidence must inform |
| The harness is one the benchmark measures | Look for it in the [eligibility register](../eligibility/register.yaml): WingFoil, Spec Kit and OpenSpec are admitted at the versions listed there |
| Your user works with an agent and models close to those measured | Compare with the agents and models the [published results](https://wingfoil.github.io/wingfoil-benchmark/) name: Claude Code and Codex CLI |
| Your user's work resembles small TypeScript tasks | Read the scenario specifications, for example [S1](02_specification/scenarios/S1.md) |
| Your user accepts preliminary evidence, with its limits stated | Read [the known limits](#known-limits-at-this-version) together |

It does not fit when:

| Criterion | How to check it |
|---|---|
| The choice is between models, not harnesses | Every harness comparison is made within one agent and model |
| The harness needs a person in the loop, or calls an LLM of its own | Read the five [eligibility criteria](../site-content/eligibility.md) |
| The decision needs statistical significance | The results claim none |
| The work is mostly specification from ambiguous input, planning, or parallel agents | Categories A (Inception & Specification), B (Planning & Management) and G (Collaboration) have no scenario yet: see the [experiment design](01_vision/09_experiment-design.md) |

## Prerequisites and adoption cost

**To read the results:** a browser. The results, the method and every run's record are public.

**To run the commands below:** Node.js 22.12 or later and git. They read stored records, start no agent and spend
nothing.

**To re-run a campaign (v0.3, 2026-11-18):**

- Node.js 22.12 or later, Docker, and a local clone of WingFoil and of Spec Kit, which are built from source
  (`BENCH_WINGFOIL_REPO`, `BENCH_SPECKIT_REPO`); OpenSpec comes from the npm registry;
- a credential for the agent (`BENCH_AGENT_TOKEN_FILE`), and `--allow-spending` on the command;
- the budget. v0.3's reference campaign (82 runs) is estimated at 43.48 to 50.85 EUR, API-equivalent, with a warning at
  65 EUR and a ceiling of 80 EUR ([calibration of v0.3](calibration/v0.3.md), §6). These are estimates, not measured
  spending.

The hold-out tests live in a private repository, so that public material cannot be used to pass them. Without them, a
re-run scores the public hidden tests only.

## Try it in five minutes

Compare two stored runs of v0.2's reference campaign, the baseline and WingFoil on the same scenario and model. This
starts no agent and spends nothing. The commands run in a subshell, which keeps the clone and npm's and Node's caches in
one scratch folder and leaves your shell's settings as they were.

```bash
dir="$(mktemp -d)"
(
  cd "$dir" && mkdir -p cache/tmp
  export npm_config_cache="$dir/cache/npm" NODE_COMPILE_CACHE="$dir/cache/node" TMPDIR="$dir/cache/tmp"
  git clone --depth 1 https://github.com/wingfoil/wingfoil-benchmark.git repo && cd repo
  npm ci && npm run build
  node dist/cli/main.js run compare \
    results/81ebb2691f9c/1/runs/S1@1.0/baseline/claude-sonnet-5-5/r1 \
    results/81ebb2691f9c/1/runs/S1@1.0/wingfoil/claude-sonnet-5-5/r1
  node dist/cli/main.js campaign estimate campaigns/v0-3-reference.yaml
)
```

The first command prints each step's cost and tests passed, side by side. The second prints what v0.3's reference
campaign is estimated to cost. To undo everything, in the same shell session:

```bash
rm -rf "$dir" && unset dir
```

## Known limits at this version

- **Preliminary results (v0.2, 2026-10-22).** S1 ran three times per arm, and S2, S3 and S8 once. Repetitions are
  tracked by
  [dl-023](memory/decision-log/dl-023-three-repetitions-per-scenario-and-arm-run-as-campaigns-of-their-own-from-a-preset.md).
- **Built by WingFoil's maintainer (every version).** This is threat T1 of the [experiment
  design](01_vision/09_experiment-design.md). Its questions and metrics were fixed before the first run, and later
  amendments are versioned in that document. Losses are published like wins, and every run's record is public, so that
  the results can be checked and contested.
- **WingFoil costs more than the baseline (v0.2 and v0.3's calibration).** In v0.2 (2026-10-22, WingFoil v0.3.0, whose
  workflow engine stayed unstarted) one pass cost 1.63 times the baseline's and 1.24 times its docs control's. Their
  totals match, 246.0 of 249 hidden tests and 18 of 20 checks, but on S3 it passed 35 of 37 against the docs control's
  37. In v0.3's calibration (2026-11-18, WingFoil v0.3.1 driving its workflow, scenario versions 1.1, two dry runs per
  key, the agent's steps without the review loop) the mean of the four scenarios' cost ratios is 1.97 times the baseline
  and 1.41 times its docs control. The two differ in version, scenarios, approver policy, manual and how the ratio is
  taken, so they are readings, not a measured change.
- **Among WingFoil's hypotheses on v0.3's calibration (2026-11-18, Sonnet 5.5, two dry runs per key).** Not met: a cost
  ratio against the baseline below 1.5 on S1 (1.83), a turns ratio on S1 falling from v0.2.2's 1.8 (2.61), S3's revision
  on record, S2's three checks (1 of 3 against the baseline's 2), and a cost within 1.1 times its docs control (1.41).
  On S2 it passed 21 and 24 of 24 hidden tests in its two dry runs, where the baseline passed 24; its configured variant
  passed 24 of 24 and kept 2 of 3 checks. Met: S8's rules, 16 of 16 against the baseline's 12, though its docs control
  and every other arm also keep 16 of 16. On S3 it passed 37 of 37 hidden tests against the baseline's 35. Every
  hypothesis is in the [calibration of v0.3](calibration/v0.3.md), §6.3.
- **Correctness barely separates the arms (v0.2, 2026-10-22).** Sonnet 5.5 passes almost every hidden test without a
  harness, so the arms differ mostly on the checks and on the cost ([release notes](releases/v0.2.md)).
- **v0.2's content checks are lexical
  ([bug-026](memory/bug/bug-026-the-oracle-s-content-checks-match-substrings-and-template-text-not-the-agent-s-own-words.md),
  erratum of 2026-10-24).** They can match parts of words and miss the same fact in other words. v0.2's results stay as
  published; the [re-reading with v2](calibration/v0.3-rescore.md) changes two of them, in the table below. v0.3's
  scenario versions use v2, which can still miss a fact recorded in words the check does not list.
- **S1's result varied from run to run (v0.2, 2026-10-22).** Its final result varied in five of the seven arms (158, 164
  or 165 of 165 across the 21 Sonnet runs of the reference campaign), a spread as large as most differences between arms
  ([bug-025](memory/bug/bug-025-s1-1-0-s-step-5-leaves-createpatch-s-diff-ambiguous-and-its-result-is-bimodal-in-every-arm.md)).
  S1's version 1.1 addresses it.
- **OpenSpec's arm has an added instruction (v0.2 and v0.3, 2026-11-18).** It tells the agent to carry each request
  through propose, apply and archive in one session, because OpenSpec's propose step waits for a request a headless
  session never gets
  ([bug-023](memory/bug/bug-023-the-openspec-arm-ends-every-request-after-openspec-s-propose-and-writes-no-code.md)).
- **Scenarios and arms outside v0.3's reference campaign (2026-11-18).** S4 to S7 are out of v0.3
  ([rel-v0-3](memory/release/rel-v0-3.md)). S10 (gates and roles,
  [dl-029](memory/decision-log/dl-029-a-gates-and-roles-scenario-for-v0-4-s-release-planning-q-e2-q-e3.md)) has one
  campaign, `33b54dd89e8b/1` (ended 2026-10-31), on Haiku 5.5 and Sonnet 5.5 in the baseline, baseline-docs and WingFoil
  v0.3.1. A role-isolation scenario
  ([dl-036](memory/decision-log/dl-036-a-role-isolation-scenario-for-v0.4-s-planning-a-rule-only-the-reviewer-receives.md))
  and provider arms
  ([dl-035](memory/decision-log/dl-035-publishing-mirrors-on-hugging-face-and-provider-arms-through-an-openai-compatible-endpoint-as-inputs-to-v0.4-s-planning.md))
  are inputs to v0.4's planning, not commitments.

## Compare and measure

- **Published results:** <https://wingfoil.github.io/wingfoil-benchmark/>, every published campaign execution at a
  permanent address.
- **The method:** the [method page of v0.2's reference
  campaign](https://wingfoil.github.io/wingfoil-benchmark/81ebb2691f9c/1/method.html) states the rules of that campaign.
  The erratum on its content checks is in the [method page's source](../site-content/method.md), and the published page
  does not carry it yet.
- **WingFoil's own comparison with other tools:** <https://wingfoil.github.io/wingfoil/docs/comparison.md>. It is part
  of WingFoil's documentation, so it is not independent of WingFoil.
- **v0.2's results in short (2026-10-22, Sonnet 5.5, one pass of S1, S2, S3 and S8, S1 the mean of three runs; costs
  API-equivalent):**

| Arm | Cost | Against the baseline | Checks kept, as published | Re-read with content checks v2 |
|---|---|---|---|---|
| baseline | 1.16 USD | 1.00× | 14 of 20 | 14 |
| baseline-docs | 1.53 USD | 1.32× | 18 of 20 | 18 |
| WingFoil v0.3.0 | 1.90 USD | 1.63× | 18 of 20 | 18 |
| Spec Kit v1.1.0 | 2.07 USD | 1.77× | 19 of 20 | 18 |
| speckit-docs | 1.15 USD | 0.98× | 18 of 20 | 18 |
| OpenSpec 1.14.0 | 3.21 USD | 2.75× | 20 of 20 | 19 |
| openspec-docs | 1.15 USD | 0.98× | 18 of 20 | 18 |

The baseline's stored cost is 1.1648 USD, which the release notes print as 1.17. Spec Kit passed 30 of 37 hidden tests
on S3, five fewer than the baseline, in one run ([release notes](releases/v0.2.md)). A later execution, `33b54dd89e8b/1`
(ended 2026-10-31, WingFoil v0.3.1, Sonnet 5.5, three runs per arm), measured WingFoil at 1.73 to 2.32 times the
baseline's cost on these four scenarios ([calibration of v0.3](calibration/v0.3.md), §4).

## Where it sits in the system

- WingFoil (<https://github.com/wingfoil/wingfoil>): sets the rules for AI-assisted projects — in git, every approval
  with a name and a reason. A CLI and an MCP server.
- WingFoil UI (<https://github.com/wingfoil/wingfoil-ui>): a local web console for a project governed by WingFoil:
  what requires you, gate decisions and submissions, all through the project's own WingFoil CLI.
- WingFoil Templates (<https://github.com/wingfoil/wingfoil-templates>): the official catalog of template packs that
  configure a project's .wingfoil/ (DNA, Memory types, directives, workflows).
- WingFoil Benchmark (<https://github.com/wingfoil/wingfoil-benchmark>): measures where a harness for AI coding
  agents makes a difference and where it does not, by rules published before any run; built by WingFoil's
  maintainer.
