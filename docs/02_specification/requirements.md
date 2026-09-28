# Requirements (v0.1)

**Version:** 1.8
**Date:** 2026-09-28
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
| REQ-ARC-03 | Repository layout: `scenarios/<id>/<version>/`, `arms/<arm>/`, `campaigns/<name>.yaml`, `results/`, `site/`. The hold-out repository mirrors `scenarios/<id>/<version>/` for its additions, each under the id of the suite it adds to (1.7, dl-001). A scenario version may hold `arms/<arm>/` too (REQ-FMT-04): configuration for one arm, which is not the repository's `arms/<arm>/` definition (added in 1.6). | F3.1, F3.5 |
| REQ-ARC-04 | Every external process (Docker, git, Claude Code, linters) is called through a small port interface, so that acceptance tests replace it with a fake (acceptance decision 1). | acceptance README |
| REQ-ARC-05 | The package's own `.wingfoil/dna.yaml` lists the modules of REQ-ARC-01 once they exist (W1). | traceability |

## 2. Data formats (REQ-FMT)

All human-authored files are YAML, validated by Zod schemas in `core`. All machine output is JSON.

| ID | Requirement | Serves |
|---|---|---|
| REQ-FMT-01 | **Campaign file** (`campaigns/<name>.yaml`), which lives in `campaigns/`, beside `scenarios/` and `results/`. It holds:<br>• `harnesses`: arm → `{tool, version, commit?}`, one entry per arm **except** `baseline` and `baseline-docs`, which run the plain agent and must have none (added in 1.2; until W3 this list is fixed, then it follows each arm's `requires`, REQ-FMT-05)<br>• `scenarios`: `[{id, version}]`<br>• `arms`<br>• `agent: {name, version}`<br>• `models`: `{default, slices?}`, where each slice is `{model, scenarios, arms, repetitions}` for the Opus comparison (shape fixed in 1.2)<br>• `repetitions`: per scenario<br>• `approver_policy`: a version<br>• `caps: {step_time_s, step_tokens, run_cost_eur}`<br>• `budget: {warn_eur, ceiling_eur}`<br>• `currency: {usd_to_eur}`<br>A campaign must include the **baseline** arm (added in 1.1, threat T7). The scenario seed is not a campaign field: `scenario@version` pins it (1.2). | F1.1, F1.3, T7 |
| REQ-FMT-02 | **Campaign identity:** SHA-256 of the campaign file canonicalized (parsed, keys sorted, re-serialized as JSON), shortened to 12 hex characters. An execution of a campaign is `<campaign-id>/<n>`, with `n` counting executions. | F1.1 |
| REQ-FMT-03 | A harness `version` must be a released version (semver, optionally `v`-prefixed, with optional prerelease and build metadata) or a commit SHA of 7 to 40 hex characters. A branch name, a range or `latest` is rejected. When `version` is a SHA and `commit` is also given, `commit` is a 40-character SHA that starts with `version` (added in 1.2). | F1.1 (error path) |
| REQ-FMT-04 | **Scenario file** (`scenarios/<id>/<version>/scenario.yaml`). It holds:<br>• `id`, `version`<br>• `categories: {primary, secondary[]}`, `profiles[]`, `gqm[]`, `capabilities[]`<br>• `seed`: a directory<br>• `steps[]`: `{n, prompt_file}`<br>• `oracle`: `suites[]` as `{id, dir, after_steps[]}`, each suite of hidden tests declared once with the steps after which it is scored (changed in 1.7, dl-001); checks; third-party pins with licenses<br>• `holdout`: whether additions are expected<br>Beside it, optionally, `arms/<arm>/`: the scenario's configuration for that arm, found by the arm's name with no field in the file (added in 1.6, dl-005). Neither the seed nor a prompt may contain it or lie in it. | F3.1 |
| REQ-FMT-05 | **Arm definition** (`arms/<arm>/arm.yaml`). It holds: `name`, `setup` (script), `manual` (the operating manual file), `environment` (files copied into the workspace), `mcp` (optional config), and `requires` (the harness tool). | F2.5, F2.7 |
| REQ-FMT-06 | **Results layout:** `results/<campaign-id>/<n>/`. It contains:<br>• `campaign.yaml`, a copy<br>• `runs/<scenario>@<ver>/<arm>/<model>/r<k>/`, holding `run.json`, `setup/{log.txt, diff.patch}`, `steps/<NN>/{usage.json, transcript.jsonl, diff.patch}` and `score.json`<br>• `aggregate.json`<br>`<NN>` is the step number in two digits, the same form REQ-RUN-05 uses in a commit message, so a scenario has **at most 99 steps** (1.4). | F5.1 |
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
| REQ-CLI-06 | `bench score <campaign-id>/<n> [--holdout <path>]`; `bench score dry-runs/<n>` scores a dry run, whose `score.json` stays with it (added in 1.8) | F4.* |
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
| REQ-RUN-05 | After each step the runner commits the workspace with the message `step <NN>`, then stores `diff.patch` for that step: the binary-safe patch from the previous snapshot's tree to this one's, whatever was committed in between. After the setup it stores `setup/diff.patch`, from the seed's tree. `run.json` records the tree of the setup and of every step (changed in 1.8, task-027, bug-007). | F2.2 |
| REQ-RUN-06 | **Waiting-for-input detection.** A session is "waiting" when its final assistant message is classified as a question or an approval request by a fixed, versioned, rule-based classifier: approval patterns first, then a trailing question. **Approval patterns are matched anywhere in the message**, because a real approval request need not end with a question (1.3); the trailing-question test applies only when no approval pattern matched. The classifier's version is part of the approver policy version. The W2 spike settled it: [dl-004](../memory/decision-log/dl-004-waiting-for-input-classifier-v1.md). | F2.4 |
| REQ-RUN-07 | A reply resumes the same session with `--resume <session-id> -p <reply>`. Each reply is recorded as an intervention: step, kind, and reply text. | F2.4 |
| REQ-RUN-08 | Caps: a step is killed at `step_time_s`, or when its tokens exceed `step_tokens`. The run stops when its cumulative API-equivalent cost reaches `run_cost_eur`. The campaign stops starting runs when its cumulative cost reaches `ceiling_eur`. | F1.3 |
| REQ-RUN-09 | Usage is taken from the stream-json result events: tokens by kind, cost in USD converted with the campaign's rate, turns and duration. The API-equivalent cost is recorded whatever the billing (sequencer decision 1). | F2.3, M-K1 |
| REQ-RUN-10 | Web use is recorded from tool-use events named `WebFetch` or `WebSearch`. Network use through shell commands is **not** detected, and the method page states this limit. | T13 |
| REQ-RUN-11 | `baseline-docs` environment generator: a pure function of the wingfoil arm's configuration and the scenario. The output is deterministic, with sorted keys and fixed templates. | F2.5, T3 |
| REQ-RUN-13 | **Subscription quota** (requirements decision 2): when a session fails because the subscription's usage limit is reached, the step's outcome is `quota exhausted`. The campaign stops starting new runs, and the runs already completed are kept. The API-equivalent cost cap (REQ-RUN-08) keeps working as a proxy budget. | F1.3, sequencer decision 1 |
| REQ-RUN-14 | **WingFoil under test:** the wingfoil arm's setup installs WingFoil from a tarball built by the runner, with `npm pack` from a clean `git archive` of the pinned commit. It is never taken from `vendor/` (the managing WingFoil) nor from the host's `PATH`. Its dependencies are installed at the versions of the `package-lock.json` of that same commit, never resolved from the ranges in `package.json` (added in 1.5). It is invoked as `wingfoil`, never through `npx`, which does not resolve to the installed build and may fetch a published release instead (added in 1.5). The tarball's commit is recorded in `run.json`. | F2.6 |
| REQ-RUN-15 | **Agent authentication (amended 1.3):** by default the runner passes a **long-lived token** of the maintainer's Claude subscription (`claude setup-token`) into the container in the environment variable `ANTHROPIC_AUTH_TOKEN`, read at run time from a file outside the repository. `ANTHROPIC_API_KEY` is not interchangeable with it. Whitespace is stripped from a credential before it is passed, and a malformed one is refused before a session starts. Mounting the credential file read-only stays a **documented variant**: it requires the run image to create the agent's configuration directory owned by the container user, because mounting the file alone makes Docker create that directory owned by root, where the agent cannot keep the session state `--resume` needs. REQ-NFR-01 applies to either form. | F2.3, REQ-NFR-01 |
| REQ-RUN-16 | **Agent version:** Claude Code is pinned per campaign (`agent.version`). v0.1 development and dry runs use **2.1.221** (requirements decision 4). | F1.1, T7 |
| REQ-RUN-12 | The operating manual of each arm is copied as `CLAUDE.md` into the workspace. Its size in tokens is measured with a fixed tokenizer approximation and recorded per run. | F2.7 |
| REQ-RUN-17 | **Approval authority in the wingfoil arm** (requirements decision 1): the arm's WingFoil configuration declares a member "Benchmark Approver" with the `approver` role, and the container's git identity is that member. After the neutral approver's reply, the agent may run WingFoil's approval commands itself. The method page states that the *decision* is always the neutral approver's, and that the agent only executes it. | F2.4, F2.5, M-E3 |

## 5. Scoring (REQ-SCO)

| ID | Requirement | Serves |
|---|---|---|
| REQ-SCO-01 | Scoring runs in its own container, from a copy of each step snapshot, with the oracle mounted **read-only** and **no network** (added in 1.8). It never uses a run container. Each snapshot is rebuilt from what the run stored (REQ-RUN-05) and checked against the tree the run recorded. | F4.1 |
| REQ-SCO-02 | Hidden tests use Node's built-in `node:test`, with `tsx` to load the snapshot's TypeScript. They are independent of whatever test tool the agent chose. | F4.1 |
| REQ-SCO-03 | Scoring is deterministic: the same snapshot and oracle version give identical `score.json`. No wall clock or randomness enters a metric. Timestamps are only recorded as metadata. | F4.1 |
| REQ-SCO-04 | Static quality (M-Q2): ESLint with the **benchmark's** fixed configuration, not the project's; complexity from ESLint's `complexity` data; duplication with jscpd; coverage from the project's own tests under c8, or 0 if there are none. All are pinned in the scoring image. | F4.2 |
| REQ-SCO-05 | AST checks (M-E1 R2–R4, M-R2 public interface) use the TypeScript compiler API. R1 compares `dependencies` with the seed's. | F4.8, F4.5 |
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

1. **Approval authority:** option (a), recorded as REQ-SCO-11 (moved to REQ-RUN-17 in 1.1).
2. **Authentication:** the maintainer's Claude subscription by default (REQ-RUN-15, amended in 1.3:
   a long-lived token in an environment variable rather than a mounted credential file). Quota
   exhaustion is handled by REQ-RUN-13.
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

