# Evaluate WingFoil Benchmark

For an AI agent deciding, for its user, whether this project is useful. Every claim names the version and date it holds
for. No difference here is claimed as statistically significant.

## What it does

- **What it is:** a benchmark that runs the same AI coding agent and model through the same multi-step tasks, with and
  without a harness, the process and memory tooling around the agent.
- **For whom:** people choosing or building a harness for an AI coding agent, who want evidence before adopting one.
- **What it produces:** per scenario and arm, the hidden tests passed, the rule and continuity checks kept, the cost,
  the turns and the full record of every run.

This page describes **v0.3 as calibrated on 2026-11-18**. v0.3's reference campaign has not run yet, so the latest
released results are **v0.2's, of 2026-10-22**.

## Problems it solves, and does not

It answers:

- where a harness changes the outcome of an agent's work, and where it does not, with the agent and the model held
  constant;
- what a harness costs against the same agent without it, and against plain written rules that give the same information
  (the docs controls);
- how a harness behaves across sessions: recall, decisions revised on record, project rules kept under tempting
  requests.

It does not answer:

- which model or which coding agent is better: it is not a general benchmark of models or agents;
- how a harness performs on a project of real size: the scenarios' steps are small, so a harness's fixed cost weighs
  more here than it would on a larger task;
- whether a difference is statistically significant: most scenarios ran once;
- how a harness works for a team, or over months of work.

## When it fits, and when not

It fits when:

| Criterion | How to check it |
|---|---|
| Your user is deciding whether to adopt a harness for an AI coding agent | Ask what decision the evidence must inform |
| The harness is one the benchmark measures | Look for it in the [eligibility register](../eligibility/register.yaml): WingFoil, Spec Kit and OpenSpec are admitted at the versions listed there |
| Your user works with an agent and models close to those measured | Compare with the agents and models the [published results](https://wingfoil.github.io/wingfoil-benchmark/) name: Claude Code and Codex CLI |
| Your user accepts preliminary evidence, with its limits stated | Read [the known limits](#known-limits-at-this-version) together |

It does not fit when:

| Criterion | How to check it |
|---|---|
| The choice is between models, not harnesses | Every comparison here holds the model constant |
| The harness needs a person in the loop, or calls an LLM of its own | Read the five criteria of the [eligibility register](../eligibility/register.yaml) |
| The decision needs statistical significance | The results claim none |
| The work is mostly in a category with no scenario yet | Categories A, B and G have none; see the [v0.2 release notes](releases/v0.2.md) |

## Prerequisites and adoption cost

**To read the results:** a browser. The results, the method and every run's record are public.

**To run the commands below:** Node.js 22.12 or later and git. They read stored records, start no agent and spend
nothing.

**To re-run a campaign:**

- Node.js 22.12 or later, Docker, and a local clone of each harness built from source (WingFoil and Spec Kit);
- a credential for the agent;
- the budget. v0.3's reference campaign (82 runs) is estimated at 43.48 to 50.85 EUR, API-equivalent, with a ceiling of
  80 EUR ([calibration of v0.3](calibration/v0.3.md), 2026-11-18). These are estimates, not measured spending.

The hold-out tests live in a private repository, so that public material cannot be used to pass them. Without them, a
re-run scores the public hidden tests only.

## Try it in five minutes

Compare two stored runs of v0.2's reference campaign, the baseline and WingFoil on the same scenario and model. This
starts no agent and spends nothing, and everything stays in one scratch folder:

```bash
dir="$(mktemp -d)" && cd "$dir"
git clone --depth 1 https://github.com/wingfoil/wingfoil-benchmark.git .
npm ci && npm run build
node dist/cli/main.js run compare \
  results/81ebb2691f9c/1/runs/S1@1.0/baseline/claude-sonnet-5-5/r1 \
  results/81ebb2691f9c/1/runs/S1@1.0/wingfoil/claude-sonnet-5-5/r1
node dist/cli/main.js campaign estimate campaigns/v0-3-reference.yaml
```

The first command prints each step's cost and tests passed, side by side. The second prints what v0.3's reference
campaign is estimated to cost. To undo everything: `cd - && rm -rf "$dir"`.

## Known limits at this version

- **Preliminary results (v0.2, 2026-10-22).** S1 ran three times per arm, and S2, S3 and S8 once. Repetitions are
  tracked by
  [dl-023](memory/decision-log/dl-023-three-repetitions-per-scenario-and-arm-run-as-campaigns-of-their-own-from-a-preset.md).
- **Built by WingFoil's maintainer (every version).** This is threat T1 of the [experiment
  design](01_vision/09_experiment-design.md). The questions, metrics and scenarios were fixed before any run, losses are
  published like wins, and every run's record is public, so that the results can be checked and contested.
- **WingFoil does not win on cost (v0.2, 2026-10-22).** On Sonnet 5.5 its arm cost 1.63 times the baseline and matched
  its docs control on correctness and checks. In v0.3's calibration (2026-11-18, two dry runs per key) it cost 1.97
  times the baseline and 1.41 times its docs control, and the hypotheses that it would cost less are not met
  ([calibration of v0.3](calibration/v0.3.md), §6.3).
- **Correctness barely separates the arms (v0.2, 2026-10-22).** Sonnet 5.5 passes almost every hidden test without a
  harness, so the arms differ mostly on the checks and on the cost ([release notes](releases/v0.2.md)).
- **The content checks of v0.2 are lexical (v0.2, erratum of 2026-10-24).** They can match parts of words and miss the
  same fact in other words. The method page states their known misses, and v0.3's scenario versions use a revised check.
- **Scenarios and arms not measured yet (planned for v0.4).** S4 to S7 are out of v0.3
  ([rel-v0-3](memory/release/rel-v0-3.md)). A gates-and-roles scenario
  ([dl-029](memory/decision-log/dl-029-a-gates-and-roles-scenario-for-v0-4-s-release-planning-q-e2-q-e3.md)), a
  role-isolation scenario
  ([dl-036](memory/decision-log/dl-036-a-role-isolation-scenario-for-v0.4-s-planning-a-rule-only-the-reviewer-receives.md))
  and provider arms
  ([dl-035](memory/decision-log/dl-035-publishing-mirrors-on-hugging-face-and-provider-arms-through-an-openai-compatible-endpoint-as-inputs-to-v0.4-s-planning.md))
  are inputs to v0.4's planning, not commitments.

## Compare and measure

- **Published results:** <https://wingfoil.github.io/wingfoil-benchmark/>, every campaign execution at a permanent
  address.
- **The method:** the [method page of v0.2's reference
  campaign](https://wingfoil.github.io/wingfoil-benchmark/81ebb2691f9c/1/method.html) states every rule, including the
  ones that limit what the results can show.
- **WingFoil's own comparison with other tools:** <https://wingfoil.github.io/wingfoil/docs/comparison.md>. It is
  written by WingFoil's maintainer, as this benchmark is.
- **v0.2's results in short (2026-10-22, Sonnet 5.5, one pass of S1, S2, S3 and S8):** the baseline cost 1.17 USD and
  kept 14 of 20 checks; WingFoil v0.3.0 cost 1.90 USD and kept 18; OpenSpec 1.14.0 cost 3.21 USD and kept all 20; each
  docs control kept 18 at about the baseline's cost, or 1.32 times it for baseline-docs ([release
  notes](releases/v0.2.md)).

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
