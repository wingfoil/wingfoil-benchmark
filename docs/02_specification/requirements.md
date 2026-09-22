# Requirements (v0.1)

**Version:** 1.0
**Date:** 2026-09-22
**Status:** Approved
**Traces to:** [acceptance/](acceptance/) (all v0.1 features), [scenarios/](scenarios/) (K1–K5), [09_experiment-design.md](../01_vision/09_experiment-design.md), [07_sequencer.md](../01_vision/07_sequencer.md) v0.1

---

Requirement IDs are `REQ-<AREA>-<nn>`. Each requirement cites the features (F*) or the acceptance
file it serves. The acceptance criteria say **what** must be observable. This document says **how**
it is built, which formats it uses, and under which constraints.

Facts about external tools were checked on 2026-09-22:

- Claude Code **2.1.221** offers `-p`, `--output-format stream-json`, `--resume`, `--session-id`,
  `--model`, `--max-budget-usd`, `--permission-mode`, `--mcp-config`, `--strict-mcp-config` and
  `--setting-sources`.
- Docker **29.1.3** is available.

---

## 1. Architecture (REQ-ARC)

| ID | Requirement | Serves |
|---|---|---|
| REQ-ARC-01 | One TypeScript package (`wingfoil-benchmark`, Node.js ≥ 22.12, strict mode). It is organized as modules under `src/`: `core` (types and schemas), `campaign`, `scenario`, `arms`, `agents` (`claude-code`, `fake`), `runner`, `scoring`, `results`, `site`, `cli`. | all |
| REQ-ARC-02 | Modules depend only downwards: `cli` → (`runner`, `scoring`, `site`) → (`campaign`, `scenario`, `arms`, `agents`, `results`) → `core`. `scoring` never imports `runner`, and the reverse holds too. | isolation of run and score |
| REQ-ARC-03 | Repository layout: `scenarios/<id>/<version>/`, `arms/<arm>/`, `campaigns/<name>.yaml`, `results/`, `site/`. The hold-out repository mirrors `scenarios/<id>/<version>/` for its additions. | F3.1, F3.5 |
| REQ-ARC-04 | Every external process (Docker, git, Claude Code, linters) is called through a small port interface, so that acceptance tests replace it with a fake (acceptance decision 1). | acceptance README |
| REQ-ARC-05 | The package's own `.wingfoil/dna.yaml` lists the modules of REQ-ARC-01 once they exist (W1). | traceability |

## 2. Data formats (REQ-FMT)

All human-authored files are YAML, validated by Zod schemas in `core`. All machine output is JSON.

| ID | Requirement | Serves |
|---|---|---|
| REQ-FMT-01 | **Campaign file** (`campaigns/<name>.yaml`). It holds:<br>• `harnesses`: arm → `{tool, version, commit?}`<br>• `scenarios`: `[{id, version}]`<br>• `arms`<br>• `agent: {name, version}`<br>• `models`: a list with one default, plus slices `{model, scenarios, arms, repetitions}` for the Opus comparison<br>• `repetitions`: per scenario<br>• `approver_policy`: a version<br>• `caps: {step_time_s, step_tokens, run_cost_eur}`<br>• `budget: {warn_eur, ceiling_eur}`<br>• `currency: {usd_to_eur}` | F1.1, F1.3 |
| REQ-FMT-02 | **Campaign identity:** SHA-256 of the campaign file canonicalized (parsed, keys sorted, re-serialized as JSON), shortened to 12 hex characters. An execution of a campaign is `<campaign-id>/<n>`, with `n` counting executions. | F1.1 |
| REQ-FMT-03 | A harness `version` must be a released version or a commit SHA. A branch name or `latest` is rejected. | F1.1 (error path) |
| REQ-FMT-04 | **Scenario file** (`scenarios/<id>/<version>/scenario.yaml`). It holds:<br>• `id`, `version`<br>• `categories: {primary, secondary[]}`, `profiles[]`, `gqm[]`, `capabilities[]`<br>• `seed`: a directory<br>• `steps[]`: `{n, prompt_file}`<br>• `oracle`: public test directory, checks, third-party pins with licenses<br>• `holdout`: whether additions are expected | F3.1 |
| REQ-FMT-05 | **Arm definition** (`arms/<arm>/arm.yaml`). It holds: `name`, `setup` (script), `manual` (the operating manual file), `environment` (files copied into the workspace), `mcp` (optional config), and `requires` (the harness tool). | F2.5, F2.7 |
| REQ-FMT-06 | **Results layout:** `results/<campaign-id>/<n>/`. It contains:<br>• `campaign.yaml`, a copy<br>• `runs/<scenario>@<ver>/<arm>/<model>/r<k>/`, holding `run.json`, `steps/<NN>/{usage.json, transcript.jsonl, diff.patch}` and `score.json`<br>• `aggregate.json` | F5.1 |
| REQ-FMT-07 | `aggregate.json` stores every value together with the list of run paths it was computed from, and its `n`. | F5.1, experiment design §4.6 |
| REQ-FMT-08 | **Scenario validator:** checks the schema (REQ-FMT-04), and runs a **leak scan**. The scan fails when:<br>• a step prompt contains a name from a declared list of harness and tool names;<br>• an oracle literal (an expected value or a test name of at least a declared minimum length) appears in the seed or in a prompt.<br>With the hold-out configured, hold-out oracles are scanned too. Their content is never printed; messages name only the file and the step. | F3.2 |
| REQ-FMT-09 | **Scenario versions are immutable.** Results record the content hash of the scenario version they ran. The validator rejects a scenario version whose content no longer matches a hash recorded in stored results. | F3.4 |
| REQ-FMT-10 | Arm definitions declare `provides[]`, the harness capabilities the arm offers, for example `workflow-engine: false` for the WingFoil v0.2 pre-release. | F3.6 |