### Amendment 1.1 (traceability review, 2026-09-22)

- REQ-SCO-11 moved to the runner section as **REQ-RUN-17**, with no change in content: it concerns
  the wingfoil arm's setup and identity, not scoring.
- REQ-FMT-01: a campaign must include the baseline arm, so that "baseline rerun per campaign" (T7)
  is enforced rather than implicit.

Source: [traceability.md](traceability.md) §4, findings 1 and 3.

### Amendment 1.2 (delivery, W1 task-002 review, 2026-09-23)

- **REQ-FMT-01:** harness coverage is stated — one entry per arm except `baseline` and
  `baseline-docs` — because the review showed that a campaign with a `wingfoil` arm and no harness
  entry was accepted, which is the unreproducible campaign F1.1 exists to prevent. Until W3 the
  harness-free arms are that fixed pair; from W3 the rule follows each arm's `requires` (REQ-FMT-05).
- **REQ-FMT-01:** `models` is an object `{default, slices?}`, not a list with a marked default.
- **REQ-FMT-01:** the campaign file lives in `campaigns/`, so that the `scenarios/` and `results/`
  roots it derives stay inside the repository (REQ-ARC-03).
- **REQ-FMT-01:** the scenario seed is pinned through `scenario@version`, not by a campaign field.
- **REQ-FMT-03:** the accepted shapes of a pin are spelled out, and a `commit` given beside a SHA
  `version` must extend it.

