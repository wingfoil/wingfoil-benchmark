# Requirements (v0.1)

**Version:** 0.1
**Date:** 2026-09-22
**Status:** Draft
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
| REQ-RUN-12 | The operating manual of each arm is copied as `CLAUDE.md` into the workspace. Its size in tokens is measured with a fixed tokenizer approximation and recorded per run. | F2.7 |

## 5. Scoring (REQ-SCO)

| ID | Requirement | Serves |
|---|---|---|
| REQ-SCO-01 | Scoring runs in its own container, from a copy of each step snapshot, with the oracle mounted **read-only**. It never uses a run container. | F4.1 |
| REQ-SCO-02 | Hidden tests use Node's built-in `node:test`, with `tsx` to load the snapshot's TypeScript. They are independent of whatever test tool the agent chose. | F4.1 |
| REQ-SCO-03 | Scoring is deterministic: the same snapshot and oracle version give identical `score.json`. No wall clock or randomness enters a metric. Timestamps are only recorded as metadata. | F4.1 |
| REQ-SCO-04 | Static quality (M-Q2): ESLint with the **benchmark's** fixed configuration, not the project's; complexity from ESLint's `complexity` data; duplication with jscpd; coverage from the project's own tests under c8, or 0 if there are none. All are pinned in the scoring image. | F4.2 |
| REQ-SCO-05 | AST checks (M-E1 R2–R4, M-R2 public interface) use the TypeScript compiler API. R1 compares `dependencies` with the seed's. | F4.8, F4.5 |
| REQ-SCO-06 | **Format-neutral content checks** (S2 duplicate, S3 D3 revision, and later M-E3). A check is a set of case-insensitive patterns, declared in the oracle, matched against the git-tracked text files changed in the step and against the step's commit messages. It never checks paths or file formats of a specific harness. | F4.7, F4.8 |
| REQ-SCO-07 | Determinism metrics (M-R1–M-R3) are computed only for groups with n ≥ 2 runs sharing all pins. Otherwise the result is `n = 1` and no value. | F4.5 |
| REQ-SCO-08 | Break-even follows experiment design §4.2, with the "not applicable" and "never" cases. | F4.4 |
| REQ-SCO-09 | Hold-out results are stored separately from public results in `score.json`. | F3.5 |

## 6. Results and site (REQ-RES)

| ID | Requirement | Serves |
|---|---|---|
| REQ-RES-01 | Dry runs are stored under `results/dry-runs/`, and are never read by aggregation. | F3.3, F5.1 |
| REQ-RES-02 | The site is static HTML and CSS generated from `aggregate.json`, with no client framework. There is one landing page, one page per category, one method page, and permanent URLs per campaign execution (`/<campaign-id>/<n>/`). | F5.5, F5.8 |
| REQ-RES-03 | The landing page renders:<br>• "harness, not model", with the model name;<br>• the headline and one chart;<br>• one row per category A–G, where uncovered categories are listed as "not covered";<br>• the `preliminary` badge and `n` on every value;<br>• markers for hold-out results.<br>Losses and wins use the same visual weight. | F5.5 |
| REQ-RES-04 | `bench site publish` pushes `site/` to the `gh-pages` branch. It refuses while the repository is private: the repository becomes public at the first published result (brief decision). | F5.6 |
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

## Open questions

1. **Approval authority in the wingfoil arm** (deferred from scenario specs, README open question 1).
   WingFoil 0.2 lets only an `approver` identity approve.
   - **(a)** The container's git identity is a declared "benchmark approver" in the arm's WingFoil
     configuration. After the neutral approver's "Approved. Proceed.", the agent runs the approval
     command itself. It is simple and needs no runner support. It does let the agent execute an
     approval, but the *decision* is the neutral approver's, and this is published.
   - **(b)** The runner executes the approval command itself, under the neutral approver's identity.
     This keeps "agents never approve", but it requires the runner to extract from the agent's
     message which element to approve and to which state. That is harness-specific parsing, which
     conflicts with arm parity.

   **Proposal: (a)**, stated on the method page.
2. **Authentication for runs.** Dry runs and campaigns can use an **API key**, where the cost is real
   money, or your **Claude subscription** credentials mounted read-only, where the real limit is
   quota. The runner supports both (REQ-NFR-01). Which one for the first dry runs? This decides
   which budget limit the guard enforces (sequencer decision 1).
3. **What goes into git.** The proposal: `run.json`, `score.json`, `usage.json`, `diff.patch` and
   `aggregate.json` are committed. **Transcripts** (large) are compressed and attached to a GitHub
   release per campaign execution, and are git-ignored locally. Alternatively, commit everything.
4. **Agent version pin.** Pin Claude Code **2.1.221**, the version on this machine, for v0.1
   development and dry runs, and re-pin per campaign?
