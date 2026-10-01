# Requirements (v0.1)

**Version:** 1.22
**Date:** 2026-10-01
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
| REQ-FMT-04 | **Scenario file** (`scenarios/<id>/<version>/scenario.yaml`). It holds:<br>• `id`, `version`<br>• `categories: {primary, secondary[]}`, `profiles[]`, `gqm[]`, `capabilities[]`<br>• `seed`: a directory<br>• `steps[]`: `{n, prompt_file}`<br>• `oracle`: `suites[]` as `{id, dir, after_steps[]}`, each suite of hidden tests declared once with the steps after which it is scored (changed in 1.7, dl-001); `checks[]`, the paths of its check files (REQ-SCO-06; changed in 1.12); `decisions[]` as `{id, revised_by?}`, the decisions M-F1 checks, each tested by the public hidden tests whose name starts with `<id>:`, and, when the scenario revises it, the content check that records the revision (REQ-SCO-12; added in 1.14); `third_party[]` as `{name, url, commit \| sha256, license, files[]}`, the material vendored into a suite and pinned by exactly one of the two (changed in 1.10, dl-002)<br>• `holdout`: whether additions are expected<br>Beside it, optionally, `arms/<arm>/`: the scenario's configuration for that arm, found by the arm's name with no field in the file (added in 1.6, dl-005). Neither the seed nor a prompt may contain it or lie in it. | F3.1 |
| REQ-FMT-05 | **Arm definition** (`arms/<arm>/arm.yaml`). It holds: `name`, `setup` (script), `manual` (the operating manual file), `environment` (files copied into the workspace), `mcp` (optional config), `requires` (the harness tool), and `provides` (REQ-FMT-10; added in 1.9). | F2.5, F2.7 |
| REQ-FMT-06 | **Results layout:** `results/<campaign-id>/<n>/`. It contains:<br>• `campaign.yaml`, a copy<br>• `runs/<scenario>@<ver>/<arm>/<model>/r<k>/`, holding `run.json`, `setup/{log.txt, diff.patch}`, `steps/<NN>/{usage.json, transcript.jsonl, diff.patch, commits.json}` and `score.json`<br>• `aggregate.json`<br>`<NN>` is the step number in two digits, the same form REQ-RUN-05 uses in a commit message, so a scenario has **at most 99 steps** (1.4). | F5.1 |
| REQ-FMT-07 | `aggregate.json` stores every value together with the list of run paths it was computed from, and its `n`. A value that compares two groups, the break-even (REQ-SCO-08), carries both groups' runs and `n` (1.15). | F5.1, experiment design §4.6 |
| REQ-FMT-08 | **Scenario validator:** checks the schema (REQ-FMT-04), and runs a **leak scan**. The scan fails when:<br>• a step prompt contains a name from a declared list of harness and tool names;<br>• an oracle literal (an expected value or a test name of at least a declared minimum length) appears in the seed or in a prompt. Check files are not scanned for literals: a content check is refused instead when its step's prompt satisfies it (REQ-SCO-06; changed in 1.12).<br>With the hold-out configured, hold-out oracles are scanned too. Their content is never printed; messages name only the file and the step. | F3.2 |
| REQ-FMT-09 | **Scenario versions are immutable.** Results record the content hash of the scenario version they ran. The validator rejects a scenario version whose content no longer matches a hash recorded in stored results. | F3.4 |
| REQ-FMT-10 | Arm definitions declare `provides`, the harness capabilities the arm offers, as a map of capability to boolean: for example `workflow-engine: false` for the WingFoil v0.2 pre-release. An undeclared capability is not provided (1.9). | F3.6 |

## 3. Command surface (REQ-CLI)

One binary, `bench`, run with `npx bench`. Exit codes: `0` success, `1` failure, `2` usage error.