## 3. Command surface (REQ-CLI)

One binary, `bench`, run with `npx bench`. Exit codes: `0` success, `1` failure, `2` usage error.

| ID | Command | Serves |
|---|---|---|
| REQ-CLI-01 | `bench campaign validate <file>` | F1.1 |
| REQ-CLI-02 | `bench campaign estimate <file>` | F1.2 |
| REQ-CLI-03 | `bench campaign run <file>`. It asks for confirmation above `warn_eur`, and refuses above `ceiling_eur` with **no override option** (acceptance decision 2). | F1.3, F2.* |
| REQ-CLI-04 | `bench scenario validate <id>@<version> [--holdout <path>]` | F3.2 |
| REQ-CLI-05 | `bench scenario dry-run <id>@<version> --arm <arm> [--model <id>]` | F3.3 |
| REQ-CLI-06 | `bench score <campaign-id>/<n> [--holdout <path>]` | F4.* |
| REQ-CLI-07 | `bench finding <campaign-id>/<n> --scenario … --metric … --arms …`. It writes `findings/<id>.md`. | F5.4 |
| REQ-CLI-08 | `bench run show <run-path>` and `bench run compare <run-path> <run-path>` | F5.3 |
| REQ-CLI-09 | `bench site build <campaign-id>/<n>` writes to `site/`. `bench site publish` deploys it; publishing only ever happens through this command. | F5.5, F5.6, F5.8 |
| REQ-CLI-10 | The hold-out path can also come from `BENCH_HOLDOUT_PATH`. It is never read by `campaign run`. | F3.5, F2.1 |

## 4. Runner (REQ-RUN)