The traceability matrix is unaffected: the feature, journey and acceptance file of every amended
requirement stay the same.

Source: [../memory/decision-log/dl-003-campaign-pins-harness-coverage-seed-and-the-models-shape.md](../memory/decision-log/dl-003-campaign-pins-harness-coverage-seed-and-the-models-shape.md)
(approver decisions A and B, W1 task-002 review).

### Amendment 1.3 (delivery, W2 task-004 spike, 2026-09-24)

- **REQ-RUN-15 (amended).** The default is a long-lived token in `ANTHROPIC_AUTH_TOKEN`, not a
  read-only mount of the credential file. The spike found that mounting the file alone makes Docker
  create the agent's configuration directory owned by `root`, where the agent cannot write the
  session state `--resume` depends on, and that the same token in `ANTHROPIC_API_KEY` does not
  authenticate at all: it retries until the cap and produces no result event. The mount is kept as a
  variant with its condition stated. Two operational rules are added: the variable is named, and a
  credential is sanitised or refused before a session is started.
- **REQ-RUN-06 (clarified).** "Approval patterns first" means matched **anywhere in the message**.
  The spike recorded a real approval request whose question mark sits mid-message and whose last
  sentence is a statement; a trailing-question test alone would have read it as "not waiting" and the
  run would have lost the intervention. The requirement's ordering is unchanged; what it means is now
  written down. The mention of the spike is replaced by its result.