| ID | Command | Serves |
|---|---|---|
| REQ-CLI-01 | `bench campaign validate <file>` | F1.1 |
| REQ-CLI-02 | `bench campaign estimate <file>` | F1.2 |
| REQ-CLI-03 | `bench campaign run <file>`. It asks for confirmation above `warn_eur`, and refuses above `ceiling_eur` with **no override option** (acceptance decision 2). | F1.3, F2.* |
| REQ-CLI-04 | `bench scenario validate <id>@<version> [--holdout <path>]` | F3.2 |
| REQ-CLI-05 | `bench scenario dry-run <id>@<version> --arm <arm> [--model <id>]` | F3.3 |
| REQ-CLI-06 | `bench score <campaign-id>/<n> [--holdout <path>]`; `bench score dry-runs/<n>` scores a dry run, whose `score.json` stays with it (added in 1.8). When every run of a campaign execution is scored, it writes the execution's `aggregate.json` (REQ-FMT-06, REQ-FMT-07); it never aggregates a dry run (added in 1.11) | F4.*, F5.1 |
| REQ-CLI-07 | `bench finding <campaign-id>/<n> --scenario … --metric … --arms …`. It writes `findings/<id>.md`. Made precise in 1.19:<br>• the form is `bench finding <campaign-id>/<n> --scenario <id>@<version> --metric <metric> --arms <arm>,… --as bug\|decision-log`; each option is required, and a missing or unknown one is a usage error (exit 2);<br>• the execution is a campaign's, `<12 hex>/<n>`, holding `aggregate.json`; a dry run is refused, never being aggregated. The groups read are the campaign's default model's, and each run's `run.json` is read for its scenario hash and harness: one that cannot be read refuses the note;<br>• **the metric catalogue:** `M-Q1`, `M-Q1-holdout`, `M-Q2`, `M-D3`, `M-F1`, `M-F2`, `M-K1`, `M-K2`, `M-K3`, `M-K4`, `M-E1`, `M-R`, each read from one place of the aggregate. An unknown metric, a scenario version or an arm the execution does not hold is refused, naming it and what exists (exit 1);<br>• **the id** is `<campaign-id>-<n>-<scenario>-<version>-<metric>-<arms sorted, joined by +>`, an arm named twice being refused, lowercased, any character outside `[a-z0-9.+-]` as `-`. A note already there is refused (exit 1) and never overwritten. The command writes that file only, and prints its path. | F5.4 |
| REQ-CLI-08 | `bench run show <run-path>` and `bench run compare <run-path> <run-path>` (made precise in 1.18):<br>• **a `<run>`** is a directory holding a `run.json`, or a run's name under `results/` as `aggregate.json` writes it (`<campaign-id>/<n>/runs/<scenario>@<ver>/<arm>/<model>/r<k>`, or `dry-runs/<n>/runs/…`). Anything else is refused, naming it (exit 1); a wrong number of arguments is a usage error (exit 2). Both commands only read;<br>• **`bench run show <run> [--full]`** prints, as Markdown on standard output: the run's identity and the pins it records; each step's session, outcome, token usage, cost, interventions with the approver's replies, commit messages, transcript and diff; then the test results of its `score.json`, or "not scored". A step the run never reached reads "not reached": the steps are the scenario version's, from `scenarios/` when it holds the version the run ran. A step killed at its time cap shows what it reported, if anything, and its cost bound. The transcript is the agent's text whole, the user's on one line, each tool call on one line, and each tool result's first 5 lines, or all of them with `--full`, errors said; the session's result and its text. A transcript that is not on disk (REQ-RES-06) is stated, never an error. A `score.json` that cannot be read, or scores another version, is stated and the run is shown unscored;<br>• **`bench run compare <run> <run>`** takes two runs of the same scenario version (scenario, version and hash) and refuses any other pair, naming both (exit 1). It prints a table with one row per step, each run's cost (EUR when scored, USD otherwise), M-Q1 and interventions, a cost bound as `≤`, then the final snapshot's M-Q1, the hold-out's final counts, the checks passed, and the totals: cost and interventions in the table, and each run's tokens, turns and time under it. Two runs with the same arm and repetition are told apart by their model, or as A and B; mixed EUR and USD columns are said. | F5.3 |
| REQ-CLI-09 | `bench site build <campaign-id>/<n>` writes to `site/`. `bench site publish` deploys it; publishing only ever happens through this command. Made precise in 1.20:<br>• `build` replaces `site/<campaign-id>/<n>/` whole and rewrites `site/index.html` and `site/style.css`; another execution's directory is left as it is. `site/` is git-ignored: it is rebuilt from the committed aggregates. It prints the directory, the number of pages and the headline;<br>• it refuses, naming it and writing nothing: a dry run, an execution that does not exist or has no `aggregate.json`, an aggregate or a run's `run.json` that cannot be read, an aggregate of another shape (every path and figure the site reads of a group is checked first; `checks`, absent before task-035, may be missing, and M-E1 then reads "not measured") or of an `aggregate_version` it does not read, and a scenario version missing from `scenarios/` or whose hash differs from the one its runs recorded. | F5.5, F5.6, F5.8 |
| REQ-CLI-10 | The hold-out path can also come from `BENCH_HOLDOUT_PATH`. It is never read by `campaign run`. | F3.5, F2.1 |
| REQ-CLI-11 | `bench transcripts pack <campaign-id>/<n>` (added in 1.22) packs an aggregated campaign execution's transcripts into one release asset (REQ-RES-06), records it in its runs, and prints the `gh release` command that attaches it, which it does not run. A dry run is refused. | F5.6 |

## 4. Runner (REQ-RUN)