| ID | Requirement | Serves |
|---|---|---|
| REQ-RUN-01 | One Docker image per campaign: `node:22-bookworm`, git, and Claude Code at the version pinned by the campaign. It is built once per campaign, with the tag `<campaign-id>`. | F2.1 |
| REQ-RUN-02 | One container per run. The only bind mount is a fresh workspace directory, containing a copy of the seed plus the arm's environment, which becomes a git repository with one initial commit. Nothing from the benchmark repository or the hold-out is mounted. | F2.1 |
| REQ-RUN-03 | The arm setup runs inside the container before step 1. Its Claude Code usage (if any), wall time and cost are recorded as `setup`. | F2.5, M-K3 |
| REQ-RUN-04 | Each step runs: `claude -p <prompt> --output-format stream-json --verbose --model <id> --session-id <uuid> --permission-mode bypassPermissions --setting-sources project --max-budget-usd <remaining run cap>`. The wingfoil arm also gets `--mcp-config <arm mcp> --strict-mcp-config`. Bypassing permissions is acceptable only because the container is isolated. | F2.2, F2.3, F2.6 |
| REQ-RUN-05 | After each step the runner commits the workspace with the message `step <NN>`, then stores `diff.patch` for that step. | F2.2 |
| REQ-RUN-06 | **Waiting-for-input detection (spike in W2).** A session is "waiting" when its final assistant message is classified as a question or an approval request by a fixed, versioned, rule-based classifier: approval patterns first, then a trailing question. The classifier's version is part of the approver policy version. | F2.4 |
| REQ-RUN-07 | A reply resumes the same session with `--resume <session-id> -p <reply>`. Each reply is recorded as an intervention: step, kind, and reply text. | F2.4 |
| REQ-RUN-08 | Caps: a step is killed at `step_time_s`, or when its tokens exceed `step_tokens`. The run stops when its cumulative API-equivalent cost reaches `run_cost_eur`. The campaign stops starting runs when its cumulative cost reaches `ceiling_eur`. | F1.3 |
| REQ-RUN-09 | Usage is taken from the stream-json result events: tokens by kind, cost in USD converted with the campaign's rate, turns and duration. The API-equivalent cost is recorded whatever the billing (sequencer decision 1). | F2.3, M-K1 |
| REQ-RUN-10 | Web use is recorded from tool-use events named `WebFetch` or `WebSearch`. Network use through shell commands is **not** detected, and the method page states this limit. | T13 |
| REQ-RUN-11 | `baseline-docs` environment generator: a pure function of the wingfoil arm's configuration and the scenario. The output is deterministic, with sorted keys and fixed templates. | F2.5, T3 |
| REQ-RUN-13 | **Subscription quota** (requirements decision 2): when a session fails because the subscription's usage limit is reached, the step's outcome is `quota exhausted`. The campaign stops starting new runs, and the runs already completed are kept. The API-equivalent cost cap (REQ-RUN-08) keeps working as a proxy budget. | F1.3, sequencer decision 1 |
| REQ-RUN-14 | **WingFoil under test:** the wingfoil arm's setup installs WingFoil from a tarball built by the runner, with `npm pack` from a clean `git archive` of the pinned commit. It is never taken from `vendor/` (the managing WingFoil) nor from the host's `PATH`. The tarball's commit is recorded in `run.json`. | F2.6 |
| REQ-RUN-15 | **Agent authentication:** by default the runner uses the maintainer's **Claude subscription** credentials, mounted read-only into the container at run time (requirements decision 2). An API key through an environment variable is also supported. Either way REQ-NFR-01 applies. Whether a read-only mount lets the agent refresh its token is to be verified in the W2 spike. | F2.3, REQ-NFR-01 |
| REQ-RUN-16 | **Agent version:** Claude Code is pinned per campaign (`agent.version`). v0.1 development and dry runs use **2.1.221** (requirements decision 4). | F1.1, T7 |
| REQ-RUN-12 | The operating manual of each arm is copied as `CLAUDE.md` into the workspace. Its size in tokens is measured with a fixed tokenizer approximation and recorded per run. | F2.7 |

## 5. Scoring (REQ-SCO)

| ID | Requirement | Serves |
|---|---|---|
| REQ-SCO-01 | Scoring runs in its own container, from a copy of each step snapshot, with the oracle mounted **read-only**. It never uses a run container. | F4.1 |
| REQ-SCO-02 | Hidden tests use Node's built-in `node:test`, with `tsx` to load the snapshot's TypeScript. They are independent of whatever test tool the agent chose. | F4.1 |
| REQ-SCO-03 | Scoring is deterministic: the same snapshot and oracle version give identical `score.json`. No wall clock or randomness enters a metric. Timestamps are only recorded as metadata. | F4.1 |
| REQ-SCO-04 | Static quality (M-Q2): ESLint with the **benchmark's** fixed configuration, not the project's; complexity from ESLint's `complexity` data; duplication with jscpd; coverage from the project's own tests under c8, or 0 if there are none. All are pinned in the scoring image. | F4.2 |
| REQ-SCO-05 | AST checks (M-E1 R2–R4, M-R2 public interface) use the TypeScript compiler API. R1 compares `dependencies` with the seed's. | F4.8, F4.5 |
| REQ-SCO-11 | **Approval authority in the wingfoil arm** (requirements decision 1): the arm's WingFoil configuration declares a member "Benchmark Approver" with the `approver` role, and the container's git identity is that member. After the neutral approver's reply, the agent may run WingFoil's approval commands itself. The method page states that the *decision* is always the neutral approver's, and that the agent only executes it. | F2.4, F2.5, M-E3 |
| REQ-SCO-06 | **Format-neutral content checks** (S2 duplicate, S3 D3 revision, and later M-E3). A check is a set of case-insensitive patterns, declared in the oracle, matched against the git-tracked text files changed in the step and against the step's commit messages. It never checks paths or file formats of a specific harness. | F4.7, F4.8 |
| REQ-SCO-07 | Determinism metrics (M-R1–M-R3) are computed only for groups with n ≥ 2 runs sharing all pins. Otherwise the result is `n = 1` and no value. | F4.5 |
| REQ-SCO-08 | Break-even follows experiment design §4.2, with the "not applicable" and "never" cases. | F4.4 |
| REQ-SCO-09 | Hold-out results are stored separately from public results in `score.json`. | F3.5 |
| REQ-SCO-10 | **Expected failures:** a run is marked `expected failure` when the scenario's `capabilities` are not all in the arm's `provides` (REQ-FMT-10). The missing capabilities are named. The run is still executed and scored, and it counts as a loss in aggregation. | F3.6 |