- **Requirements decision 4, agent version.** Development and the spike run Claude Code **2.1.280**,
  the release current on 2026-09-23, rather than the 2.1.221 the decision named. Each campaign
  re-pins its own version, as that decision already provides (REQ-RUN-16).

The traceability matrix is unaffected: the feature, journey and acceptance file of every amended
requirement stay the same.

Source: [../memory/adr/adr-002-w2-runner-and-adapter-conventions.md](../memory/adr/adr-002-w2-runner-and-adapter-conventions.md)
and [../memory/decision-log/dl-004-waiting-for-input-classifier-v1.md](../memory/decision-log/dl-004-waiting-for-input-classifier-v1.md),
both approved by the approver on 2026-09-24 (W2 task-004).

### Amendment 1.4 (delivery, W2 task-005 review, 2026-09-24)

- **REQ-FMT-06:** `<NN>` is stated to be two digits, and a scenario is therefore limited to 99 steps.
  The limit was added to the scenario schema during task-005 and refused a 100-step scenario with no
  requirement behind it. Beyond 99 the two names of a step stop agreeing: `steps/100` sorts before
  `steps/99` in any listing, and `step 100` breaks the commit-message shape mid-run. No v0.1 scenario
  comes near the bound; it is written down so that an author of benchmark content meets it in the
  specification rather than in an error message.

The traceability matrix is unaffected: the feature, journey and acceptance file of every amended
requirement stay the same.

Source: the independent review of task-005 (W2, finding N-2), 2026-09-24.

### Amendment 1.5 (delivery, W3 task-011 spike, 2026-09-25)

- **REQ-RUN-14:** the WingFoil under test is installed with the dependency versions of its own
  lockfile at the pinned commit, and is invoked as `wingfoil`, never through `npx`. The spike found
  that the tarball built as the requirement says is reproducible byte for byte, but carries no
  lockfile: installing it alone resolved 17 of 111 dependencies to other versions than the lock's,
  `@modelcontextprotocol/sdk` among them, so two runs of one campaign could have exercised different
  code. Installing with the lockfile matched all 109 runtime entries. `npx wingfoil` did not see the
  installed build on the `PATH` and went to the npm registry, where a future published release would
  replace the pinned commit without notice. How the runner builds, caches and installs the artefact is
  [adr-003](../memory/adr/adr-003-w3-arm-conventions.md) decisions 1–5.

The traceability matrix is unaffected: REQ-RUN-14 still serves F2.6, `runner.feature`, wave W3.
dl-005's change to REQ-FMT-04 (a scenario's `arms/wingfoil/` directory) is not part of this
amendment; task-013 writes it, as the next version.