| ID | Requirement | Serves |
|---|---|---|
| REQ-RUN-01 | One Docker image per campaign: `node:22-bookworm`, git, and Claude Code at the version pinned by the campaign. It is built once per campaign, with the tag `<campaign-id>`. | F2.1 |
| REQ-RUN-02 | One container per run. The only bind mount is a fresh workspace directory, containing a copy of the seed plus the arm's environment, which becomes a git repository with one initial commit. Nothing from the benchmark repository or the hold-out is mounted. | F2.1 |
| REQ-RUN-03 | The arm setup runs inside the container before step 1. Its Claude Code usage (if any), wall time and cost are recorded as `setup`. | F2.5, M-K3 |
| REQ-RUN-04 | Each step runs: `claude -p <prompt> --output-format stream-json --verbose --model <id> --session-id <uuid> --permission-mode bypassPermissions --setting-sources project --max-budget-usd <remaining run cap>`. The wingfoil arm also gets `--mcp-config <arm mcp> --strict-mcp-config`. Bypassing permissions is acceptable only because the container is isolated. | F2.2, F2.3, F2.6 |
| REQ-RUN-05 | After each step the runner commits the workspace with the message `step <NN>`, then stores `diff.patch` for that step: the binary-safe patch from the previous snapshot's tree to this one's, whatever was committed in between. After the setup it stores `setup/diff.patch`, from the seed's tree. `run.json` records the tree of the setup and of every step (changed in 1.8, task-027, bug-007). Before its `step <NN>` commit it stores `commits.json`: the full messages, oldest first and scrubbed like the patch, of the commits the agent and its harness made during the step (added in 1.12). | F2.2 |
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
| REQ-SCO-04 | Static quality (M-Q2): ESLint with the **benchmark's** fixed configuration, not the project's; complexity from ESLint's `complexity` data; duplication with jscpd; coverage from the project's own tests under c8, or 0 if there are none. All are pinned in the scoring image (made precise in 1.16):<br>• **the files measured** are the source files (`.ts .tsx .mts .cts .js .jsx .mjs .cjs`, not `.d.ts`, not under `node_modules/`) that the final snapshot adds or changes from the seed, less every path the setup's stored patch touches. Tests are measured, but are not coverage targets. With none, M-Q2 is "not applicable"; with no final snapshot, "not reached";<br>• **the configuration** is `@eslint/js` recommended plus `typescript-eslint` recommended, not type-checked. Each function's complexity is read from `complexity` at 0, which is never counted as a finding; a file that does not parse is one finding;<br>• **coverage** is the lines of the coverage targets that c8 saw run while the project's `npm test` ran, counted whether its tests pass or fail. It is 0 covered when there is no `test` script, and the tests' outcome is recorded;<br>• `score.json` records each indicator as the integers it is a ratio of: lint findings and lines, functions and the sum and maximum of their complexity, duplicated lines and lines, covered and total lines. There is no composite. | F4.2 |
| REQ-SCO-05 | AST checks (M-E1 R2–R4, M-R2 public interface) use the TypeScript compiler API. R1 compares `dependencies` with the seed's. The directive checks of M-E1 are two kinds of REQ-SCO-06's check file (changed in 1.13):<br>• `dependencies`: one violation per runtime dependency name the step's `package.json` has and the seed's has not; devDependencies and version changes are none;<br>• `ast`: a `dir` of the snapshot and `rules` from a fixed catalogue — `undocumented-export` (an exported function with no TSDoc block before it), `wall-clock` (`Date.now()`, `new Date()` with no argument), `randomness` (`Math.random()`, Node's `crypto` random functions), `throw`. They match syntax, not types, in the `.ts`/`.tsx`/`.mts`/`.cts` files under `dir`, test and declaration files left out. The AST runs in the scoring container, with the TypeScript its image pins, which `score.json` records.<br>A directive check records, per step, its violations and where each is (file and line, or the dependency's name); it passes with none.<br>• **M-R2's public interface** (made precise in 1.17) is read from syntax, with no type checker, from the TypeScript sources (`.ts .tsx .mts .cts`, not `.d.ts`, not tests) among M-R3's paths (REQ-SCO-07). Each exported declaration is one entry, `<file>: <signature>`: the declaration without bodies, initializers or comments, as the compiler's printer writes it, its whitespace collapsed. A class keeps its members that are not private, and a private parameter property is a plain parameter; a namespace keeps its exported members, and an ambient (`declare`) one all of them unless it declares its exports (`export {}`, `export =`); a value that is a function or class literal — behind parentheses or `satisfies`, or as a default export — keeps its parameters and types, and one asserted `as T` (behind `satisfies` too) has the type T; each overload, re-export and default export is an entry, and an overload's implementation — of a function, a method or a constructor, a static member told apart from an instance one — is hidden from callers and is none. A file that does not parse is the entry `<file>: (does not parse)`. | F4.8, F4.5 |
| REQ-SCO-06 | **Format-neutral content checks** (S2 duplicate, S3 D3 revision, and later M-E3). A check is a YAML file of the oracle, named `<id>.yaml`, lying in no suite, with its `kind` and the `steps` it is scored at (changed in 1.12):<br>• `content`: groups of case-insensitive substrings, whitespace folded; it passes at a step when every group matches in one place, the lines the step added to one git-tracked text file or one of the step's commit messages (REQ-RUN-05). The validator refuses one that its step's prompt satisfies;<br>• `unchanged`: regions of seed files, as 1-based line ranges; it passes at a step when each region's seed lines still stand, one after the other, in the same file;<br>• `dependencies` and `ast`: the directive checks of REQ-SCO-05 (added in 1.13).<br>A check never checks paths or file formats of a specific harness, and reads text only: it runs in the scorer's process, not in a scoring container (REQ-SCO-01 isolates running a snapshot's code). `score.json` records each check per step: passed, with where a content check matched, failed, or not reached. | F4.7, F4.8 |
| REQ-SCO-07 | Determinism metrics (M-R1–M-R3) are computed only for groups with n ≥ 2 runs sharing all pins. Otherwise the result is `n = 1` and no value. Made precise in 1.17:<br>• **the runs compared** are a group's runs that reached their final snapshot; the others are listed and left out of every M-R. The group's `n` is the runs compared;<br>• **the pins compared** are those each run records for itself: `run.json`'s scenario hash and harness commit, and `score.json`'s `scorer`; every other pin is the campaign execution's. When one differs, there is no value and the pins that differ are named;<br>• **M-R1** is the public hidden tests of the final snapshot's census whose verdict is the same in every run compared, as agreeing and total; hold-out tests do not enter it (REQ-SCO-09);<br>• **M-R2 and M-R3** are, for each pair of runs compared in run order, the Jaccard similarity of their interface entries (REQ-SCO-05) or paths, as intersection and union, and the mean of the pairs' ratios to 4 decimals. Two empty sets are alike. **M-R3's paths** are every file of the final snapshot less every path the setup's stored patch touches, and less the generated paths: anything under `node_modules/`, `dist/`, `build/` or `coverage/`, `*.tsbuildinfo`, and `package-lock.json`, `npm-shrinkwrap.json`, `yarn.lock`, `pnpm-lock.yaml`. `score.json` records each run's paths and interface entries, sorted;<br>• no threshold of equivalence is applied (experiment design §4.5). | F4.5 |
| REQ-SCO-08 | Break-even follows experiment design §4.2, with the "not applicable" and "never" cases (made precise in 1.15). `score.json`'s `cost.setup` records M-K3 from `run.json`: the setup's usage, cost and wall time, and the manual's tokens (REQ-RUN-12), apart from the steps' `cost.run`; or that it was not recorded. `aggregate.json`'s `break_even` pairs each arm other than the baseline with the baseline of the same scenario version and model, slices included, when both exist and the arm's setup cost was recorded:<br>• **not applicable** when the arm's final M-Q1 is lower, as the mean over its runs of each final pass rate, a final not reached counting as 0;<br>• otherwise **never** when its mean step cost (the mean over every reached step of every run, a killed step at its bound) is not lower;<br>• otherwise the arm's mean setup cost ÷ the difference in mean step cost.<br>An arm marked an expected failure is computed from what it measured. In v0.1 no setup runs an agent (adr-003 decision 11), so a number is 0: the arm is cheaper per step and has nothing to pay back. | F4.4 |
| REQ-SCO-09 | Hold-out results are stored separately from public results in `score.json`. | F3.5 |
| REQ-SCO-10 | **Expected failures:** a run **of an arm with a harness** (`requires`) is marked `expected failure` when the scenario's `capabilities` are not all provided by the arm (REQ-FMT-10); baseline arms are the reference and are never marked (1.9). The missing capabilities are named. The run is still executed and scored, and it counts as a loss in aggregation. | F3.6 |
| REQ-SCO-12 | **Continuity metrics and regressions from the seed** (experiment design §4.1, §4.3; added in 1.14). `score.json` records:<br>• `seed`: the public suites on the seed, with the seed's own verdicts;<br>• **M-F1**, for each decision of `oracle.decisions`, on the final snapshot: `respected` when all its public tests pass; `revised` when they pass and its `revised_by` check passed at that check's last step; otherwise `failed`, a revision nothing records included. M-F1 is the share respected or revised. A declared decision with no public test is an oracle error. Absent for a scenario with no decision;<br>• **M-F2**: each step after the first, with its API-equivalent cost in euro and its M-Q1;<br>• **M-D3**: the public hidden tests that passed on the seed and fail on the final snapshot.<br>M-F1 and M-D3 are "not reached" when the final snapshot is. In aggregation, such a run is a loss: no decision consistent, and every test that passed on the seed regressed. | F4.7, F4.1 |

## 6. Results and site (REQ-RES)

| ID | Requirement | Serves |
|---|---|---|
| REQ-RES-01 | Dry runs are stored under `results/dry-runs/`, and are never read by aggregation. | F3.3, F5.1 |
| REQ-RES-02 | The site is static HTML and CSS generated from `aggregate.json`, with no client framework. There is one landing page, one page per category, one method page, and permanent URLs per campaign execution (`/<campaign-id>/<n>/`). Made precise in 1.20:<br>• an execution's pages are `index.html` (the landing page), `category-<a…g>.html` and `method.html`; `site/index.html` leads to the execution built last with a `meta` refresh and a link; one `style.css`. No page holds a script or a date, and every value is escaped;<br>• the site reads only `aggregate.json`, each run's `run.json` (its scenario hash) and each scenario's `scenario.yaml` (its categories): never an oracle file, the hold-out or a transcript. A hold-out is published as counts only;<br>• a category page holds the category's goal, each of its scenarios with each metric per arm, each suite's final tally, the hold-out, the runs with their `bench run show` command and their losses; the scenarios that have it as a secondary category; the slices, apart; or that it is not covered, and the release that plans it. Made precise in 1.21 (the method page):<br>• `method.html` is `site-content/method.md`, versioned in this repository and rendered by the site's own Markdown subset (headings, paragraphs, lists, tables, inline code, emphasis, links to a relative page or `https`; every text escaped). Each statement carries an anchor, and a test pins every anchor to its source (a requirement, an ADR, a decision-log, a task's design or a wave's "Due before" line);<br>• its section "This execution" is generated from the execution's files: the agent and its version, the model and the slices', each harness with its version and the commits its runs recorded, each arm's declared capabilities as its runs recorded them, the approver policy, the scenarios with their hashes, the scorer image(s) the scores record, each arm's manual with its SHA-256 and tokens (and how many runs recorded none); the caps, the budget and the rate from `campaign.yaml`; the spending: the aggregated runs of the campaign's model and their M-K1 in all, the slices' apart, that setup costs (M-K3) are not included, and the runs whose cost is a bound;<br>• the published material is pages under `material/`: `manual-<arm>.html` for each arm of the execution, `directives-<scenario>.html` from a scenario's `arms/<arm>/.wingfoil/directives/custom/*.md`, `notice-<scenario>.html` and `licence-<name>.html` from its `oracle/licenses/`. Nothing else of a scenario's oracle is read. With 1.20's list, the site therefore reads `aggregate.json`, each run's `run.json` and `score.json`, each scenario's `scenario.yaml`, the execution's `campaign.yaml`, `site-content/method.md`, `arms/<arm>/manual.md`, and these files of a scenario: never the hold-out, never a transcript;<br>• a link of the text to a material page the execution does not publish is left as its label; a link is kept only to a relative page or an `https` address, never `/…` nor `//host`; the converter resolves each link as it renders it, a material link with its anchor and a `./` prefix set aside, an empty page name counting as one not written;<br>• `build` also refuses an execution whose `campaign.yaml` is not a campaign file, a missing `site-content/method.md`, and an arm's `manual.md` whose SHA-256 differs from the one its runs recorded. | F5.5, F5.8 |
| REQ-RES-03 | The landing page renders:<br>• "harness, not model", with the model name;<br>• the headline and one chart;<br>• one row per category A–G, where uncovered categories are listed as "not covered";<br>• the `preliminary` badge and `n` on every value;<br>• markers for hold-out results.<br>Losses and wins use the same visual weight. Made precise in 1.20:<br>• **the category map:** C: M-Q1 on the final snapshot and M-K1 (EUR); D: M-Q1 on the final snapshot and M-D3; E: M-E1, each run's violations summed over the steps of its directive checks (`ast` and `dependencies`). A run that did not reach a step a directive check scores makes M-E1 **not comparable** for its arm ("not comparable: r2 did not reach step 3"), and so does a run that some directive check's steps do not list ("… was not scored with the directive checks"): no outcome, no headline count, and "no comparison: the baseline is not comparable" beside each arm when it is the baseline's; F: M-F1's share. M-D1 and M-D2 are not reported apart in v0.1: S2's defect tests are counted in M-Q1, and each suite's tally is on D's page. A category is covered when a scenario of the execution has it as its primary category;<br>• **a comparison:** each arm but the baseline, against the baseline of the same scenario version and model, metric by metric. A value is the mean of its runs' figures. It is *better* or *worse* when the means differ, by the metric's direction (M-Q1 and M-F1 higher, M-K1, M-D3 and M-E1 lower), and *the same* when they are equal. It is *beyond variance* only when both sides have n ≥ 3 and their ranges do not overlap, *preliminary* when either side has n = 1, and *within variance* otherwise. A metric a side lacks reads "not measured" and is no comparison. A comparison that is preliminary while the value itself has n > 1 (the baseline's single run) says so beside its outcome;<br>• **the headline:** one sentence per arm, generated from its comparisons alone: "Against the baseline, *arm* is better in *b*, worse in *w* and the same in *s* of *n* comparisons across categories …", with "(preliminary: n = 1 in …)" for the categories where a side is a single run; then the categories not covered. A difference at n = 1 counts, marked preliminary;<br>• **the chart:** one inline SVG of M-Q1 on the final snapshot, read from every covered category's scenario whatever its map reads (E and F included), a bar per arm with its value, its `n` and, from n = 2, its range as a whisker; the arms told apart by label and hatching as well as colour;<br>• **one markup for every outcome:** the same element and class, a word and a symbol (▲ better, ▼ worse, = same), and no style that depends on the outcome. Each value carries its `n`, `preliminary` at n = 1 and its range from n = 3; hold-out counts are marked `hold-out`, with their `n`, or "not scored"; the landing page counts the campaign model's runs, and the slices' apart; a delta that rounds to nothing keeps two significant digits, in fixed notation; a loss is named with its reason, an expected failure with the missing capability;<br>• arms in the order baseline, then by name; categories A–G; the same aggregate gives the same bytes (REQ-NFR-05). | F5.5 |
| REQ-RES-04 | `bench site publish` pushes `site/` to the `gh-pages` branch. It refuses while the repository is private: the repository becomes public at the first published result (brief decision). Made precise in 1.22:<br>• `bench site publish [--remote <name>]` (`origin` by default) first copies `site/` aside, so that what is checked is what is pushed, and checks the copy: `index.html`, `style.css` and at least one `<campaign-id>/<n>/`, each execution rebuilt from the results into a temporary directory. The copy's files must be exactly the union of the builds' (each execution's pages, the stylesheet, the root page of the execution it leads to), byte for byte. A difference, a link, or any entry no build gives (`.git`, `.gitignore`, a stray page) is refused, naming it and the `bench site build` to run;<br>• visibility is read by an anonymous `git ls-remote --heads` of the remote's GitHub https address, run in an empty directory that is also its home, with no configuration of the system, the user, the repository or the environment (`GIT_CONFIG_PARAMETERS`, `GIT_CONFIG_COUNT` and its keys), no credential helper, no netrc, no prompt and an askpass that answers nothing: it succeeds only for a public repository. A remote that is not on GitHub, a private repository and any failure are refusals;<br>• the push is made from a temporary clone: the remote's `gh-pages` fetched if it exists, its whole tree replaced by `site/`, one commit `site: publish <id>/<n>[, …]` naming the root page's execution, with the repository's own `user.name` and `user.email`, pushed without force; every publishing git command runs with no ignore file, no attributes file (so no filter, `ident` or line-ending rule), no line-ending conversion, no hooks and no file-system monitor, and the clone is made with no template, whatever the maintainer's configuration. The same site already published is said, and nothing is pushed. The repository's working tree, index and branches are never touched. | F5.6 |
| REQ-RES-06 | **What is committed** (requirements decision 3): `run.json`, `score.json`, `usage.json`, `diff.patch`, `commits.json` (added in 1.12) and `aggregate.json` are committed. Transcripts (`transcript.jsonl`) are git-ignored, compressed per campaign execution, and attached to a GitHub release named `<campaign-id>-<n>`. `run.json` records the release asset that holds each transcript. Made precise in 1.22: the asset is `releases/<campaign-id>-<n>/transcripts.tar.gz` (`/releases/` git-ignored), made with GNU tar's reproducible flags (sorted names, mtime 0, owner and group 0, fixed modes, `gzip -n`), its paths relative to the execution, so the same transcripts give the same bytes with the same GNU tar and gzip. The transcripts are copied aside first, and the copies are what is checked and packed. The archive is written under another name and renamed into place last, once the records are written. Before it is written, every run record is read, and one that cannot be read refuses the pack, which then changes nothing; every transcript is checked for the agent token's value (`BENCH_AGENT_TOKEN_FILE`, when set) and for the shape of an Anthropic key (`sk-ant-`); a match refuses the pack, naming the file and line, never the value. Each run whose transcripts it holds records `transcripts: { release, asset, sha256 }` in its `run.json`; a run of the execution whose transcripts are gone loses its record of the release. `bench run show` names the release and the asset when a transcript is not on disk. | F5.1, F5.3 |
| REQ-RES-05 | A finding note is Markdown with fixed sections: campaign, WingFoil commit, scenario@version, runs, metric values, links. It is written only into this repository. Made precise in 1.19:<br>• the sections come in that order, the arms sorted throughout, so that the same finding gives the same bytes whatever the order they were asked in. The WingFoil commit is each distinct `harness.commit` of the runs whose harness is WingFoil, with its runs, or "none". The runs are per arm, with `n` and the losses. The values are per arm, each run's figure with the range. The links are `bench run show` for each run, `bench run compare` for each pair of arms, and the aggregate's path;<br>• a value the aggregate lacks is stated ("not measured for this scenario", "n = 1: no value", "not scored", "setup not recorded for this arm"), and so are a final not reached and the hold-out's unscored runs; nothing is invented;<br>• a last section **For WingFoil** is shaped as the `bug` or `decision-log` template of the pinned WingFoil commit (`3df305e`), in fenced blocks ready to paste into the element `wingfoil memory add --type … --title "…"` creates: the front-matter fields it lacks, then the body with the template's sections in order (a bug's Triage & Execution Notes included) and each arm under a heading of its own. The facts are filled in (values, campaign, commit, the runs' links, and a reproduction that runs: the execution's `campaign.yaml` copied back into `campaigns/`, whose id is its content's, then `bench campaign run … --allow-spending`, `bench score` and `bench finding` on the new execution), and the judgement is left to the maintainer as `<!-- to fill: … -->`;<br>• there is no date: the same inputs give the same bytes. | F5.4 |

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

### Amendment 1.9 (delivery, W6 task-030, 2026-09-28)

- **REQ-FMT-10:** `provides` is a map of capability to boolean, as its own example (`workflow-engine:
  false`) writes it, not a list: a `false` states a known gap of the harness. An undeclared capability is
  not provided.
- **REQ-FMT-05:** the arm definition's fields include `provides`.
- **REQ-SCO-10:** only a run of an arm with a harness is checked. Read literally, the requirement marked
  every baseline run of a scenario that needs any capability — S8's directive delivery, for one — although
  F3.6 is about "the harness version under test" and its acceptance about the wingfoil arm. The baseline
  arms are the reference a harness is compared with, and are never marked.

The traceability matrix is unaffected: all three still serve F3.6 (and REQ-FMT-05 F2.5, F2.7).

Source: [task-030](../memory/task/task-030-expected-failures.md), review decision of the approver at that
task's review, 2026-09-28 (`96d7d1f`).

### Amendment 1.10 (delivery, W7 task-031, 2026-09-28)

- **REQ-FMT-04:** "third-party pins with licenses" becomes `third_party[]` as `{name, url, commit | sha256,
  license, files[]}`, as dl-002 decided. The pin is exactly one of a 40-character git `commit` or the
  `sha256` of the one file it vendors, for material that has no commit (S1's RFC examples). `files` names
  what the entry vendors, each file inside a declared suite and vendored by no other entry. A `sha256` is
  checked every time the scenario is loaded; a `commit` is not checked against its source, which would
  need the network, and the version's hash covers its files (REQ-FMT-09). A license outside the SPDX list
  is written as an SPDX `LicenseRef-`.

The traceability matrix is unaffected: REQ-FMT-04 still serves F3.1.

Source: [task-031](../memory/task/task-031-third-party-oracle-material-pinned-by-commit-or-sha256.md),
review decision of the approver at that task's review, 2026-09-29 (`312c4c1`).

### Amendment 1.11 (delivery, W7 task-034, 2026-09-29)

- **REQ-CLI-06:** `bench score <campaign-id>/<n>` writes the execution's `aggregate.json` once every run
  of it is scored. It writes none, and removes a stale one, when a run could not be scored, since an
  aggregate with runs missing from it would break REQ-FMT-07. It never aggregates a dry run (REQ-RES-01).
  No command is added: REQ-FMT-06 already puts the file beside the runs, and the aggregation reads only
  committed files, so it can be recomputed from a checkout.

REQ-CLI-06's feature column gains F5.1. The traceability matrix (1.0) is left as it is: F5.1's row already names
REQ-FMT-06 and REQ-FMT-07, which the aggregate implements.

Source: [task-034](../memory/task/task-034-results-store-and-aggregation.md), review decision of the
approver at that task's review, 2026-09-29 (`45a5e31`).

### Amendment 1.12 (delivery, W8 task-035, 2026-09-29)

- **REQ-SCO-06:** the check file. A YAML file per check, named by its id, with a `kind` and its `steps`.
  - **`content`** checks keep what 1.0 said: case-insensitive patterns over the step's changed text files
    and its commit messages. Three things are now stated:
    - the patterns are plain substrings, in groups that must all match in the same file or message;
    - "changed" means the lines the step added;
    - a check that the step's prompt satisfies is refused.
  - **`unchanged`** checks are added: seed regions that must still stand at a step. This is S2.md §6's
    "the related code was not changed", which a pattern cannot express.
  - Checks read text and run no code, so they run outside the scoring container.
- **REQ-RUN-05, REQ-FMT-06, REQ-RES-06:** each step stores and commits `commits.json`, the messages of the
  commits made during it. REQ-SCO-06 reads commit messages, and the patch, a diff between trees
  (bug-007), keeps none.
- **REQ-FMT-04:** `oracle.checks` lists the check files.
- **REQ-FMT-08:** check files leave the oracle-literal scan. Their patterns are the prompts' own words,
  e.g. S3's "whole days", so the literal rule would refuse every useful check. The leak that matters
  for a check, an agent passing it by copying its prompt, is refused by REQ-SCO-06 instead.

The traceability matrix (1.0) is unaffected: REQ-SCO-06 already traces to F4.7 and F4.8, REQ-RUN-05 to
F2.2.

Source: [task-035](../memory/task/task-035-check-format-and-content-checks.md), design confirmed by the
approver on 2026-09-29; review decision of the approver at that task's review, 2026-09-29 (`a1feaf4`).

### Amendment 1.13 (delivery, W8 task-037, 2026-09-29)

- **REQ-SCO-05:** M-E1's directives are check files of two kinds.
  - `dependencies` counts the runtime dependency names added since the seed.
  - `ast` counts four syntactic rules in the TypeScript files under a directory of the snapshot, test
    and declaration files left out, with the TypeScript the scoring image pins.
  - Violations are recorded per step with their place, and a check passes with none.
  - The catalogue's words follow S8.md §4's rules. `randomness` includes Node's `crypto` random
    functions, because R3 says "no randomness" and `crypto.randomUUID()` is step 1's easiest path around
    `Math.random()`. That was the approver's choice at design, 2026-09-29.
- **REQ-SCO-06:** its kinds list points to REQ-SCO-05 for the two directive kinds.

The traceability matrix (1.0) is unaffected: REQ-SCO-05 already traces to F4.8.

Source: [task-037](../memory/task/task-037-directive-checks-and-tool-neutral-governance-metrics.md), design
confirmed by the approver on 2026-09-29; review decision of the approver at that task's review, 2026-09-29 (`926cc3b`).

### Amendment 1.14 (delivery, W9 task-039, 2026-09-29)

- **REQ-FMT-04:** `oracle.decisions` lists the decisions M-F1 checks.
  - A decision's tests are found by the name the scenario already gives them, `<id>: …`, as S3's do.
  - `revised_by` names the content check that records its revision, when the scenario revises it.
  - A check's file name was not made part of the format: it is an explicit field instead.
- **REQ-SCO-12 (new):** the continuity metrics (F4.7) and the full M-D3 (W7's carry-over).
  - M-F1: a decision the scenario revises by construction counts as consistent only when the
    revision is recorded. An agent that ignores the change keeps the decision's tests green, and loses
    on that step's own tests and on the decision. This was the approver's choice at design, 2026-09-29.
  - M-F2 reads what `score.json` already holds.
  - M-D3 reads the seed's verdicts. Scoring already computed them for the census, then dropped them.
  - Hold-out tests stay counts only (REQ-SCO-09) and enter neither metric.
  - REQ-SCO-11 is not reused: it was retired in 1.1.
- The score and aggregate versions stay 1. Every metric is a new key.

The traceability matrix is amended in 1.1: REQ-SCO-12 joins Q-D3, Q-F1, Q-F2, F4.1 and F4.7.

Source: [task-039](../memory/task/task-039-continuity-metrics-and-regressions-from-the-seed.md), design
confirmed by the approver on 2026-09-29; review decision of the approver at that task's review, 2026-09-29 (`f11113a`).

### Amendment 1.15 (delivery, W9 task-040, 2026-09-29)

- **REQ-SCO-08:** M-K3 and M-K4 made precise.
  - M-K3 is read from what the runner already records, never assumed.
  - M-K4's quality is the final M-Q1, and its cost is the mean over reached steps.
  - Every arm other than the baseline is paired with it, baseline-docs included, within one model.
  - An expected failure is computed from what it measured, as task-034 counts a loss.
  - A break-even of 0 is the v0.1 case: §4.2 is followed literally. W9 decision 2 was the approver's
    choice at planning, 2026-09-29. The other choices were confirmed at design.
- **REQ-FMT-07:** a value of two groups carries both groups' runs.

The traceability matrix is unaffected: REQ-SCO-08 already traces to F4.4 and G-X1.

Source: [task-040](../memory/task/task-040-setup-cost-and-break-even.md), design confirmed by the
approver on 2026-09-29; review decision of the approver at that task's review, 2026-09-29 (`44389e9`).

### Amendment 1.16 (delivery, W9 task-041, 2026-09-29)

- **REQ-SCO-04:** M-Q2 made precise.
  - Which files count: "the files changed by the run" (experiment design §4.1) are the source files
    the final snapshot adds or changes from the seed. Whatever the setup touched is left out, which
    keeps the measure tool-neutral with no list of any harness's paths.
  - The ESLint configuration is two published rule sets, and complexity is read per function.
  - Coverage comes from the project's own `npm test` under c8, whether its tests pass or fail.
  - Indicators are stored as integer pairs, and there is no composite.

  These were the approver's choices at design, 2026-09-29. Coverage from `npm test` follows W9
  decision 3.

The traceability matrix is unaffected: REQ-SCO-04 already traces to F4.2 and Q-C1.

Source: [task-041](../memory/task/task-041-static-quality-metrics.md), design confirmed by the
approver on 2026-09-29; review decision of the approver at that task's review, 2026-09-29 (`11d69f4`).

### Amendment 1.17 (delivery, W10 task-042, 2026-09-29)

- **REQ-SCO-05:** M-R2's public interface made precise: the files read, what one entry is, and a file
  that does not parse. The independent review of task-042 added private parameter properties,
  namespaces, overload implementations and function or class values behind an expression. It is read from syntax, like the directive checks, so a snapshot that does not
  compile still has an interface.
- **REQ-SCO-07:** the runs compared, the pins compared, M-R1 on public tests only, M-R2 and M-R3 as
  pairs and a mean, and M-R3's paths.

  These were the approver's choices at design, 2026-09-29:
  - an entry names its file;
  - M-R2 and M-R3 read the whole final snapshot, not only the files the run changed;
  - a repetition whose final is not reached is left out and listed.

The traceability matrix is unaffected: REQ-SCO-05 and REQ-SCO-07 already trace to F4.5.

Source: [task-042](../memory/task/task-042-determinism-metrics-across-repetitions.md), design
confirmed by the approver on 2026-09-29; review decision of the approver at that task's review,
2026-09-30 (`e04310a`), after three independent reviews.

### Amendment 1.18 (delivery, W10 task-043, 2026-09-30)

- **REQ-CLI-08:** the `<run>` forms, `--full`, what each command prints, the refusals, and that both
  only read. These were the approver's choices at design, 2026-09-30:
  - the transcript is condensed by default;
  - a run is named by its directory or by its aggregate name;
  - `compare` takes any two runs of one scenario version.

  The independent review of task-043 added the scenario's steps for an unscored run, cost bounds, the
  totals of tokens, turns and time, telling runs apart, errors in a transcript, and an unreadable score.

The traceability matrix is unaffected: REQ-CLI-08 already traces to F5.3.

Source: [task-043](../memory/task/task-043-run-detail-and-side-by-side-comparison.md), design
confirmed by the approver on 2026-09-30; review decision of the approver at that task's review,
2026-09-30 (`8d431a0`), after two independent reviews.

### Amendment 1.19 (delivery, W10 task-044, 2026-09-30)

- **REQ-CLI-07:** the form with `--as`, the execution and model read, the metric catalogue, the id,
  and that a note is never overwritten.
- **REQ-RES-05:** the sections in order, what a missing value reads, the WingFoil section by the
  pinned template, and no date.

  These were the approver's choices at design, 2026-09-30:
  - `--as` is required;
  - the id comes from the inputs and an existing note is refused;
  - there is no date in the note.

  The independent review of task-044 added: an unreadable run refused, a final not reached stated,
  the arms sorted in the id, a dry run refused, the template's Triage section, and the title left to
  `memory add`. Its second review added a reproduction that runs, the arms sorted in the whole note,
  and a decision-log's facts under a heading of their own.

The traceability matrix is unaffected: REQ-CLI-07 and REQ-RES-05 already trace to F5.4.

Source: [task-044](../memory/task/task-044-finding-note-export.md), design confirmed by the approver on
2026-09-30; review decision of the approver at that task's review, 2026-09-30 (`586e042`), after two
independent reviews.

### Amendment 1.20 (delivery, W11 task-045, 2026-10-01)

- **REQ-CLI-09:** what `bench site build` writes and leaves, what it prints, and what it refuses.
- **REQ-RES-02:** the pages and their paths, the root page, no script and no date, what the site reads
  and never reads, and what a category page holds.
- **REQ-RES-03:** the category map, a comparison and its outcome and certainty, the headline's grammar,
  the chart, and one markup for every outcome.

  These were W11's plan-phase decisions, 2026-09-30 (the headline and the rows generated by fixed rules),
  and the approver's choices at design, 2026-10-01:
  - D's row is M-Q1 on S2's final snapshot and M-D3; M-D1 and M-D2 are not named metrics in v0.1;
  - a difference at n = 1 counts as better or worse in the headline, marked preliminary;
  - the chart is M-Q1 per arm for each covered category's scenario.

  The independent review of task-045 added: the chart's M-Q1 for E and F, an aggregate of another shape
  or version refused, a preliminary comparison marked when the arm has n > 1, the hold-out's n, the
  slices' runs counted apart, a delta's digits, and — the approver's choice of 2026-10-01 — M-E1 not
  comparable when a run did not reach a directive check's step. Its second review added a group's
  paths checked before they are read, a run no directive check step lists not comparable either, and a
  delta's digits for counts and in fixed notation. Its third review added aggregates written before
  task-035 read, a run each directive check must list, and each figure's kind checked.

The traceability matrix is unaffected: REQ-CLI-09, REQ-RES-02 and REQ-RES-03 already trace to F5.5.

Source: [task-045](../memory/task/task-045-site-build-and-landing-page.md), design confirmed by the approver on
2026-10-01; review decision of the approver at that task's review, 2026-10-01 (`433828f`), after three
independent reviews.

### Amendment 1.21 (delivery, W11 task-046, 2026-10-01)

- **REQ-RES-02:** the method page's text and its anchors, the generated section "This execution", the
  published material under `material/`, and three more refusals of `build`.

  These were the approver's choices at design, 2026-10-01:
  - the prose lives in `site-content/method.md`, rendered by a small converter of the site's own, which also
    renders the manuals, the directives and the notice;
  - the material gets pages of its own under `material/`;
  - a test pins the list of anchors and their sources.

  Its independent review added: links only to the material written, a protocol-relative link refused, the
  harness commits per arm, the spending with the slices apart and setup costs said to be left out, and the
  list of what the site reads made whole. Its second review added the material links matched as the
  converter reads them, a root-absolute link refused, and a table cell split as the inline renderer reads
  code.
  Its third review moved that resolution into the converter, so that one parser decides what is a link.

The traceability matrix is unaffected: REQ-RES-02 already traces to F5.8.

Source: [task-046](../memory/task/task-046-method-page.md), design confirmed by the approver on 2026-10-01;
review decision of the approver at that task's review, 2026-10-01 (`469ceb5`), after three independent reviews.

### Amendment 1.22 (delivery, W11 task-047, 2026-10-01)

- **REQ-CLI-11 (new):** `bench transcripts pack`.
- **REQ-RES-04:** `bench site publish`'s checks, its visibility probe and its push.
- **REQ-RES-06:** the transcripts' archive, its secret check, its record in `run.json`, and `run show`.

  These were the approver's choices at design, 2026-10-01:
  - `publish` rebuilds every execution under `site/` and refuses any difference;
  - `gh-pages` keeps its history: a commit on top of the remote branch, never a force push;
  - visibility is read by an anonymous `git ls-remote` over https, with no token.

  Its independent review added: the probe given no configuration at all, `site/` copied before it is
  checked and its whole file set compared, links and stray entries refused, fixed settings for every
  publishing git command, and a pack that reads every record first, writes its archive whole, and drops a
  stale record. Its second review added no attributes file, monitor or init template for publishing's
  git, a link refused whatever its name, and transcripts checked and packed from the same copies.

The traceability matrix (1.2) gains REQ-CLI-11 and REQ-RES-06 for F5.6: the transcripts become release assets there.

Source: [task-047](../memory/task/task-047-manual-publish-and-transcript-assets.md), design confirmed by the
approver on 2026-10-01.