## 6. Results and site (REQ-RES)

| ID | Requirement | Serves |
|---|---|---|
| REQ-RES-01 | Dry runs are stored under `results/dry-runs/`, and are never read by aggregation. | F3.3, F5.1 |
| REQ-RES-02 | The site is static HTML and CSS generated from `aggregate.json`, with no client framework. There is one landing page, one page per category, one method page, and permanent URLs per campaign execution (`/<campaign-id>/<n>/`). | F5.5, F5.8 |
| REQ-RES-03 | The landing page renders:<br>• "harness, not model", with the model name;<br>• the headline and one chart;<br>• one row per category A–G, where uncovered categories are listed as "not covered";<br>• the `preliminary` badge and `n` on every value;<br>• markers for hold-out results.<br>Losses and wins use the same visual weight. | F5.5 |
| REQ-RES-04 | `bench site publish` pushes `site/` to the `gh-pages` branch. It refuses while the repository is private: the repository becomes public at the first published result (brief decision). | F5.6 |
| REQ-RES-06 | **What is committed** (requirements decision 3): `run.json`, `score.json`, `usage.json`, `diff.patch` and `aggregate.json` are committed. Transcripts (`transcript.jsonl`) are git-ignored, compressed per campaign execution, and attached to a GitHub release named `<campaign-id>-<n>`. `run.json` records the release asset that holds each transcript. | F5.1, F5.3 |
| REQ-RES-05 | A finding note is Markdown with fixed sections: campaign, WingFoil commit, scenario@version, runs, metric values, links. It is written only into this repository. | F5.4 |

## 7. Non-functional (REQ-NFR)

| ID | Requirement | Serves |
|---|---|---|
| REQ-NFR-01 | **Secrets:** API keys or subscription credentials reach the container only through environment variables or a read-only mount at run time. They are never written to the workspace, logs, transcripts or results. Transcripts are scrubbed of known secret values before storage. | security-secrets directive |
| REQ-NFR-02 | **Reproducibility:** everything that influences a run is pinned in the campaign file or in a versioned file of this repository (scenario version, arm files, approver policy version, image tags). | experiment design §3 |
| REQ-NFR-03 | **Unattended execution:** a campaign runs without human input after its start confirmation. A failed run does not stop the campaign. | J2 step 4 |
| REQ-NFR-04 | **Testing:** the benchmark's own code follows the `testing` directive: test-first, with coverage above 80%. Acceptance scenarios run against the fake agent (acceptance decision 1). | acceptance README |
| REQ-NFR-05 | **Determinism of the benchmark's own logic:** no unordered iteration in aggregation or site generation, and stable sort orders everywhere. | determinism directive |
| REQ-NFR-06 | **Cost transparency:** every command that spends tokens (`dry-run`, `campaign run`) prints the estimate before starting, and the actual cost when it finishes. | F1.2 |

---

## Decisions from the requirements review

1. **Approval authority:** option (a), recorded as REQ-SCO-11.
2. **Authentication:** the maintainer's Claude subscription by default (REQ-RUN-15). Quota exhaustion
   is handled by REQ-RUN-13.
3. **What goes into git:** only the small files. Transcripts become GitHub release assets
   (REQ-RES-06).
4. **Agent version:** Claude Code 2.1.221 for v0.1 development and dry runs, re-pinned per campaign
   (REQ-RUN-16).

Also added while preparing the traceability matrix, so that every v0.1 feature has at least one
requirement:

- REQ-FMT-08, the validator and leak scan (F3.2);
- REQ-FMT-09, immutable scenario versions (F3.4);
- REQ-FMT-10 and REQ-SCO-10, capabilities and expected failures (F3.6);
- REQ-RUN-14, installing the WingFoil under test (F2.6).