Source: [task-011](../memory/task/task-011-wingfoil-in-the-run-container-spike.md) Execution notes
(Q1, Q2), review decision of the approver, 2026-09-25.

### Amendment 1.6 (delivery, W3 task-013, 2026-09-25)

- **REQ-FMT-04:** a scenario version may hold `arms/<arm>/`, the scenario's configuration for that
  arm, found by the arm's name, with no field in `scenario.yaml`. Neither the seed nor a step prompt
  may contain it or lie inside it, so that the baseline arm never receives a rule (K3). This is the
  change [dl-005](../memory/decision-log/dl-005-a-scenario-s-project-rules-live-in-the-scenario-as-the-wingfoil-arm-s-configuration.md)
  planned (it named it 1.5, which task-011 had taken). Its layout inside `arms/wingfoil/` is the
  workspace's own paths ([adr-003](../memory/adr/adr-003-w3-arm-conventions.md) decision 9).
- **REQ-ARC-03:** a note that a scenario's `arms/<arm>/` is configuration for an arm, not an arm
  definition.

The traceability matrix is unaffected: REQ-FMT-04 still serves F3.1, REQ-ARC-03 F3.1 and F3.5; the
new directory is read in wave W3 by F2.6's setup and, in task-015, by the baseline-docs generator.

Source: [task-013](../memory/task/task-013-wingfoil-under-test-and-approval-authority.md), review
decision of the approver at that task's review, 2026-09-25.

### Amendment 1.7 (delivery, W6 task-026, 2026-09-28)

- **REQ-FMT-04:** the oracle's single public test directory is replaced by **declared suites**,
  `oracle.suites: [{id, dir, after_steps}]`. Each suite is declared once and bound to the steps after
  which it is scored; an `after_steps` value must be a declared step; no two suites share an id or a
  directory, and suites do not overlap; a check lies in no suite. `suites` is required and may be
  empty (a scenario with no hidden tests). This is the change
  [dl-001](../memory/decision-log/dl-001-per-step-oracle-mapping-in-the-scenario-format.md) planned
  (option 3), due before F4.1: the scorer must know which tests apply after which step.
- **REQ-ARC-03:** the hold-out's additions for a scenario version sit under `<suite-id>/`, the id of the
  suite they add to; a file under no declared suite fails validation.

The traceability matrix is unaffected: REQ-FMT-04 still serves F3.1 and REQ-ARC-03 F3.1 and F3.5; the
suites are read in wave W6 by F4.1's scorer and by the scoring half of F3.5.

Source: [task-026](../memory/task/task-026-oracle-suites-per-step.md), review decision of the approver
at that task's review, 2026-09-28 (`856321e`).

### Amendment 1.8 (delivery, W6 task-027, 2026-09-28)

- **REQ-RUN-05:** a stored patch runs from the previous snapshot's tree to this one's, binary-safe, so
  that the harness's and the agent's own commits within a phase are in it
  ([bug-007](../memory/bug/bug-007-a-stored-patch-leaves-out-the-commits-made-between-two-snapshots.md));
  the setup stores its patch from the seed; `run.json` records every snapshot's tree, which scoring
  rebuilds snapshots from (F4.1).
- **REQ-FMT-06:** a run's results hold `setup/log.txt` (since W3) and `setup/diff.patch`.
- **REQ-CLI-06:** `bench score dry-runs/<n>` scores a dry run (F6.x in W7 needs it); a dry run is never
  aggregated (REQ-RES-01).
- **REQ-SCO-01:** the scoring container has no network; snapshots are rebuilt from the stored patches
  and checked against the recorded trees.

The conventions scoring rests on — the census, how hidden tests are counted, how an oracle must import
the code under test — are [adr-004](../memory/adr/adr-004-w6-scoring-conventions.md)'s. The traceability
matrix is unaffected: REQ-RUN-05 stays with F2.2, which stores the patches, and F4.1 reads them through
REQ-SCO-01.

Source: [task-027](../memory/task/task-027-hidden-test-oracle.md), review decision of the approver at
that task's review, 2026-09-28 (`54d22f9`).
