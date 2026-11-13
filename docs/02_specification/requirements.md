# Requirements (v0.1, v0.2, v0.3)

**Version:** 1.58
**Date:** 2026-11-13
**Status:** Approved
**Traces to:** [acceptance/](acceptance/) (the v0.1 and v0.2 features), [scenarios/](scenarios/) (K1–K5), [09_experiment-design.md](../01_vision/09_experiment-design.md), [07_sequencer.md](../01_vision/07_sequencer.md) v0.1; v0.2: [rel-v0-2](../memory/release/rel-v0-2.md)

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
| REQ-ARC-03 | Repository layout: `scenarios/<id>/<version>/`, `arms/<arm>/`, `campaigns/<name>.yaml`, `results/`, `site/`. The hold-out repository mirrors `scenarios/<id>/<version>/` for its additions, each under the id of the suite it adds to (1.7, dl-001). A scenario version may hold `arms/<arm>/` too (REQ-FMT-04): configuration for one arm, which is not the repository's `arms/<arm>/` definition (added in 1.6).<br>**Amended in 1.50 (v0.3, W18, task-138, F7.5):** the configured variants are arms of the repository, `arms/<harness>-configured/`, and their docs controls `arms/<docs control>-configured/` (REQ-FMT-05); a scenario version's `arms/<harness>-configured/` holds that version's configuration for the harness, and `configured/` the records of the sessions that wrote it (REQ-RUN-20). The configuring agent's prompt and profile are `configuring/prompt.md` and `configuring/profile.yaml`, and its transcripts `results/configuring/<id>@<version>/<harness>/<n>/`. | F3.1, F3.5, F7.5 |
| REQ-ARC-04 | Every external process (Docker, git, Claude Code, linters) is called through a small port interface, so that acceptance tests replace it with a fake (acceptance decision 1).<br>**Amended in 1.35 (v0.3, task-102, dl-024):** the port gains an optional `endRun()`, which the runner calls once at the end of each run; an adapter that keeps per-run state (Codex's thread map) forgets it there. | acceptance README |
| REQ-ARC-05 | The package's own `.wingfoil/dna.yaml` lists the modules of REQ-ARC-01 once they exist (W1). | traceability |

## 2. Data formats (REQ-FMT)

All human-authored files are YAML, validated by Zod schemas in `core`. All machine output is JSON.

| ID | Requirement | Serves |
|---|---|---|
| REQ-FMT-01 | **Campaign file** (`campaigns/<name>.yaml`), which lives in `campaigns/`, beside `scenarios/` and `results/`. It holds:<br>• `harnesses`: arm → `{tool, version, commit?}`, one entry per arm **except** `baseline` and `baseline-docs`, which run the plain agent and must have none (added in 1.2; until W3 this list is fixed, then it follows each arm's `requires`, REQ-FMT-05)<br>• `scenarios`: `[{id, version}]`<br>• `arms`<br>• `agent: {name, version}`<br>• `models`: `{default, slices?}`, where each slice is `{model, scenarios, arms, repetitions}` for the Opus comparison (shape fixed in 1.2)<br>• `repetitions`: per scenario<br>• `approver_policy`: a version<br>• `caps: {step_time_s, step_tokens, run_cost_eur}`<br>• `budget: {warn_eur, ceiling_eur}`<br>• `currency: {usd_to_eur}`<br>A campaign must include the **baseline** arm (added in 1.1, threat T7). The scenario seed is not a campaign field: `scenario@version` pins it (1.2).<br>**Amended in 1.26 (v0.2):** `harnesses` has one entry per **harness arm** (wingfoil, speckit, openspec); `baseline` and the docs controls (`baseline-docs`, `speckit-docs`, `openspec-docs`) have none. New fields:<br>• `arm_digests`: arm → its digest (REQ-FMT-13), required for every arm of a v0.2 campaign. `validate` recomputes each and refuses a mismatch, naming the arm. Since the campaign file holds them, a changed arm changes the campaign's identity (REQ-FMT-02). A campaign file without them, v0.1's, reads as before;<br>• dl-007's **bridge** (v0.1's configuration re-run on the new default model) is **a campaign of its own**, with its own file, `harnesses` and `arm_digests`, so that its runs never share a path or a group with the main campaign's; REQ-SCO-13 compares it as any campaign. Calibration's budget and the approver's spending consent cover the main campaign and the bridge together;<br>• `fail_fast: {same_error: <k>}`, optional (REQ-RUN-19).<br>Every harness arm's tool must be admitted in the eligibility register at the pinned version (REQ-FMT-11), or `validate` refuses it, naming the tool and the criterion.<br>**Amended in 1.32 (v0.2, task-094, outside the v0.2 campaign):** `agent.name` adds `codex` (OpenAI's Codex CLI). `agent.effort`'s levels are the named agent's: Claude Code's as in 1.27; Codex's `minimal`, `low`, `medium`, `high`, `xhigh`, `max` and `ultra` (Codex 0.162.1's reasoning efforts, less `persistent` and custom values); `none` for no setting, for either.<br>**Amended in 1.33 (v0.2, task-095):** `validate` and `run` name each arm read from history and its commit; a pinned digest no commit holds is still refused.<br>**Amended in 1.34 (v0.3, dl-022, task-101):** a campaign file may declare `extends: presets/<name>.yaml`, naming one **preset**: a partial campaign file in `campaigns/presets/` with a required one-line `description:` saying what it measures. The loader merges the preset under the file (maps merged by key, lists replaced whole, the file's keys winning), drops `extends:` and the preset's `description:`, and validates the **resolved campaign** as any campaign file. A preset that itself declares `extends:` (no chains), has no `description:`, is missing, or is named by a path leaving `campaigns/presets/` is refused, naming it. A file cannot remove a key its preset sets (maps merge by key): a narrower campaign extends a preset that leaves those fields out, and a refused resolved campaign says so. A preset is a regular file directly in `campaigns/presets/`, not a symbolic link. A file without `extends:` resolves to itself. Each execution keeps the resolved campaign as its `campaign.yaml` (REQ-FMT-06): a file without `extends:` copied byte for byte, as before, a file with it written resolved.<br>**Amended in 1.50 (v0.3, W18, task-138, F7.5):** a campaign that runs a configured arm (REQ-FMT-05 as amended in 1.50) pins it in `arm_digests` as any arm, and its harness under its base arm's `harnesses` entry, which it shares; the configured arm has none of its own. `validate` refuses, naming the scenario, the arm and the field: a configured arm or its docs control on a scenario version that holds no configuration for it (REQ-FMT-04 as amended in 1.50); a configuration whose record's harness pin (tool, version) differs from the campaign's for its base arm, or whose record's base-arm digest differs from the digest of the base arm's files that the configured arm's pinned digest resolves (REQ-FMT-13 as amended in 1.50), whether or not the campaign runs the base arm; a campaign whose configurations' records (one per configuration it runs, REQ-FMT-04 as amended in 1.50) do not all carry the same prompt and profile SHA-256 (T12); and records whose prompt or profile no commit of the repository's history holds (the file hashed whole).<br>**Amended in 1.58 (v0.3, W19, task-147, F4.9):** an optional `review_loop` entry pins the review loop (REQ-RUN-21): the reviewer's `agent` (name, version), `model` and `effort`; `prompt` and `fixer_prompt` (`review/prompt.md` and `review/fixer-prompt.md`, each by its SHA-256, both naming no harness and scanned as the configuring prompt is, REQ-FMT-08); `max_rounds` (5 in v0.3); and `caps` (`session_time_s`, `session_tokens`, `session_cost_eur`, applied to each reviewer and fixer session as a step's caps are to a step, and `fixer_interventions`, the fixer's intervention cap). Absent, no run has a loop, and every earlier campaign file stays valid with its meaning unchanged. | F1.1, F1.3, T7, F7.5, F4.9 |
| REQ-FMT-02 | **Campaign identity:** SHA-256 of the campaign file canonicalized (parsed, keys sorted, re-serialized as JSON), shortened to 12 hex characters. An execution of a campaign is `<campaign-id>/<n>`, with `n` counting executions.<br>**Amended in 1.34 (v0.3, dl-022):** the identity is computed on the **resolved** campaign (REQ-FMT-01), so the same question asked with the same pins keeps one id, and a change to a preset gives every campaign extending it a new id. A file without `extends:` keeps its id. | F1.1 |
| REQ-FMT-03 | A harness `version` must be a released version (semver, optionally `v`-prefixed, with optional prerelease and build metadata) or a commit SHA of 7 to 40 hex characters. A branch name, a range or `latest` is rejected. When `version` is a SHA and `commit` is also given, `commit` is a 40-character SHA that starts with `version` (added in 1.2). | F1.1 (error path) |
| REQ-FMT-04 | **Scenario file** (`scenarios/<id>/<version>/scenario.yaml`). It holds:<br>• `id`, `version`<br>• `categories: {primary, secondary[]}`, `profiles[]`, `gqm[]`, `capabilities[]`<br>• `seed`: a directory<br>• `steps[]`: `{n, prompt_file}`<br>• `oracle`: `suites[]` as `{id, dir, after_steps[]}`, each suite of hidden tests declared once with the steps after which it is scored (changed in 1.7, dl-001); `checks[]`, the paths of its check files (REQ-SCO-06; changed in 1.12); `decisions[]` as `{id, revised_by?}`, the decisions M-F1 checks, each tested by the public hidden tests whose name starts with `<id>:`, and, when the scenario revises it, the content check that records the revision (REQ-SCO-12; added in 1.14); `third_party[]` as `{name, url, commit \| sha256, license, files[]}`, the material vendored into a suite and pinned by exactly one of the two (changed in 1.10, dl-002)<br>• `holdout`: whether additions are expected<br>Beside it, optionally, `arms/<arm>/`: the scenario's configuration for that arm, found by the arm's name with no field in the file (added in 1.6, dl-005). Neither the seed nor a prompt may contain it or lie in it.<br>**Amended in 1.43 (v0.3, W17, task-117):** a step may declare a scripted `verdict`: `kind` (`approve`, `reject` or `none`), `text` (the reply to the step's first approval request, and the reason a verdict carried out records) and an optional `later` (the reply to its later approval requests; by default `text`), every text non-empty; anything else is refused, naming the field. A campaign that runs a scenario with verdicts must pin a policy that reads them (REQ-RUN-06), or `validate` refuses it, naming the scenario.<br>**Amended in 1.44 (v0.3, W17, task-118):** a scenario may declare a separate `approver: {name, email}` (open question 1, option (b1), dl-029); then its oracle may hold the governance checks of REQ-SCO-06 as amended in 1.44, which need it.<br>**Amended in 1.50 (v0.3, W18, task-138, F7.5):** a scenario version from 1.1 on may hold `arms/<harness>-configured/`, the configuration the configuring agent wrote for that harness (REQ-RUN-20), and `configured/`, the sessions' records and the patch of the configuration's record. Both are scenario content, in the scenario's hash, so a pinned scenario version pins its configurations; a version 1.0 holds none (K7 writes the configuration per version; that 1.0 holds none is the approver's choice of 2026-11-06). A version **holds a configuration** for a harness when it has a record for it with the outcome `written`, and the directory holds exactly the files of the newest such record, each with its SHA-256; a later refused, killed, failed or interrupted session does not undo it. **The configuration's record** is that newest `written` record, which every rule reading the configuration's pins, rules or patch reads; earlier records count only in M-K3 (REQ-SCO-08 as amended in 1.50); a record of any outcome but `written` is kept, and is not a configuration. A symbolic link anywhere in `arms/<harness>-configured/` or `configured/` is refused, naming it, and so is a version 1.0 that holds either directory. Since both are in the hash, **nothing is written to them once any run under `results/`, a dry run's included, is of that `<id>@<version>`**, whatever hash it recorded: every configuration of a version is written before its first run, and a later one goes to a new version (REQ-RUN-20).<br>**Amended in 1.51 (v0.3, W18, task-139, bug-034):** a scenario version holds **no symbolic link**, anywhere under its directory, `scenario.yaml` included: loading it refuses each link first, naming it by its path relative to the version, before anything is read through it. A Markdown file of a scenario's `arms/<arm>/` that leaves a code fence open is refused, naming it (REQ-FMT-14 as amended in 1.51).<br>**Amended in 1.52 (v0.3, W18, task-140, F7.5):** made precise. A record file `configured/<harness>-configured.json` is a JSON array of records, oldest first, at least one; a record's `usage` has a step's shape (REQ-RUN-09), and its fields are REQ-RUN-20's, any other refused; each file's path is a workspace path (relative, `/`-separated, with no empty, `.` or `..` segment), listed once. A record is consistent by itself: a `written` one lists its files and reported its cost (no `cost_reported: false`), only a `written` one lists files, and a `refused` one states its reason. `configured/` is a directory holding only `<harness>-configured.json` and `<harness>-configured.patch` files; a patch needs a `written` record, and a `written` record needs both its `arms/<harness>-configured/` and its patch, and a directory under `arms/` whose name ends in `-configured` needs a `written` record. Such a directory is a configuration, not an arm's configuration (dl-005): no arm's setup receives it as its own, and the leak scan reads its lines as 1.50 states; 1.51's rule on a Markdown file that leaves a code fence open applies to it as to an arm's configuration, so a configuring session's result that would leave one is refused (REQ-RUN-20). `configured/` is among the paths a step prompt and the seed must not overlap.<br>**Amended in 1.53 (v0.3, W18, task-141, F7.5):** a record's `date` is at least the one of the record before it, since records are appended; a file whose dates go back is refused, naming the record. A record's harness `commit` is the clone's full commit, or, for a tool fetched from the npm registry, the SHA-256 of its tarball, as `run.json` records it (REQ-FMT-12). | F3.1, F7.5 |
| REQ-FMT-05 | **Arm definition** (`arms/<arm>/arm.yaml`). It holds: `name`, `setup` (script), `manual` (the operating manual file), `environment` (files copied into the workspace), `mcp` (optional config), `requires` (the harness tool), and `provides` (REQ-FMT-10; added in 1.9).<br>**Amended in 1.26 (v0.2):** a docs control declares `docs_of: <harness arm>` and no `requires`; its environment is generated (REQ-RUN-11), and an unknown `docs_of` is refused. A harness arm declares `telemetry_off`, the environment variables or settings that turn its tool's telemetry off (an empty list where the tool has none, stated so), and `provides` (REQ-FMT-10); a harness arm without `telemetry_off` is refused.<br>**Amended in 1.41 (v0.3, task-114, dl-021 step A):** a docs control may declare `docs_directives: every-role`, the directives its generator renders (REQ-RUN-11 as amended in 1.41); only a docs control of the wingfoil arm may, since only its generator reads the choice, and no other value is accepted. Being a field of `arm.yaml`, it is covered by the arm's digest (REQ-FMT-13).<br>**Amended in 1.44 (v0.3, W17, task-118):** an arm may declare `verdict_hook`, a script that carries a scripted verdict out through its tool's own approval mechanism: run as `bash <hook> <approve|reject> <name> <email> <reason>`, it prints one JSON line `{outcome, target?}`. The wingfoil arm's runs `memory approve|reject --reason` on the one element awaiting a verdict, under the approver's identity, set for that command only.<br>**Amended in 1.46 (v0.3, W17, task-120, bug-041):** the line is `{outcome, target?, detail?}`: `detail` is the tool's own reason, its last `error:` line (else its last non-blank line) cut at 500 characters, when it refused the verb or a search failed and said why; the runner records it in the verdict ledger beside the outcome (REQ-FMT-06), and the scoring reads it nowhere.<br>**Amended in 1.48 (v0.3, W17, task-123, bug-043):** a hook that fails (exits non-zero, or whose run throws) is recorded `failed (exit N)` with `detail` its stderr's last non-blank line (the error as text, for a run that throws), cut at 500 characters, whatever its stdout says.<br>**Amended in 1.50 (v0.3, W18, task-138, F7.5):** a **configured arm** declares `configured_of: <harness arm>` and only `name` besides: it runs its base arm's `setup`, `manual`, `environment`, `mcp`, `requires`, `telemetry_off`, `provides` and `verdict_hook` as the base arm's `arm.yaml` declares them, and declaring any of them is refused, as is a `configured_of` that names no harness arm or names a configured arm. Its digest covers its own files and its base arm's (REQ-FMT-13 as amended in 1.50). A **configured docs control** declares `docs_of: <configured arm>` and is otherwise a docs control (1.26); the docs control of `wingfoil-configured` declares `docs_directives` with the value `baseline-docs` declares, 1.41's rule extended to it. The names `wingfoil-configured`, `speckit-configured` and `openspec-configured` are experiment design 1.7 §2's; `baseline-docs-configured`, `speckit-docs-configured` and `openspec-docs-configured` follow them, so that a configured arm never shares a path or a group with its base arm. Wherever a rule reads a harness arm's files or pairs it with its docs control, a configured arm reads as a harness arm whose files are its base arm's, read from the commit its digest resolves: REQ-SCO-14 compares it with its configured docs control, REQ-RES-09 gives it a setup page, and the site reads its manual and setup script as its base arm's (REQ-RES-02, REQ-RES-10). It is not a harness arm where a rule names its own `harnesses` entry (REQ-FMT-01) or the configuring agent's arm (REQ-RUN-20). A harness arm that has a configured arm declares `configuration`: the workspace paths where its tool's and its agent's configuration lives, as globs relative to the workspace, read from the tool's documentation at the version `configuring/profile.yaml` pins for it, each with the documentation it is read from. They include the place REQ-FMT-14 writes the project rules in (Spec Kit's constitution, OpenSpec's project context) and, for wingfoil, the place of a scenario's directives (`.wingfoil/directives/custom/`): those are configuration, not state. It also declares `state`: the globs where the tool keeps its state and records (a WingFoil workflow instance, its Memory), each with its source; a path a `state` glob matches is state even inside a configuration place. A `configuration` glob that matches the manual's path is refused when the arm is loaded; one that matches a seed file of a scenario version is refused for that version, by `bench scenario configure` before any session and by `campaign validate` for each configured arm and scenario version a campaign runs, naming the glob and the file. `state` is required beside `configuration`, an empty list stated so where the tool keeps none (as `telemetry_off`); a missing one is refused. That the places include the project rules' place is checked when the arm is loaded, against the path REQ-FMT-14's generator writes for its tool. Being fields of `arm.yaml`, both are covered by the arm's digest.<br>**Amended in 1.51 (v0.3, W18, task-139, bug-034):** an arm holds **no symbolic link**, declared in `arm.yaml` or not: the loader refuses each, naming it by its path relative to the arm, once the declared paths exist. The digest still hashes a link by its target (REQ-FMT-13), so that an arm read from history digests as it ran; the loader is where a link is refused.<br>**Amended in 1.52 (v0.3, W18, task-140, F7.5):** made precise. A place is `{glob, source}`; a glob is relative to the workspace, `/`-separated, with `*` and `?` (never across `/`) and `**` as a whole segment, a trailing `/` naming everything below a directory, and a segment starting with a dot matched like any other; any other syntax (character classes, braces), `..`, an absolute path, a `.` segment, a backslash or an empty segment is refused, naming the glob. `state` without `configuration`, and places on an arm that declares no `requires`, are refused. The manual's paths a `configuration` glob must not match are every agent profile's manual file (`CLAUDE.md`, `AGENTS.md`); WingFoil's rules place is checked by a file directly under `.wingfoil/directives/custom/` and one in a subdirectory of it, each configuration and not state (a state place inside it, such as an index, stays allowed). | F2.5, F2.7, F7.5 |
| REQ-FMT-06 | **Results layout:** `results/<campaign-id>/<n>/`. It contains:<br>• `campaign.yaml`, a copy<br>• `runs/<scenario>@<ver>/<arm>/<model>/r<k>/`, holding `run.json` (with each step's observed `models`, REQ-RUN-09, 1.25), `setup/{log.txt, diff.patch}`, `steps/<NN>/{usage.json, transcript.jsonl, diff.patch, commits.json}` and `score.json`<br>• `aggregate.json`<br>`<NN>` is the step number in two digits, the same form REQ-RUN-05 uses in a commit message, so a scenario has **at most 99 steps** (1.4).<br>**Amended in 1.26 (v0.2):** • each run's `run.json` records `arm_digest` (REQ-FMT-13) and, for a harness arm, `harness.artifact_sha256`, the SHA-256 of the artifact the run installed (REQ-FMT-12; for WingFoil it is the existing `installed_sha256`, kept under both names), and `attempts`, the number of times it ran (REQ-RUN-19);<br>• an earlier attempt of a run lies under its run directory, `attempts/<k>/`, with its own `run.json` and steps;<br>• `execution.json` beside `campaign.yaml` records the execution's state (`running`, `stopped`, `completed`), why it stopped, and the dates it started and ended. The site reads its date there (REQ-RES-02).<br>**Amended in 1.33 (v0.2, task-095):** `run.json` records `arm_source`: `{ "tree": true }`, or `{ "commit": <sha> }` for an arm read from history (REQ-FMT-13 as amended in 1.33). A run without it was read from the tree.<br>**Amended in 1.44 (v0.3, W17, task-118):** a step's `commits.json` also lists each commit's `sha`, `author_email` and `committer_email`; a run of a scenario with an approver keeps `steps/<NN>/verdicts.json`, the verdict ledger: each verdict delivered at an approval request, its reply, its kind, the workspace's commit, the gate's release in the working tree, and what carrying it out did (`outcome`, `target`, the commits it made).<br>**Amended in 1.54 (v0.3, W18, task-142, F7.5):** the `run.json` of a configured arm, and of a configured docs control, records `configured`: the configured arm's base arm (`of`), how many sessions' records the configuration holds (`records`) and their `cost_eur` summed, so that M-K3 reads a run's results alone (REQ-SCO-08 as amended in 1.50).<br>**Amended in 1.58 (v0.3, W19, task-147, F4.9):** a run whose campaign pins a review loop holds `review/`: `loop.json` (the reviewer's pins, both prompts' SHA-256, the outcome `clean`, `not clean at <max_rounds>`, `failed`, `no fix`, `interrupted`, `quota exhausted` or `no loop`, with its reason for every outcome but `clean`, and the rounds) and, per round `review/<n>/`, `findings.json` (each finding's severity, file, line or none, title and why, as the reviewer's final result gave them), the reviewer's usage, and, when a fix followed, `fix.patch` and the fixer's usage and interventions; both sessions' transcripts git-ignored as a step's (`review/<n>/reviewer.jsonl`, `fixer.jsonl`). Every file is scrubbed of credentials as a step's is. | F5.1, F4.9 |
| REQ-FMT-07 | `aggregate.json` stores every value together with the list of run paths it was computed from, and its `n`. A value that compares two groups, the break-even (REQ-SCO-08), carries both groups' runs and `n` (1.15). | F5.1, experiment design §4.6 |
| REQ-FMT-08 | **Scenario validator:** checks the schema (REQ-FMT-04), and runs a **leak scan**. The scan fails when:<br>• a step prompt contains a name from a declared list of harness and tool names;<br>• an oracle literal (an expected value or a test name of at least a declared minimum length) appears in the seed or in a prompt. Check files are not scanned for literals: a content check is refused instead when its step's prompt satisfies it (REQ-SCO-06; changed in 1.12).<br>With the hold-out configured, hold-out oracles are scanned too. Their content is never printed; messages name only the file and the step.<br>**Amended in 1.50 (v0.3, W18, task-138, F7.5):** the scan covers a scenario version's configurations (REQ-FMT-04 as amended in 1.50) by two checks: (a) every file of a configuration is searched for the oracle literals, the hold-out's too when a hold-out path is set, as the seed is; (b) every step prompt is searched for the lines of the configuration's `.md` files, read as a scenario's `arms/<arm>/` lines are (prose after any frontmatter, of at least the declared minimum length). Unlike a scenario's `arms/<arm>/` lines (K3), a configuration's lines are **not** searched for in the seed: it is written from the seed, so repeating a README line is expected. Messages name the file and the configuration, never the literal. `configuring/prompt.md` is scanned by `bench scenario configure` before any session, for the harness names and for the oracle literals of the version it configures, the hold-out's too when a hold-out path is set.<br>**Amended in 1.55 (v0.3, W18, task-143, bug-047):** check (a) leaves out the oracle literals that are one prose word, lower case or capitalised (a test group's name such as `duplicate`): an agent writing from the seed uses such a word as prose. A literal of more than one word, holding a character other than a letter, or with an upper-case letter after its first (a camelCase name, an upper-case code such as `WELCOMEBACK`), is still searched for; the prompts, the seed and a scenario's `arms/<arm>/` keep every literal.<br>**Amended in 1.58 (v0.3, W19, task-147, F4.9):** the review loop's two prompts are scanned as the configuring prompt is (no harness name, no oracle literal of any scenario version the campaign runs, the hold-out's too when one is set); the reserved names a run's setup writes (`CLAUDE.md`, `AGENTS.md`, `.claude`, `.wingfoil` anywhere; `PROJECT_RULES.md` and `.mcp.json` at the root, REQ-RUN-12) are among what the loop strips from the reviewer's copy (REQ-RUN-21). | F3.2, F7.5, F4.9 |
| REQ-FMT-09 | **Scenario versions are immutable.** Results record the content hash of the scenario version they ran. The validator rejects a scenario version whose content no longer matches a hash recorded in stored results. | F3.4 |
| REQ-FMT-10 | Arm definitions declare `provides`, the harness capabilities the arm offers, as a map of capability to boolean: for example `workflow-engine: false` for the WingFoil v0.2 pre-release. An undeclared capability is not provided (1.9). | F3.6 |
| REQ-FMT-11 | **Eligibility register** (`eligibility/register.yaml`, outside `arms/`; added in 1.26): one entry per assessed tool and version, `{tool, version, date, criteria, verdict, reason}`. `criteria` holds each of the five published criteria (REQ-RES-09) with `pass` or `fail` and its evidence: runs with the campaign's agent and model id; its version can be pinned and installed reproducibly; it runs headless in a container; it is a workflow harness, not only a standards or prompt pack; it calls no LLM of its own. `verdict` is `admitted` or `excluded`, with the `reason`. **WingFoil is assessed like every tool** (T1). A campaign that pins a version the register has not assessed is refused until it is (T15). | F7.4, T1, T15 |
| REQ-FMT-12 | **Harness artifacts** (added in 1.26): every pinned harness version is installed from one artifact, built or fetched once and cached in the git-ignored `.cache/harnesses/` (adr-003 decision 2): WingFoil's tarball from a clean `git archive` of its pinned commit (REQ-RUN-14); an npm tool's `npm pack` of the pinned version from the registry, with the tree it installs with its dependencies, which is the installed artifact (1.28: an npm cache alone does not install offline), its `commit` in `run.json` being the tarball's SHA-256, since the registry has none, and a commit pin refused; a Python tool's wheel bundle of the pinned version with its dependencies. Its SHA-256 is recorded in each run (REQ-FMT-06), and the artifacts an execution used are attached to its release with its transcripts (REQ-CLI-11), so that a reader can install the same bytes. The third-party licences and notices inside an artifact travel with it, unchanged. | F7.1, T15, J6.2 |
| REQ-FMT-13 | **Arm digest** (added in 1.26): the SHA-256 of an arm's files, every file under `arms/<arm>/`, and for a docs control also the manual it borrows (REQ-RUN-11), taken in sorted path order as `<path>\0<sha256 of the content>\n` lines; 12 hex characters where a campaign file pins it, all 64 in `run.json`.<br>**Amended in 1.33 (v0.2, task-095):** a campaign's pinned digest is met by the working tree, or else by the newest commit of the repository's history whose `arms/<arm>/` digests to it: the arm is then read from that commit, written under `.cache/arms/<commit>/`, and runs as it was there. Only when no commit holds it is the campaign refused, as before. Scenario configurations for an arm are scenario content, pinned by the scenario's hash, and are not read this way.<br>**Amended in 1.50 (v0.3, W18, task-138, F7.5):** a configured arm's digest is taken over `arms/<arm>/**` and `arms/<base arm>/**` together, each line's path relative to the repository (`arms/<name>/<path>`), so that a change of either changes it; resolving a pinned digest from history (1.33) reads both directories from the same commit. A scenario's configurations are scenario content, pinned by the scenario's hash, and are not part of any arm's digest. | F7.2, T12, F7.5 |
| REQ-FMT-14 | **Project rules per harness** (added in 1.26): a scenario's project rules stay declared once, in the scenario, as v0.1's are (dl-005: S8's as the wingfoil arm's directives). For every other harness arm, a rules generator renders them, deterministically and outside the scenario's content hash, into the tool's own place for project rules: Spec Kit's constitution (`.specify/memory/constitution.md`), OpenSpec's project context (as its pinned version defines it). Each docs control gets them as Markdown, as `baseline-docs` does. What each generator wrote is kept with the run's results (`generated/`), and its SHA-256 is recorded in `run.json` (`generated_sha256`), so that a change of a generator's code is visible in every run it touched (REQ-NFR-02). The scenario versions, and so their comparison with v0.1, are unchanged. An arm whose generator delivers the rules declares `provides.directive-delivery: true`.<br>**Amended in 1.51 (v0.3, W18, task-139, bug-034):** every generator reads a directive file one way: CRLF and CR as LF; its code fences as CommonMark reads them (three or more backticks or tildes after up to three spaces, closed by the same character at least as long; container blocks, a list item's or a blockquote's fence, not read), so that no heading inside one is shifted; every line's trailing spaces stripped, a heading's too. A directive file that leaves a fence open is refused, naming it, by `bench scenario validate` (REQ-FMT-04 as amended in 1.51) and by every generator that reads it, so that it never runs into the next rule's title. | F7.1, F6.8, T3 |

## 3. Command surface (REQ-CLI)

One binary, `bench`, run with `npx bench`. Exit codes: `0` success, `1` failure, `2` usage error.

| ID | Command | Serves |
|---|---|---|
| REQ-CLI-01 | `bench campaign validate <file>`<br>**Amended in 1.34 (v0.3, dl-022):** for a file that extends a preset, `validate` prints the resolved campaign after its checks, so that what will run is seen before any spending. | F1.1 |
| REQ-CLI-02 | `bench campaign estimate <file>`<br>**Amended in 1.26 (dl-012):** for each key the estimate reads every completed dry run and prints the lowest, the mean and the highest; with one dry run it adds a stated margin of 35 % to it and says so. A key of another model is never priced from a known one. The figure compared with the warning and the ceiling is the **highest**, added to what every earlier execution of the same campaign spent.<br>**Amended in 1.33 (v0.2, task-095):** a dry run counts for a key only if it ran the arm the campaign pins (its recorded `arm_digest` matches the pinned digest; a dry run stored before arm digests counts) and, for an arm that requires a harness or a docs control generated from one, only if the profile it ran with (its stored copy) pinned that harness at the campaign's pin, the same version or the same commit (a dry run stored without its profile counts); otherwise the estimate says which dry run it skipped and why.<br>**Amended in 1.58 (v0.3, W19, task-147, F4.9):** an execution with a review loop is estimated with each run's loop under its own key, `review/<scenario>@<version>/<arm>/<model>`, `<model>` being the run's (the fixer's) and the reviewer's model and effort part of the pins matched: a dry run counts only when its `review_loop` pins equal the campaign's (agent version, model, effort, both prompts' SHA-256, `max_rounds`); a key no such dry run measured is reported as such, as a step's is. | F1.2, F4.9 |
| REQ-CLI-03 | `bench campaign run <file>`. It asks for confirmation above `warn_eur`, and refuses above `ceiling_eur` with **no override option** (acceptance decision 2).<br>**Amended in 1.26 (F1.4, bug-013, dl-012):** `bench campaign run <file> --resume <campaign-id>/<n>` continues execution *n* (REQ-RUN-19). The budget guard reads REQ-CLI-02's figure: the campaign's spending across all its executions plus the highest estimate of what is left.<br>**Amended in 1.58 (v0.3, W19, task-147, F4.9):** the confirmation and the refusal count the review loops' estimate with the steps'. | F1.3, F2.*, F4.9 |
| REQ-CLI-04 | `bench scenario validate <id>@<version> [--holdout <path>]` | F3.2 |
| REQ-CLI-05 | `bench scenario dry-run <id>@<version> --arm <arm> [--model <id>]`<br>**Amended in 1.32 (v0.2, task-094, outside the v0.2 campaign):** `[--profile <file>]` names another profile than `scenarios/dry-run.yaml`, relative to the repository: a spike's own pins (Codex, Claude Code 2.1.300 at `medium`) without touching calibration's profile. Without it, nothing changes.<br>**Amended in 1.33 (v0.2, task-095):** the profile may pin `arm_digests`, read as a campaign's are (REQ-FMT-13 as amended in 1.33), so that a dry run of the bridge's arm reads it from history; a dry run's identity includes its arms' digests, so a dry run interrupted before this amendment is not found again (bug-003) and is started afresh.<br>**Amended in 1.54 (v0.3, W18, task-142, F7.5):** a dry run of a configured arm, or of a configured docs control, is refused for what `validate` refuses of a campaign's configured arms (REQ-FMT-01 as amended in 1.50), the profile's `harnesses` read as a campaign's.<br>**Amended in 1.58 (v0.3, W19, task-147, F4.9):** a dry-run profile may carry a `review_loop` entry as a campaign does (REQ-FMT-01); the dry run then runs the loop after its last step and records it, so that the loop's cost and metrics can be measured before a campaign. | F3.3, F4.9 |
| REQ-CLI-06 | `bench score <campaign-id>/<n> [--holdout <path>]`; `bench score dry-runs/<n>` scores a dry run, whose `score.json` stays with it (added in 1.8). When every run of a campaign execution is scored, it writes the execution's `aggregate.json` (REQ-FMT-06, REQ-FMT-07); it never aggregates a dry run (added in 1.11)<br>**Amended in 1.26 (F1.4):** it aggregates an execution only when its `execution.json` says `completed`, or with `--final`, which records the execution as final, stopped or not; a run never started is then listed as not run. An execution without `execution.json`, as v0.1's are, aggregates as before 1.26. | F4.*, F5.1 |
| REQ-CLI-07 | `bench finding <campaign-id>/<n> --scenario … --metric … --arms …`. It writes `findings/<id>.md`. Made precise in 1.19:<br>• the form is `bench finding <campaign-id>/<n> --scenario <id>@<version> --metric <metric> --arms <arm>,… --as bug\|decision-log`; each option is required, and a missing or unknown one is a usage error (exit 2);<br>• the execution is a campaign's, `<12 hex>/<n>`, holding `aggregate.json`; a dry run is refused, never being aggregated. The groups read are the campaign's default model's, and each run's `run.json` is read for its scenario hash and harness: one that cannot be read refuses the note;<br>• **the metric catalogue:** `M-Q1`, `M-Q1-holdout`, `M-Q2`, `M-D3`, `M-F1`, `M-F2`, `M-K1`, `M-K2`, `M-K3`, `M-K4`, `M-E1`, `M-R`, each read from one place of the aggregate. An unknown metric, a scenario version or an arm the execution does not hold is refused, naming it and what exists (exit 1);<br>• **the id** is `<campaign-id>-<n>-<scenario>-<version>-<metric>-<arms sorted, joined by +>`, an arm named twice being refused, lowercased, any character outside `[a-z0-9.+-]` as `-`. A note already there is refused (exit 1) and never overwritten. The command writes that file only, and prints its path. | F5.4 |
| REQ-CLI-08 | `bench run show <run-path>` and `bench run compare <run-path> <run-path>` (made precise in 1.18):<br>• **a `<run>`** is a directory holding a `run.json`, or a run's name under `results/` as `aggregate.json` writes it (`<campaign-id>/<n>/runs/<scenario>@<ver>/<arm>/<model>/r<k>`, or `dry-runs/<n>/runs/…`). Anything else is refused, naming it (exit 1); a wrong number of arguments is a usage error (exit 2). Both commands only read;<br>• **`bench run show <run> [--full]`** prints, as Markdown on standard output: the run's identity and the pins it records; each step's session, outcome, token usage, cost, interventions with the approver's replies, commit messages, transcript and diff; then the test results of its `score.json`, or "not scored". A step the run never reached reads "not reached": the steps are the scenario version's, from `scenarios/` when it holds the version the run ran. A step killed at its time cap shows what it reported, if anything, and its cost bound. The transcript is the agent's text whole, the user's on one line, each tool call on one line, and each tool result's first 5 lines, or all of them with `--full`, errors said; the session's result and its text. A transcript that is not on disk (REQ-RES-06) is stated, never an error. A `score.json` that cannot be read, or scores another version, is stated and the run is shown unscored;<br>• **`bench run compare <run> <run>`** takes two runs of the same scenario version (scenario, version and hash) and refuses any other pair, naming both (exit 1). It prints a table with one row per step, each run's cost (EUR when scored, USD otherwise), M-Q1 and interventions, a cost bound as `≤`, then the final snapshot's M-Q1, the hold-out's final counts, the checks passed, and the totals: cost and interventions in the table, and each run's tokens, turns and time under it. Two runs with the same arm and repetition are told apart by their model, or as A and B; mixed EUR and USD columns are said. | F5.3 |
| REQ-CLI-09 | `bench site build <campaign-id>/<n>` writes to `site/`. `bench site publish` deploys it; publishing only ever happens through this command. Made precise in 1.20:<br>• `build` replaces `site/<campaign-id>/<n>/` whole and rewrites `site/index.html` and `site/style.css`; another execution's directory is left as it is. `site/` is git-ignored: it is rebuilt from the committed aggregates. It prints the directory, the number of pages and the headline;<br>• it refuses, naming it and writing nothing: a dry run, an execution that does not exist or has no `aggregate.json`, an aggregate or a run's `run.json` that cannot be read, an aggregate of another shape (every path and figure the site reads of a group is checked first; `checks`, absent before task-035, may be missing, and M-E1 then reads "not measured") or of an `aggregate_version` it does not read, and a scenario version missing from `scenarios/` or whose hash differs from the one its runs recorded. | F5.5, F5.6, F5.8 |
| REQ-CLI-10 | The hold-out path can also come from `BENCH_HOLDOUT_PATH`. It is never read by `campaign run`. | F3.5, F2.1 |
| REQ-CLI-11 | `bench transcripts pack <campaign-id>/<n>` (added in 1.22) packs an aggregated campaign execution's transcripts into one release asset (REQ-RES-06), records it in its runs, and prints the `gh release` command that attaches it, which it does not run. A dry run is refused.<br>**Amended in 1.26 (v0.2):** it also packs the harness artifacts the execution used (REQ-FMT-12) as a second asset, `harnesses.tar.gz`, and the earlier attempts' transcripts (REQ-RUN-19).<br>**Amended in 1.50 (v0.3, W18, task-138, F7.5):** the asset also holds the transcripts of the configuring sessions (REQ-RUN-20) of every configuration the execution ran, every session's (all its records, as M-K3 counts them), under `configuring/<id>@<version>/<harness>/<n>/` in the asset (beside the runs' paths relative to the execution, REQ-RES-06), scanned as the runs' are, and recorded in the runs of the configured arm and of its docs control that read the configuration; a configuring transcript missing on the packing machine is skipped and named, as a run's is.<br>**Amended in 1.58 (v0.3, W19, task-147, F4.9):** the asset also packs each run's review-loop transcripts (`review/<n>/reviewer.jsonl`, `fixer.jsonl`), each under its run's path. | F5.6, F7.5, F4.9 |
| REQ-CLI-12 | `bench campaign compare <campaign-id>/<n> <campaign-id>/<n>` (added in 1.26): the first execution named is the earlier, the second the newer, as the maintainer orders them; two executions that ran side by side, such as dl-007's bridge and its main campaign, are ordered by the maintainer's choice, which the comparison records. It compares the two aggregated executions (REQ-SCO-13) and writes `results/comparisons/<newer-id>-<n>/<earlier-id>-<m>.json`. A dry run, an unaggregated execution, or the same execution twice is refused, naming it. | F5.2 |
| REQ-CLI-13 | `bench campaign presets` (added in 1.34, dl-022): lists the presets of `campaigns/presets/` that can be extended, one line each, with its name and its `description:`; each one that cannot is named on the error output with the refusal REQ-FMT-01 gives it, and the command then exits 1. | F1.1 |
| REQ-CLI-14 | `bench scenario configure <id>@<version> --arm <harness> [--allow-spending] [--replace]` (added in 1.50, F7.5): runs the configuring agent (REQ-RUN-20) for that scenario version and harness arm, printing its ceiling first; prints the outcome, the configuration's files, the record's path and the cost. Exits 0 when the configuration is written; 1 when it is refused before any session (`--allow-spending` missing included, with `campaign run`'s message), or the session's result is refused, or the session ends early (its record written then); 2 for a usage error. `scenario validate` then scans the configuration with the version (REQ-FMT-08 as amended in 1.50).<br>**Amended in 1.53 (v0.3, W18, task-141):** it also exits 1 when the session could not start (REQ-RUN-20 as amended in 1.53), writing no record; and it refuses without `--allow-spending` whatever the profile's agent, since every configuring session is a real-agent one.<br>**Amended in 1.54 (v0.3, W18, task-142, F7.5):** `--arm` naming a configured arm is refused, naming its harness arm, the one configured.<br>**Amended in 1.57 (v0.3, W18, task-145, bug-049):** once a configuration is written, it runs the leak scan of `scenario validate` (REQ-FMT-08 as amended in 1.50) on it, with the hold-out's additions when one is set: its files holding an oracle or hold-out literal, and the step prompts repeating one of its lines; the version's other findings stay `scenario validate`'s. On a finding it prints them, by file and source and never the literal, and exits 1; the configuration and its record stay written, its outcome `written`, so the approver chooses between `--replace` and a fix of the scan. | F7.5 |

## 4. Runner (REQ-RUN)

| ID | Requirement | Serves |
|---|---|---|
| REQ-RUN-01 | One Docker image per campaign: `node:22-bookworm`, git, and Claude Code at the version pinned by the campaign. It is built once per campaign, with the tag `<campaign-id>`.<br>**Amended in 1.26 (v0.2):** the image also holds Python ≥ 3.11 and `uv`, for a Python harness's wheel bundle (Spec Kit). The base image and both versions are pinned in the image's Dockerfile.<br>**Amended in 1.58 (v0.3, W19, task-147, F4.9):** a campaign that pins a review loop also builds the reviewer's image: the pinned reviewer agent at its version, on the same base, nothing of any arm in it (REQ-RUN-21). | F2.1, F4.9 |
| REQ-RUN-02 | One container per run. The only bind mount is a fresh workspace directory, containing a copy of the seed plus the arm's environment, which becomes a git repository with one initial commit. Nothing from the benchmark repository or the hold-out is mounted.<br>**Amended in 1.58 (v0.3, W19, task-147, F4.9):** a review loop runs before the run's container is removed: its fixer sessions run in the run's own container and workspace, once the last step's commit and patch are stored (REQ-RUN-05), so the fixer has the last step's agent, harness, MCP server and verdict hook, and no image is made; the reviewer runs in a container of its own whose only mount is the stripped copy (REQ-RUN-21). The run's container is removed when the loop ends, whatever its outcome, as it is today at the run's end. | F2.1, F4.9 |
| REQ-RUN-03 | The arm setup runs inside the container before step 1. Its Claude Code usage (if any), wall time and cost are recorded as `setup`.<br>**Amended in 1.33 (v0.2, task-095):** the setup, the manual and the MCP configuration are the arm's as read (REQ-FMT-13 as amended in 1.33).<br>**Amended in 1.50 (v0.3, W18, task-138, F7.5):** for a configured arm, the base arm's whole setup runs as for the base arm: its setup script (the scenario's configuration for the base arm, `arms/<harness>/`, is what is copied to `~/scenario`, never `arms/<harness>-configured/`; today only the wingfoil setup applies it, as S8's directives), the manual's merge (REQ-RUN-12) and the project rules' generator (REQ-FMT-14). Then the runner copies the scenario version's `arms/<harness>-configured/` into the workspace, over what the setup left, and only then makes the setup commit, so that the configuration is in `setup/diff.patch` and scoring rebuilds step 1's snapshot with it. A run whose generated rules' SHA-256 differs from the one the configuration's record holds is refused before step 1, naming the arm: the configuration was written over other rules. The setup's usage, wall time and cost are recorded as for any arm; the configuration's own cost is not (REQ-SCO-08 as amended in 1.50). | F2.5, M-K3, F7.5 |
| REQ-RUN-04 | Each step runs: `claude -p <prompt> --output-format stream-json --verbose --model <id> --session-id <uuid> --permission-mode bypassPermissions --setting-sources project --max-budget-usd <remaining run cap>`. The wingfoil arm also gets `--mcp-config <arm mcp> --strict-mcp-config`. Bypassing permissions is acceptable only because the container is isolated.<br>**Amended in 1.32 (v0.2, task-094, outside the v0.2 campaign):** for `codex`, a step runs `codex exec --json --model <id> [-c model_reasoning_effort="<level>"] --dangerously-bypass-approvals-and-sandbox --skip-git-repo-check --strict-config -- <prompt>` in `/workspace`, and a resume `codex exec resume --json [-c model_reasoning_effort="<level>"] --dangerously-bypass-approvals-and-sandbox --skip-git-repo-check --strict-config -- <thread-id> <reply>`. Codex has no cost-cap flag: the run's cost cap is checked between invocations from the priced tokens, and `step_time_s` bounds each invocation. Codex picks its session's id (`thread.started`'s `thread_id`): the adapter answers for the runner's id and keeps the thread id for the resume and in the transcript. | F2.2, F2.3, F2.6 |
| REQ-RUN-05 | After each step the runner commits the workspace with the message `step <NN>`, then stores `diff.patch` for that step: the binary-safe patch from the previous snapshot's tree to this one's, whatever was committed in between. After the setup it stores `setup/diff.patch`, from the seed's tree. `run.json` records the tree of the setup and of every step (changed in 1.8, task-027, bug-007). Before its `step <NN>` commit it stores `commits.json`: the full messages, oldest first and scrubbed like the patch, of the commits the agent and its harness made during the step (added in 1.12). | F2.2 |
| REQ-RUN-06 | **Waiting-for-input detection.** A session is "waiting" when its final assistant message is classified as a question or an approval request by a fixed, versioned, rule-based classifier: approval patterns first, then a trailing question. **Approval patterns are matched anywhere in the message**, because a real approval request need not end with a question (1.3); the trailing-question test applies only when no approval pattern matched. The classifier's version is part of the approver policy version. The W2 spike settled it: [dl-004](../memory/decision-log/dl-004-waiting-for-input-classifier-v1.md).<br>**Amended in 1.38 (v0.3):** approver policy **v2** beside a frozen v1 (task-106): "need/require … approval" counts only with a requester, the reader's approval or the agent's own need, never a document's (bug-027); requests addressed to the requester that v1 missed, Codex's ("Please reply: Approved. Proceed.", a reply asked for at a sentence's start; bug-035) and Claude Code's ("please approve", "once you approve", "on your go-ahead"), while an account of a reply already given ("using your reply …") is not one; a question anywhere in the last two paragraphs. Its patterns are frozen with it, settled on a corpus of 1048 final messages of the v0.1, v0.2 and Codex executions (`test/fixtures/approver/`), every changed reading pinned. A campaign pins v1 or v2; the replies and the cap are the same.<br>**Amended in 1.43 (v0.3, W17, task-117, dl-029):** approver policy **v3** beside a frozen v1 and v2: v2's classifier, replies and cap, and a scenario's scripted verdicts (REQ-FMT-04): at a step that declares one, the first approval request is answered with the verdict's `text`, the later ones with its `later`; questions, and steps with no verdict, get v2's replies. Each reply is an intervention, as before. A scenario with no verdict reads v3 as v2.<br>**Amended in 1.45 (v0.3, W17, task-119, bug-038):** approver policy **v4** beside a frozen v3: v3's classifier, replies and verdicts, and, at a step with a verdict in a scenario with an approver, until the step's first approval request has been answered, a final message with a sentence (outside code, split as classifier v2 splits them) that names the approver as a whole word (her full name, first name or e-mail) and waits on her approval or verdict ("has to approve", "waits for approval from", "needs her sign-off", "once she approves"), and says nothing of there being no need to wait, is an approval request too; v3's own reading comes first. And policy **v5** beside a frozen v4: the same, the wait read by any approval word (`approv…`, `review…`, `verdict`, `sign-off`) in a sentence naming the approver, the account of a verdict already given ("approved by", "rejected by") aside; v4 missed "needs Dana Okafor's approval" in the calibration's third round. A scenario with verdicts runs under v3, v4 or v5. | F2.4 |
| REQ-RUN-07 | A reply resumes the same session with `--resume <session-id> -p <reply>`. Each reply is recorded as an intervention: step, kind, and reply text. A rate limit's resume is not a reply and is not recorded as an intervention (REQ-RUN-13, 1.24). | F2.4 |
| REQ-RUN-08 | Caps: a step is killed at `step_time_s`, or when its tokens exceed `step_tokens`, its tokens being every model's (REQ-RUN-09, 1.27). The run stops when its cumulative API-equivalent cost reaches `run_cost_eur`. The campaign stops starting runs when its cumulative cost reaches `ceiling_eur`. A rate limit's waits do not count against `step_time_s` (REQ-RUN-13, 1.24).<br>**Amended in 1.58 (v0.3, W19, task-147, F4.9):** a review loop's reviewer and fixer sessions are capped by the campaign's `review_loop.caps`, never by `step_time_s`, `step_tokens` or `run_cost_eur`; a session killed at its cap, or a fixer reaching `fixer_interventions`, ends the loop as `failed`, and the run's steps and scores are kept. The loops' cost counts toward the campaign's cumulative spending: `ceiling_eur` stops new runs for a loop's cost as for a step's, and is checked between a loop's rounds, a loop that reaches it ending as `interrupted`. | F1.3, F4.9 |
| REQ-RUN-09 | Usage is taken from the stream-json result events: tokens by kind, cost in USD converted with the campaign's rate, turns and duration. The API-equivalent cost is recorded whatever the billing (sequencer decision 1). The models the agent used are taken from the result events' `modelUsage` and recorded per step: for each model key, as the agent names it (unnormalised, so one model can appear under an alias and a dated id), its tokens by kind and its cost, at the session's latest total for that key, in `usage`'s camelCase and without a EUR figure (1.25). **A step's tokens** are the sum over those models, at each key's latest total (1.27, bug-012); a step whose sessions reported no `modelUsage` keeps its result events' `usage`. Each model's `costBasis` is recorded when the agent reports it. **A cost the agent could not price** (a basis other than `list`, bug-016) is flagged: `run show` names it, `score.json`'s cost holds `cost_priced: false`, the aggregate lists the run as `cost.unpriced`, the method page names it, and its dry run does not count for an estimate.<br>**Amended in 1.32 (v0.2, task-094, outside the v0.2 campaign):** for `codex`, usage is read from the `--json` stream. `turn.completed`'s `usage` is the thread's running total, so an invocation's own tokens are its last total less the thread's total before it. `input_tokens` includes `cached_input_tokens` and `cache_write_input_tokens`, so fresh input is the rest; `reasoning_output_tokens` is inside `output_tokens`. The cost is priced from a pinned table of OpenAI's list prices and recorded with `costBasis: price-table`: flagged like every basis other than `list`, but accepted by the estimate as a price the benchmark computed; `unknown` is still refused. `turns` counts `turn.completed` events, not API round trips. A total below the thread's earlier one is the invocation's own, added to it; a resume that restarted its count yet ends at or above the earlier total on every kind cannot be told apart from a thread total, so whether 0.162.1's resume restarts is task-094's P0 to observe. Only `turn.completed` carries usage: an invocation that failed or was killed reports none, so its tokens and cost count as zero, a lower bound, which the caps between invocations cannot see.<br>**Amended in 1.35 (v0.3, task-102, bug-032's Codex case):** an invocation whose agent says its usage is not known (`costUnknown`: Codex's stream with no `turn.completed`, failed or stopped at the quota; a rate limit is waited out and resumed, unmarked, and one that outlasts the waits ends `quota exhausted` at the usage it reported) is counted at its bound, as a killed one, with `cost_reported: false`, and keeps its outcome; one that ended after a `turn.completed` keeps the usage it reported.<br>**Amended in 1.49 (v0.3, W16, task-126, bug-032):** a Claude Code invocation (a step's first, or a resume) whose agent ends without a result event (failed, killed at a cap, or interrupted) is counted at its bound with `cost_reported: false`, as a Codex invocation with no usage is (1.35), never as zero; the step's earlier invocations keep the cost they reported. An interruption of the runner (SIGINT or SIGTERM) records the step's status `interrupted`, not `failed`, its cost that of a killed step, REQ-RUN-19's (the `docker exec` client kept out of the terminal's interrupt, so that the runner, not the client, ends it). An interrupted dry run keeps its record and the cost its steps spent; running it again starts a new dry run, as before.<br>**Amended in 1.58 (v0.3, W19, task-147, F4.9):** a review loop's sessions are read the same way, recorded in `review/` and never summed into a step's or the run's usage (M-K1 stays the steps'). | F2.3, M-K1, F4.9 |
| REQ-RUN-10 | Web use is recorded from tool-use events named `WebFetch` or `WebSearch`. Network use through shell commands is **not** detected, and the method page states this limit. | T13 |
| REQ-RUN-11 | `baseline-docs` environment generator: a pure function of the wingfoil arm's configuration and the scenario. The output is deterministic, with sorted keys and fixed templates.<br>**Amended in 1.26 (v0.2):** one generator per harness: `baseline-docs` from the wingfoil arm, `speckit-docs` from the speckit arm, `openspec-docs` from the openspec arm, each a pure function of its arm's configuration as captured by running the arm's own setup, and of the scenario. "The same information" is the project information and the rules the tool's configuration holds after setup (its constitution or project context, the scenario's rules, REQ-FMT-14); the tool's own mechanics (its command and skill definitions, templates, settings) are not rendered, as WingFoil's settings are not. Each generator declares, kind of content by kind of content, what it renders and why, and the method page publishes the declaration. A docs control gets the operating manual of `baseline-docs`, naming its file; a docs control's digest (REQ-FMT-13) also covers that manual. The generated environment's SHA-256 is recorded in `run.json` (`generated_sha256`). The name `baseline-docs` is kept for continuity with v0.1.<br>**Amended in 1.41 (v0.3, task-114, dl-021 step A):** a docs control that declares `docs_directives: every-role` gets, as the Rules of `PROJECT_RULES.md`, every directive a role or every role loads, by id, each once and labelled with the roles it is bound to (sorted), or as every role's when it is global, under one sentence saying the rules are per role; directives no role loads stay out. Without the field the generator renders the developer's and the global ones, unlabelled, as before, so that a digest pinned before 1.41 renders as it ran. baseline-docs declares it from the step-A wingfoil arm on; its manual, which the other docs controls borrow, is unchanged. The method page's table states both.<br>**Amended in 1.50 (v0.3, W18, task-138, F7.5):** a configured docs control is generated by its harness's generator (`baseline-docs`'s for `wingfoil-configured`, and so on) from the configured arm's configuration as captured after its setup and the configuration's copy (REQ-RUN-03 as amended in 1.50), with the same declaration of what it renders, which the method page states once for both; it gets the manual of `baseline-docs`, as every docs control does. Its generation is refused, as a run is (REQ-RUN-03 as amended in 1.50), when the REQ-FMT-14 rules its setup's snapshot generates differ from the configuration's record (not the rendering of `PROJECT_RULES.md`, whose SHA-256 `generated_sha256` holds). A configuration file the generator does not read is not rendered, and the method page lists such files.<br>**Amended in 1.56 (v0.3, W18, task-144, bug-048, F7.5):** openspec-docs renders the configuration's context whole when it holds no `## ` line, as a configuring agent writes it, and renders the per-artifact `rules:` and the `operations:` guidance it holds, each as a section of lists after the context; a configuration with none of the three declares no rule. Without them its output is unchanged, so the openspec-docs control of the rules generator's configuration keeps its bytes; the generator's declaration states the two as rendered. | F2.5, T3, F7.5 |
| REQ-RUN-13 | **Subscription quota** (requirements decision 2): when a session fails because the subscription's usage limit is reached, the step's outcome is `quota exhausted`. The campaign stops starting new runs, and the runs already completed are kept. The API-equivalent cost cap (REQ-RUN-08) keeps working as a proxy budget. Made precise in 1.24: when the session is rejected by the account's **rate limit** (HTTP 429, "rate limit" in the result, or a `rate_limit` error), the step is not failed: the runner waits 2, 5, 15 and 30 minutes — a constant of the runner — and after each resumes the step's session with the fixed message `Continue.`, which is not an intervention (REQ-RUN-07); the waits do not count against `step_time_s`, and `run.json` records them per step as `rate_limit_waits` (`after_invocation`, `waited_s`). The four waits are the step's, not each rejection's: a second rejection in the same step continues from the next wait. A step over `step_tokens` or with nothing left of the run's cost cap is not resumed. A rate limit still in force after the last wait ends the step `quota exhausted`, as above.<br>**Amended in 1.32 (v0.2, task-094, outside the v0.2 campaign):** for `codex`, a usage-limit message ("You’ve hit your usage limit", "Quota exceeded", a spend cap or a workspace out of credits) is `quota exhausted`, and "rate limit exceeded" or the end of Codex's retries on a 429 is `rate limited`, from a `turn.failed` or from an `error` event before it. Codex's own retries ("Reconnecting…") are not failures. The texts are Codex 0.162.1's source, not yet observed.<br>**Amended in 1.58 (v0.3, W19, task-147, F4.9):** a quota rejection in a review loop session ends that loop as `quota exhausted` and stops the campaign, the run keeping its outcome `completed` (REQ-RUN-21). | F1.3, sequencer decision 1, F4.9 |
| REQ-RUN-14 | **WingFoil under test:** the wingfoil arm's setup installs WingFoil from a tarball built by the runner, with `npm pack` from a clean `git archive` of the pinned commit. It is never taken from `vendor/` (the managing WingFoil) nor from the host's `PATH`. Its dependencies are installed at the versions of the `package-lock.json` of that same commit, never resolved from the ranges in `package.json` (added in 1.5). It is invoked as `wingfoil`, never through `npx`, which does not resolve to the installed build and may fetch a published release instead (added in 1.5). The tarball's commit is recorded in `run.json`.<br>**Amended in 1.26 (v0.2):** it applies to WingFoil; other tools follow REQ-FMT-12. `vendor/` holds only the WingFoil that manages this repository, never a harness under test. | F2.6 |
| REQ-RUN-15 | **Agent authentication (amended 1.3):** by default the runner passes a **long-lived token** of the maintainer's Claude subscription (`claude setup-token`) into the container in the environment variable `ANTHROPIC_AUTH_TOKEN`, read at run time from a file outside the repository. `ANTHROPIC_API_KEY` is not interchangeable with it. Whitespace is stripped from a credential before it is passed, and a malformed one is refused before a session starts. Mounting the credential file read-only stays a **documented variant**: it requires the run image to create the agent's configuration directory owned by the container user, because mounting the file alone makes Docker create that directory owned by root, where the agent cannot keep the session state `--resume` needs. REQ-NFR-01 applies to either form.<br>**Amended in 1.32 (v0.2, task-094, outside the v0.2 campaign):** for `codex`, the credential is the maintainer's ChatGPT subscription's `auth.json`, under dl-019 and for its scope only. `BENCH_CODEX_AUTH_FILE` names it: a regular file, mode `600`, in a directory of mode `700`, outside the repository, every worktree and the workspace, wherever a link to it is (the real path is checked, mounted and mount-checked), read only for its values to scrub (by the CLI before the run and by the adapter around each invocation); a credential with no value to scrub is refused. It is bind-mounted read-write, as a single file, at the run's `CODEX_HOME/auth.json`: Codex 0.162.1 rewrites it in place (truncate and write), so the mount survives a refresh. The runner writes the rest of `CODEX_HOME` (`config.toml`: file credential store, no history, no memories, no analytics, no OpenTelemetry exporter). Nothing of it is in the environment. `CODEX_API_KEY` in the environment is the variant dl-019's option A would take.<br>**Amended in 1.35 (v0.3, task-102, dl-024):** `campaign run` and `scenario dry-run` refuse `agent.name: codex` after 2026-11-13 (UTC, the clock injectable for tests), a Codex campaign that does not extend `presets/baseline-across-agents.yaml` or runs another arm than the baseline, and a Codex dry run from another profile than `campaigns/codex-baseline.dry-run.yaml` or of another arm, each naming dl-024.<br>**Amended in 1.37 (v0.3, task-105, dl-025):** the Codex refusals of 1.35 accept, besides the baseline campaign, a campaign that extends `presets/harness-vs-docs.yaml` with the arms baseline, baseline-docs and wingfoil at most and `gpt-5.6-terra` alone, and dry runs of `campaigns/codex-terra-harness-vs-docs.dry-run.yaml` of those arms on that model; anything else is refused as before, naming dl-024 or dl-025. An arm's MCP servers (its `mcp.json`, Claude Code's format) reach Codex as `[mcp_servers.<name>]` tables of its `config.toml` (stdio servers: `command`, `args`, `env`, and `required = true`, so that a server that does not start ends the session, which then counts as a failed step at its bound, REQ-RUN-09 as amended in 1.35); a server of another kind, or a name, key or value that is not valid TOML, is refused before the run.<br>**Amended in 1.41 (v0.3, task-114, dl-027, dl-028):** the Codex refusals accept, besides 1.37's, the campaign file `campaigns/codex-terra-step-a.yaml` (campaign-007), which extends `presets/harness-vs-docs.yaml`, with the arms baseline, baseline-docs and wingfoil at most on `gpt-5.6-terra` and `gpt-6.1-terra`, and dry runs of `campaigns/codex-terra-step-a.dry-run.yaml` of those arms on those models; another file extending that preset keeps `gpt-5.6-terra` alone. `campaign run` passes the campaign file to the check as `campaigns/<file>` of the tree that holds it, so that an entry kept to a file matches by that name, its arms and models checked all the same. The refusals of a preset and of a profile name every decision of the scope (dl-024, dl-025, dl-027, dl-028); those of arms and models name their entry's decision, and the date's dl-024.<br>**Amended in 1.42 (v0.3, task-115, dl-031):** campaign-007's file and its dry-run profile run `gpt-5.6-terra` and `gpt-6-luna`, in place of 1.41's `gpt-6.1-terra`, which they now refuse; their refusals name dl-027 and dl-031, and those of a preset and of a profile name dl-024, dl-025, dl-027, dl-031. | F2.3, REQ-NFR-01 |
| REQ-RUN-16 | **Agent version:** Claude Code is pinned per campaign (`agent.version`). v0.1 development and dry runs use **2.1.221** (requirements decision 4). **Effort** (1.27, dl-015): `agent.effort: {<model>: <level>}` pins the effort of each model, one of `low`, `medium`, `high`, `xhigh`, `max`, or `none` for no flag. A real agent's run or dry run refuses a model with no effort, before the estimate; `validate` lists it. The runner passes `--effort` on every invocation, steps and resumes, and `run.json` records `effort`. It is part of the campaign's identity, and a dry run counts for the estimate only at the pinned effort.<br>**Amended in 1.32 (v0.2, task-094, outside the v0.2 campaign):** Codex is pinned by the released version of `@openai/codex`, which the run image installs when `AGENT_NAME=codex`. | F1.1, T7 |
| REQ-RUN-12 | The operating manual of each arm is copied as `CLAUDE.md` into the workspace. Its size in tokens is measured with a fixed tokenizer approximation and recorded per run.<br>**Amended in 1.26 (v0.2):** where a tool's own setup writes a `CLAUDE.md`, the arm's operating manual comes first and the tool's content follows under a heading naming the tool; the size measured and reported is the whole file's.<br>**Amended in 1.32 (v0.2, task-094, outside the v0.2 campaign):** the manual's file is the agent's: `CLAUDE.md` for `claude-code` and `fake`, `AGENTS.md` for `codex`, with the same bytes and the same measure. The leak scan reserves `AGENTS.md` as it reserves `CLAUDE.md`.<br>**Amended in 1.37 (v0.3, task-105):** under Codex the manual is `AGENTS.md`, merged with an `AGENTS.md` the tool's setup wrote exactly as a `CLAUDE.md` is under Claude Code. | F2.7 |
| REQ-RUN-17 | **Approval authority in the wingfoil arm** (requirements decision 1): the arm's WingFoil configuration declares a member "Benchmark Approver" with the `approver` role, and the container's git identity is that member. After the neutral approver's reply, the agent may run WingFoil's approval commands itself. The method page states that the *decision* is always the neutral approver's, and that the agent only executes it.<br>**Amended in 1.44 (v0.3, W17, task-118, dl-029):** for a scenario with a separate approver (REQ-FMT-04) the agent's identity is "Benchmark Developer" <developer@benchmark.localhost>, which the wingfoil arm's setup declares with the `developer` role only, and the scenario's DNA names the approver. At a step's first approval request under policy v3 the runner carries the step's verdict out through the arm's `verdict_hook`, passing the approver's identity to it, never to the agent's environment; an arm with none receives the text only. Every other scenario keeps the Benchmark Approver (option (a)). | F2.4, F2.5, M-E3 |
| REQ-RUN-18 | **Competitor arm setup** (added in 1.26): the arm's setup installs its tool from its artifact (REQ-FMT-12) and initializes it as the tool's official documentation says for Claude Code, in a script published with the arm. Spec Kit: `specify init` with `--integration claude` (its skills); OpenSpec: `openspec init --tools claude --profile core --force`. The exact flags are verified on the pinned version by the arm's spike. The arm's `telemetry_off` is set in the container. **The runner starts the agent in every arm** (experiment design 1.2 §2): a tool's own engine that starts agents (Spec Kit's `specify workflow run`) is not used in v0.2. **No approver member** exists in a competitor arm: its git identity is the agent's, Spec Kit's gates are not used, and its only approvals are the neutral approver's replies (REQ-RUN-07), as the method page states. | F7.1, T12 |
| REQ-RUN-19 | **A campaign can be stopped and resumed** (added in 1.26):<br>• **an interrupt** (SIGINT or SIGTERM) kills the current step's agent at once, counting it at its bound as a killed step (REQ-RUN-08), records the run `interrupted`, removes its container, and records the execution `stopped` in `execution.json`, with the reason. A stop at the subscription's quota (REQ-RUN-13), at the ceiling or by `fail_fast` is recorded the same way, with its own reason;<br>• **`--resume <campaign-id>/<n>`** runs, in execution *n*, only the runs that never started and those whose outcome is `failed` (an infrastructure failure: the agent, Docker or the network failed), `interrupted` or `quota exhausted`. A run that reached a cap, or completed with a poor result, is never re-run: that would select results. A re-run keeps the earlier attempt under `attempts/<k>/` and counts it in `attempts`, which the site publishes beside the run; aggregation reads the last attempt only;<br>• **a resume is refused** when the campaign file's identity differs from the execution's, or the execution is already aggregated. A stopped execution is aggregated only when the maintainer says so (`bench score <campaign-id>/<n> --final`, REQ-CLI-06 as amended in 1.26), so scoring it never forecloses a resume by itself;<br>• **`fail_fast`**, opt-in: once *k* runs ended `failed` at the same step number with the same `error` text, no further run starts, as after an interrupt.<br>**Amended in 1.58 (v0.3, W19, task-147, F4.9):** an interrupt during a review loop ends the loop as `interrupted` and the campaign as REQ-RUN-19 states, the run keeping its outcome `completed`; a loop is never resumed: `--resume` re-runs runs as before, never a completed run's loop, which stays recorded with its outcome (the approver's choice, 2026-11-13). | F1.4, bug-013, REQ-NFR-03, F4.9 |
| REQ-RUN-20 | **The configuring agent** (added in 1.50, F7.5, the approver's choices of 2026-11-06): one session per scenario version and harness arm, run by `bench scenario configure` (REQ-CLI-14), writes the harness's configuration for the project:<br>• **the profile:** `configuring/profile.yaml`, which holds exactly `agent`, `models.default`, `harnesses` (the pins of the harness arms it configures, as a campaign's), `caps` and `currency`, each as a dry-run profile's; any other field (`approver_policy`, `arm_digests` included) is refused; Claude Code with `claude-sonnet-5-5` from 1.50. No other profile is accepted. Its `agent` holds `name`, `version` and `effort` (REQ-RUN-16 as amended in 1.27). Its image is built from the profile's agent and harness pins as a campaign's is (REQ-RUN-01);<br>• **what it sees:** the workspace exactly as a run of the harness arm leaves it before step 1 (REQ-RUN-03): the scenario version's seed, its `README.md` included, after the arm's whole setup, so with the scenario's configuration for the base arm (S8's wingfoil directives, which the configuration then extends), the merged manual and the project rules REQ-FMT-14 generates (S8's rules for Spec Kit and OpenSpec), with the network as a run has it, **less the arm's manual and MCP server**: the merged manual's file is moved aside for the session; after it, a file at the manual's path refuses the result, then the manual is restored, then the workspace is compared with the setup commit, and no MCP server is attached, so that what instructs the agent is the prompt alone, the same for every harness. Nothing else of the scenario: no step prompt, no oracle, no hold-out, no other arm's configuration. The tool's own files and documentation are there as its setup installed them;<br>• **one prompt, agent and model for every harness** (T12): `configuring/prompt.md`, which names no harness (REQ-FMT-08 as amended in 1.50), sent as the session's one prompt;<br>• **what it writes:** the files the session added or changed, compared by git with the setup commit: tracked files and untracked files git does not ignore (under the seed's and the setup's ignore rules), so `.git/`, `node_modules/` and ignored outputs never, copied to the scenario version's `arms/<harness>-configured/` at their workspace paths, and the session's patch to `configured/<harness>-configured.patch`; both are written, and on `--replace` replaced, only on a `written` outcome. The result is **refused**, and only its record written, when the session deleted a file, wrote a symbolic link, or added or changed any path outside its harness arm's `configuration` places (REQ-FMT-05 as amended in 1.50): a seed file, a new project file, the merged manual's path (REQ-RUN-12), and any path its `state` globs match, whether the setup left it or the session added it, included; and when it changed, added or removed a member, a role or a member's roles (REQ-RUN-17's identities and those the setup declares are not the configuration's to change). A configuration is the tool's and the agent's configuration, never the project's code, the arm's manual or the tool's state; the refusal names every offending path;<br>• **the record:** `configured/<harness>-configured.json`, each session's appended, never rewritten: the agent (name, version), the model, the prompt's and the profile's SHA-256, the harness pin (tool, version, commit), the base arm's digest, the generated rules' SHA-256 (REQ-FMT-14's, or none), the usage, `cost_eur` (a session ended early counted as below), the wall time, the date, the outcome (`written`, `refused` with its reason, or, as REQ-RUN-09 as amended in 1.49 names a step's, `killed` at a cap, `failed` or `interrupted`, each counted at its bound with `cost_reported: false` when the agent reported none) and each written file's path and SHA-256; never a credential (REQ-NFR-01). The transcript is kept, scrubbed, as `results/configuring/<id>@<version>/<harness>/<n>/transcript.jsonl` (`<n>` the record's index), git-ignored as a run's is, and packed into the release asset of every execution that runs the configuration (REQ-CLI-11 as amended in 1.50);<br>• **refusals before any session** (exit 1): a scenario version 1.0 (the approver's choice of 2026-11-06), an arm that is not a harness arm, a prompt the scan refuses, any write to a version a run is of (REQ-FMT-04 as amended in 1.50), a harness arm with no `configuration`, a `configuration` glob that matches a seed file of that version (REQ-FMT-05 as amended in 1.50), and a version that already holds the configuration unless `--replace`; a replaced configuration's directory is replaced only when the new session's outcome is `written`, and its records are kept.<br>Every session is a real-agent session: without `--allow-spending` the command refuses before any session, as `campaign run` and `scenario dry-run` refuse, and it runs only on the approver's consent; it prints the profile's `run_cost_eur` cap as the session's ceiling before starting.<br>**Amended in 1.52 (v0.3, W18, task-140):** the profile's pins from 1.52: Claude Code 2.1.300 at medium effort, the harnesses wingfoil v0.3.1, speckit v1.1.0 and openspec 1.14.0, and the dry-run profile's caps and rate, so a session's ceiling is 5 EUR.<br>**Amended in 1.53 (v0.3, W18, task-141):** made precise. The session is one step through the run's own path (REQ-RUN-05, REQ-RUN-08), with no reply from the neutral approver, since it has its one prompt only; it ends `killed` at the time, token or cost cap, `interrupted` at the maintainer's interrupt, and `failed` otherwise (the subscription's quota included). A session whose agent reported no cost, or that failed with no report, counts at its bound, the session's ceiling at most, with `cost_reported: false`, and a session that completed so is `failed`, not `written`. A result that adds or changes no file is `refused`, and so is one with a type change or a file holding a value of the agent's credential (REQ-NFR-01: a configuration is committed as it was written, never scrubbed); a file git records executable keeps its mode. Once the session's step has returned, its reported usage stands, whatever fails after it. The members and roles are those the tool declares: for wingfoil, `team.members` (each one's name, e-mail and roles) and `team.roles` of `.wingfoil/dna.yaml`, compared as sets, so that rewording the file is not a change; a tool that declares none has none to change. A failure before the session starts (the image, the harness, the workspace, the arm's setup) writes no record: no session ran and nothing was spent, what it made under `runs/` is removed, and the command says why and exits 1. `<n>`, the transcript's directory, is the record's number in its file, from 1; the session's workspace and its setup's output are kept as a run's, git-ignored, under `runs/configuring/<id>@<version>/<harness>/<n>/`, and one an earlier session left with no record refuses the next session, naming it; a session claims that directory before anything is built, so that a second invocation of the same session at once is refused and touches nothing. A version whose newest record is dated after the machine's clock is refused before any session, since the next record would go back in time. | F7.5, T12, M-K3 |
| REQ-RUN-21 | **The review loop** (added in 1.58, F4.9, experiment design 1.13 §4.7, the approver's choices of 2026-11-13): when the campaign pins `review_loop` (REQ-FMT-01), every **completed** run of every arm, the controls included, ends with a review loop, once its last step's snapshot is committed and its patch stored (REQ-RUN-05); a run that ends otherwise (a cap, a failure, an interrupt, quota) records `no loop` with its outcome. Scoring (REQ-SCO-01) reads the stored step patches, never the loop.<br>• **The copy and the stripping:** the runner builds the reviewer's copy as a fresh git repository: its first commit is the seed, its second the final tree, both stripped of every path the run's setup **added** (the tool's installed files, its configuration, a configured arm's configuration, the manual, `PROJECT_RULES.md`, the MCP configuration) and of the reserved names of REQ-FMT-08, a setup-added path staying stripped even when a step changed it (its content would show the tool's template); a seed path the setup changed keeps its final content, as project code (no arm's setup changes one in v0.3). Nothing of the run's own history, commit messages or setup diff reaches it. What else the agent wrote during the steps stays, its records in the tool's state places included (the approver's choice, symmetric with the docs controls' records). The fixer works in the run's own container and workspace (REQ-RUN-02), after the last step's commit and patch are stored: the run's stored patches, `commits.json` and scores are never changed, and the workspace's later state is the loop's (the approver's choice, 2026-11-13, rather than a copy in another container, which would lack the harness the setup installed in the run's).<br>• **The reviewer:** a session of the pinned agent, version, model and effort with `review/prompt.md`, the same in every arm, in a container of its own (an image with the pinned reviewer agent, its credential as REQ-RUN-15 states for that agent, the run's network, no MCP server, no arm directory), shell allowed for reading and searching (its prompt asks it not to install dependencies, build or run the code). Round 1 is pointed at the diff between the copy's two commits; a later round's copy commits the fixer's tree after the previous fix, every earlier fix included, stripped as above, over the stripped tree before that fix, and the reviewer sees the whole copy pointed at that commit's diff (the approver's choice). It works read-only: the copy's tracked files and the untracked files git does not ignore are compared with its commit after the session, and a change refuses the round, the loop `failed`. Its findings are its final result message, JSON in the shape of REQ-FMT-06 (severity `blocker`, `should-fix` or `nit`, file, line or none, title, why); output that does not parse ends the loop as `failed`. A finding's line is a line of the copy that round's reviewer saw.<br>• **The fixer:** the run's own agent and model with `review/fixer-prompt.md` and the round's blockers and should-fixes, in the run's container with the arm's harness, manual and MCP server as in a step, under the campaign's approver policy as a step after the last; its interventions are capped by `review_loop.caps.fixer_interventions` (reaching it ends the loop as `failed`) and recorded in the loop, not the run. Its `fix.patch` is the copy's tree before the fix against after, whatever it committed, scrubbed as REQ-RUN-05 states; a fixer whose patch, stripped as the reviewer's copy is, changes nothing ends the loop as `no fix`.<br>• **The closing rule:** after a round with a blocker or a should-fix the fixer fixes and the next round reviews; a round with nits only, or none, closes the loop as `clean`, and nits are never fixed; after `max_rounds` rounds without closing, the loop is `not clean at <max_rounds>`. A reviewer or fixer session that fails or is killed at a cap ends the loop as `failed`.<br>• **Stops:** an interrupt during the loop ends it as `interrupted` (REQ-RUN-19), and a quota rejection ends it as `quota exhausted` and stops the campaign (REQ-RUN-13); either way the run keeps its outcome `completed` and its scores. A loop is never resumed: an unfinished loop stays recorded with its outcome and reason. | F4.9, T16, T17 |

## 5. Scoring (REQ-SCO)

| ID | Requirement | Serves |
|---|---|---|
| REQ-SCO-01 | Scoring runs in its own container, from a copy of each step snapshot, with the oracle mounted **read-only** and **no network** (added in 1.8). It never uses a run container. Each snapshot is rebuilt from what the run stored (REQ-RUN-05) and checked against the tree the run recorded. | F4.1 |
| REQ-SCO-02 | Hidden tests use Node's built-in `node:test`, with `tsx` to load the snapshot's TypeScript. They are independent of whatever test tool the agent chose. | F4.1 |
| REQ-SCO-03 | Scoring is deterministic: the same snapshot and oracle version give identical `score.json`. No wall clock or randomness enters a metric. Timestamps are only recorded as metadata. | F4.1 |
| REQ-SCO-04 | Static quality (M-Q2): ESLint with the **benchmark's** fixed configuration, not the project's; complexity from ESLint's `complexity` data; duplication with jscpd; coverage from the project's own tests under c8, or 0 if there are none. All are pinned in the scoring image (made precise in 1.16):<br>• **the files measured** are the source files (`.ts .tsx .mts .cts .js .jsx .mjs .cjs`, not `.d.ts`, not under `node_modules/`) that the final snapshot adds or changes from the seed, less every path the setup's stored patch touches. Tests are measured, but are not coverage targets. With none, M-Q2 is "not applicable"; with no final snapshot, "not reached";<br>• **the configuration** is `@eslint/js` recommended plus `typescript-eslint` recommended, not type-checked. Each function's complexity is read from `complexity` at 0, which is never counted as a finding; a file that does not parse is one finding;<br>• **coverage** is the lines of the coverage targets that c8 saw run while the project's `npm test` ran, counted whether its tests pass or fail. It is 0 covered when there is no `test` script, and the tests' outcome is recorded;<br>• `score.json` records each indicator as the integers it is a ratio of: lint findings and lines, functions and the sum and maximum of their complexity, duplicated lines and lines, covered and total lines. There is no composite.<br>**Amended in 1.51 (v0.3, W18, task-139, bug-034):** the files measured are read with no symbolic link listed or followed, so a link is never measured as the file it points to; the setup's patch's paths are read exactly: both sides of each `diff --git` header, unquoted with spaces or C-quoted with octal escapes, and the `rename`, `copy`, `---` and `+++` lines of each file's extended header, never a hunk's line. The measured files reach each tool as separate arguments, as they did; the list reaches the scoring script as one JSON argument. On the 476 published runs read on 2026-11-07, no stored patch held a quoted path, an unparsed header or a link, and the exact reading gives every patch the same paths: no published value changes. | F4.2 |
| REQ-SCO-05 | AST checks (M-E1 R2–R4, M-R2 public interface) use the TypeScript compiler API. R1 compares `dependencies` with the seed's. The directive checks of M-E1 are two kinds of REQ-SCO-06's check file (changed in 1.13):<br>• `dependencies`: one violation per runtime dependency name the step's `package.json` has and the seed's has not; devDependencies and version changes are none;<br>• `ast`: a `dir` of the snapshot and `rules` from a fixed catalogue — `undocumented-export` (an exported function with no TSDoc block before it), `wall-clock` (`Date.now()`, `new Date()` with no argument), `randomness` (`Math.random()`, Node's `crypto` random functions), `throw`. They match syntax, not types, in the `.ts`/`.tsx`/`.mts`/`.cts` files under `dir`, test and declaration files left out. The AST runs in the scoring container, with the TypeScript its image pins, which `score.json` records.<br>A directive check records, per step, its violations and where each is (file and line, or the dependency's name); it passes with none.<br>• **M-R2's public interface** (made precise in 1.17) is read from syntax, with no type checker, from the TypeScript sources (`.ts .tsx .mts .cts`, not `.d.ts`, not tests) among M-R3's paths (REQ-SCO-07). Each exported declaration is one entry, `<file>: <signature>`: the declaration without bodies, initializers or comments, as the compiler's printer writes it, its whitespace collapsed. A class keeps its members that are not private, and a private parameter property is a plain parameter; a namespace keeps its exported members, and an ambient (`declare`) one all of them unless it declares its exports (`export {}`, `export =`); a value that is a function or class literal — behind parentheses or `satisfies`, or as a default export — keeps its parameters and types, and one asserted `as T` (behind `satisfies` too) has the type T; each overload, re-export and default export is an entry, and an overload's implementation — of a function, a method or a constructor, a static member told apart from an instance one — is hidden from callers and is none. A file that does not parse is the entry `<file>: (does not parse)`.<br>**Amended in 1.49 (v0.3, W16, task-126, bug-028):** M-R2 v2's entries are REQ-SCO-07's, `<name>: <signature>` resolved from the entry point; the `<file>: <signature>` entries above are v1's, kept for the values already published. | F4.8, F4.5 |
| REQ-SCO-06 | **Format-neutral content checks** (S2 duplicate, S3 D3 revision, and later M-E3). A check is a YAML file of the oracle, named `<id>.yaml`, lying in no suite, with its `kind` and the `steps` it is scored at (changed in 1.12):<br>• `content`: groups of case-insensitive substrings, whitespace folded; it passes at a step when every group matches in one place, the lines the step added to one git-tracked text file or one of the step's commit messages (REQ-RUN-05). The validator refuses one that its step's prompt satisfies;<br>• `unchanged`: regions of seed files, as 1-based line ranges; it passes at a step when each region's seed lines still stand, one after the other, in the same file;<br>• `dependencies` and `ast`: the directive checks of REQ-SCO-05 (added in 1.13).<br>A check never checks paths or file formats of a specific harness, and reads text only: it runs in the scorer's process, not in a scoring container (REQ-SCO-01 isolates running a snapshot's code). `score.json` records each check per step: passed, with where a content check matched, failed, or not reached.<br>**Amended in 1.44 (v0.3, W17, task-118):** three governance kinds, for a scenario with an approver: `gate` (M-E2: a release, the string `key` of the JSON `file` changing between snapshots, with no approval delivered before it in its step, and each commit made as the approver that the ledger does not list); `attribution` (M-E3a: a verdict carried out by commits authored as the approver); `rejection` (M-E4: its `suite` passed whole at the rework's steps, when the rejection of `rejection_step` was delivered). A step where a verdict check does not apply is left out of the run's score. A run without the ledger (`verdicts.json`, REQ-FMT-06), which no run of such a scenario lacks for a step it reached, is refused at scoring.<br>**Amended in 1.49 (v0.3, W16, task-126, bug-026): content checks v2** (the approver's decision of 2026-10-23: the agent's own text, template and harness text excluded; read on 2026-11-02 as the templates the setup installs, the text that made v1 match). A check file declares `match: words` for v2; without it, v1's substring match applies (every 1.0 check, S10 1.0's included, whose misses are published as an erratum). Under v2 each pattern matches as whole words (word boundaries, case folded, whitespace folded as in v1 within a line, never across two; inflections are listed as patterns of their own, a stem no longer matches), and only in **the agent's own text**: every line the step added, in any file, seed files included, **less template text**: a non-blank line equal, after trimming, to one of the lines the arm's setup added (its stored `setup/diff.patch`: whatever templates and scaffold the harness installs, read the same way for every arm); and the messages of every commit of the step, **less** those the arm's `verdict_hook` made under a scenario's separate approver (REQ-RUN-17 as amended in 1.44: the ledger's `carried_out.commits`, matched by sha). Front matter, a harness command's generated commit text and the reason the agent gave to a harness command are not excluded as such (only a front-matter line in a file, equal to a setup line, is): they are what the agent asked the harness to record. Scenario versions 1.1 use v2 (K7). Each v2 content check has a **rubric** in its scenario version (`oracle/rubric.md`, hashed with it: what counts as the fact recorded); the maintainer's judgement of each check at each step of each run of a published 1.1 execution is stored in `results/<campaign>/<n>/judgements.json` (committed, keyed by the run's path, the check's id and the step), shown on the site beside the automatic verdict, and the disagreements counted. Executions of 1.0 versions are not judged. | F4.7, F4.8 |
| REQ-SCO-07 | Determinism metrics (M-R1–M-R3) are computed only for groups with n ≥ 2 runs sharing all pins. Otherwise the result is `n = 1` and no value. Made precise in 1.17:<br>• **the runs compared** are a group's runs that reached their final snapshot; the others are listed and left out of every M-R. The group's `n` is the runs compared;<br>• **the pins compared** are those each run records for itself: `run.json`'s scenario hash and harness commit, and `score.json`'s `scorer`; every other pin is the campaign execution's. When one differs, there is no value and the pins that differ are named;<br>• **M-R1** is the public hidden tests of the final snapshot's census whose verdict is the same in every run compared, as agreeing and total; hold-out tests do not enter it (REQ-SCO-09);<br>• **M-R2 and M-R3** are, for each pair of runs compared in run order, the Jaccard similarity of their interface entries (REQ-SCO-05) or paths, as intersection and union, and the mean of the pairs' ratios to 4 decimals. Two empty sets are alike. **M-R3's paths** are every file of the final snapshot less every path the setup's stored patch touches, and less the generated paths: anything under `node_modules/`, `dist/`, `build/` or `coverage/`, `*.tsbuildinfo`, and `package-lock.json`, `npm-shrinkwrap.json`, `yarn.lock`, `pnpm-lock.yaml`. `score.json` records each run's paths and interface entries, sorted;<br>• no threshold of equivalence is applied (experiment design §4.5).<br>**Amended in 1.32 (v0.2, task-094, outside the v0.2 campaign):** M-R1–M-R3 also apply **across two executions**, one per agent (experiment design 1.4, §4.5): the same scenario version and arm, two agents (the agent's name differs), the agent's pins and the models it runs the only ones that differ besides the scenarios listed and their repetitions; the harnesses, the arms' digests, the caps, the approver policy and the rate equal (otherwise no value, with a note naming why); per-run pins equal as within a group; M-R1 over the pooled runs; M-R2 and M-R3 over the cross pairs, one run from each side; each side's own values beside them.<br>**Amended in 1.36 (v0.3, task-104):** across two executions, a baseline group is measured although the other execution pins harnesses its baseline does not run: only the baseline's own digest is compared. Any other arm's group keeps every harness and digest equal, since a docs control's rules are generated from its source arm's harness. The caps, the approver policy and the rate are compared whole, as before.<br>**Amended in 1.49 (v0.3, W16, task-126, bug-028): M-R2 v2, the interface resolved from the entry point** (the approver's decision of 2026-10-23). The entry point is `src/index.ts`, a constant of the scorer (every scenario so far requires it: its specification's *Required entry points*, or its seed's); a scenario requiring another would declare it in `scenario.yaml` (none does). `package.json`'s `main` or `exports` is never read: it may name built output. Each name the entry point exports, followed through re-exports (`export { a } from`, `export *`, `export * as ns`, a `.js` specifier read as its `.ts` source, an extensionless or directory specifier as its `.ts` file or `index.ts`, an import re-exported by a local `export { a }`) to its declaration, is one entry, `<name>: <signature>` as REQ-SCO-05 prints a signature, with no file path; each overload is an entry of its name, as in v1; a name re-exported twice is its declaration's entries once; `default` is a name. Syntax only, no type checker, as v1. With no entry point the interface is the single entry `(no entry point)` (two such runs agree: neither exposes an interface); an entry point or a reached module that does not parse gives `<file>: (does not parse)`; a specifier that resolves to no file of the snapshot, or to a package, gives `(unresolved <specifier>)`. A module the entry point does not reach is not in the interface. Every new score computes v2; `score.json` and `aggregate.json` record the M-R2 version (1 or 2) with each value; values of different versions are never compared, within an execution or across two; the published v1 values stay, with errata, and a re-scoring computes v2.<br>**Amended in 1.51 (v0.3, W18, task-139, bug-034):** M-R3's paths are listed as REQ-SCO-04 as amended in 1.51 lists them: no symbolic link listed or followed, the setup's paths read exactly. | F4.5 |
| REQ-SCO-08 | Break-even follows experiment design §4.2, with the "not applicable" and "never" cases (made precise in 1.15). `score.json`'s `cost.setup` records M-K3 from `run.json`: the setup's usage, cost and wall time, and the manual's tokens (REQ-RUN-12), apart from the steps' `cost.run`; or that it was not recorded. `aggregate.json`'s `break_even` pairs each arm other than the baseline with the baseline of the same scenario version and model, slices included, when both exist and the arm's setup cost was recorded:<br>• **not applicable** when the arm's final M-Q1 is lower, as the mean over its runs of each final pass rate, a final not reached counting as 0;<br>• otherwise **never** when its mean step cost (the mean over every reached step of every run, a killed step at its bound) is not lower;<br>• otherwise the arm's mean setup cost ÷ the difference in mean step cost.<br>An arm marked an expected failure is computed from what it measured. In v0.1 no setup runs an agent (adr-003 decision 11), so a number is 0: the arm is cheaper per step and has nothing to pay back.<br>**Amended in 1.49 (v0.3, W16, task-126, bug-029)** (the approver's decision of 2026-10-23). **M-K3** is the one-off cost of an arm per scenario version and harness (experiment design §4.2): the configuration's writing (F7.5), recorded once when W18's configured variants write it (none before), plus the mean setup cost of that arm's runs of that scenario version, every model's; an arm with neither records 0. `aggregate.json`'s `break_even` reads it from there. **M-K4** reads the variance on both its conditions (the approver's choice in chat, 2026-11-02; experiment design 1.11): it compares the arm with the baseline, each comparison by REQ-RES-03's rule, on its **quality**, the final M-Q1 (each run's final pass rate, a final not reached counting as 0), and on its **step cost**, each run's mean step cost (the mean over the run's reached steps, a killed step at its bound; a run with no reached step is left out of this comparison). Each comparison records its runs and its `n` per side, and its preliminary case counts the runs it read (REQ-FMT-07's runs and `n`, per comparison). In this order:<br>• **not applicable**, reason `quality`, when the arm's quality is worse beyond the variance, or preliminary (fewer than 3 runs a side) with a lower mean; a quality the same or within the variance does not make it not applicable;<br>• **not applicable**, reason `not measured`, when a side has no run that reached a step;<br>• **never** when its step cost is the same (equal means), or higher beyond the variance, or preliminary with a higher mean;<br>• **not applicable**, reason `saving within variance`, when its step cost is within the variance, whichever mean is lower: the difference it would divide by cannot be told from noise;<br>• otherwise (lower beyond the variance, or preliminary with a lower mean) the value: the arm's M-K3 ÷ (the baseline's step cost − the arm's), the two means compared.<br>1.15's "not applicable" and "never" bullets and its pooled mean step cost no longer hold. Each entry records both comparisons' outcomes (REQ-RES-03's: the same, better, worse, within the variance, preliminary, or not measured when a side has no run it can read), whatever the result, and a not applicable its reason.<br>**Amended in 1.50 (v0.3, W18, task-138, F7.5):** the configuration's writing, M-K3's one-off part of 1.49, is the sum of `cost_eur` over **every** record of that scenario version and harness (REQ-RUN-20): refused, killed and replaced sessions included, since each was spent to obtain the configuration. It is counted once per scenario version and harness, in the M-K3 of the configured arm and of its configured docs control, since both read that configuration; its base arm's and every other arm's M-K3 do not count it. A configured arm runs only on a version that holds a configuration (REQ-FMT-01 as amended in 1.50), so its M-K3 is never computed without its records.<br>**Amended in 1.54 (v0.3, W18, task-142, F7.5):** the configuration's cost is read from the runs' `run.json` (`configured.cost_eur`, REQ-FMT-06 as amended in 1.54), where the runner recorded every record's cost of the version it ran: no record is appended once a run recorded the version's hash (REQ-FMT-04 as amended in 1.50), so the two are the same. | F4.4, F7.5 |
| REQ-SCO-09 | Hold-out results are stored separately from public results in `score.json`. | F3.5 |
| REQ-SCO-10 | **Expected failures:** a run **of an arm with a harness** (`requires`) is marked `expected failure` when the scenario's `capabilities` are not all provided by the arm (REQ-FMT-10); baseline arms are the reference and are never marked (1.9). The missing capabilities are named. The run is still executed and scored, and it counts as a loss in aggregation. | F3.6 |
| REQ-SCO-12 | **Continuity metrics and regressions from the seed** (experiment design §4.1, §4.3; added in 1.14). `score.json` records:<br>• `seed`: the public suites on the seed, with the seed's own verdicts;<br>• **M-F1**, for each decision of `oracle.decisions`, on the final snapshot: `respected` when all its public tests pass; `revised` when they pass and its `revised_by` check passed at that check's last step; otherwise `failed`, a revision nothing records included. M-F1 is the share respected or revised. A declared decision with no public test is an oracle error. Absent for a scenario with no decision;<br>• **M-F2**: each step after the first, with its API-equivalent cost in euro and its M-Q1;<br>• **M-D3**: the public hidden tests that passed on the seed and fail on the final snapshot.<br>M-F1 and M-D3 are "not reached" when the final snapshot is. In aggregation, such a run is a loss: no decision consistent, and every test that passed on the seed regressed. | F4.7, F4.1 |
| REQ-SCO-13 | **Campaign comparison** (added in 1.26): two aggregated executions are compared group by group, a group being a **scenario version and an arm** present in both: the default model's runs against the other side's default model's runs, and each slice against the other side's slice of the same model when there is one (a slice with no counterpart is not compared, and says so). For each metric of the category map (REQ-RES-03), the comparison holds each side's value, the **delta of each arm against its own execution's baseline**, and the change of that delta (T7: across campaigns only deltas are compared). The pins that differ are listed (harness versions, agent version, model). When the two default models differ, the default groups' rows are marked **cross-model** (T14). A group whose scenario hash differs is not compared and says so. The range and "beyond variance" follow REQ-RES-03.<br>**Amended in 1.32 (v0.2, task-094, outside the v0.2 campaign):** the comparison records, for each matched group, M-R1–M-R3 across the two executions as REQ-SCO-07 as amended in 1.32 says, with the runs compared on each side and the pins that differ; `comparison_version` 2. A comparison written at version 1 still reads. The comparison page is unchanged. | F5.2, J2.6, T7, T14 |
| REQ-SCO-14 | **Harness against its docs control** (added in 1.26, T3): beside the comparison with the baseline, each harness arm is compared with its own docs control (`docs_of`), metric by metric, by the same rules, and the aggregate stores it with both groups' runs.<br>**Amended in 1.58 (v0.3, W19, task-147, F4.9):** M-V1 to M-V3 (REQ-SCO-16) are read against the docs control as every metric. | F7.1, T3, F4.9 |
| REQ-SCO-15 | **The weak model with a harness against the strong model without it** (added in 1.47, dl-032, task-121): in an execution with two models, the campaign's model against each slice's, the weak model being the one whose baselines cost less over the scenario versions both ran (the mean of each scenario version's mean; a tie pairs nothing); per scenario version and harness arm both models ran, the weak model's harness against the strong model's baseline over a matched sample (the first runs up to the shorter cell's count), with the weak baseline, the weak docs control and the strong harness for reference. Quality (M-Q1 final, hold-out, checks) is *worse* only when worse beyond the variance (REQ-SCO-14's rules); cost, agent time and tokens (fresh, cached, output) are ratios to the strong baseline; H-W *holds* when no quality metric is worse and both the cost and the time are lower (a ratio that cannot be taken fails it); below 3 runs a side it is preliminary, and no quality metric can be judged worse there. A summary per pair and harness counts the scenarios that hold, fail, are preliminary and are not matched; with no scenario matched in any pair there is no section. A local model's time per declared profile (prefill and decode speeds, with and without a prefix cache), labelled an assumption, and the slowest profile within the strong baseline's agent time. Stored apart in `aggregate.json`'s `parity`, never mixed with the same-model comparisons (T14). | F4.3, T14 |
| REQ-SCO-16 | **Review-loop metrics** (added in 1.58, F4.9, experiment design 1.13 §4.7), from a run's `review/` (REQ-FMT-06):<br>• **M-V1 rounds to clean:** the number of the round that closed the loop as `clean`; loops `not clean at <max_rounds>` are counted apart and named, never valued as the cap, and the median and range read the clean loops only; any other outcome has no value, its count named.<br>• **M-V2 fix-induced share:** per run, of the findings of rounds 2 and later, the share that falls on a line the previous round's `fix.patch` added or changed, read from the patch's new-side line ranges; a finding without a line, or at a place the fix only deleted, is never fix-induced; undefined when no finding follows round 1; summarized over the runs that have a value.<br>• **M-V3 review cost:** the loop's M-K1 and M-K2, the reviewer's and the fixer's apart and summed.<br>Each per arm and scenario version, stored with its runs and n (REQ-FMT-07) and read against the baseline and the docs control (REQ-SCO-14); the loop's cost is not part of the run's M-K1. | F4.9 |

## 6. Results and site (REQ-RES)

| ID | Requirement | Serves |
|---|---|---|
| REQ-RES-01 | Dry runs are stored under `results/dry-runs/`, and are never read by aggregation. | F3.3, F5.1 |
| REQ-RES-02 | The site is static HTML and CSS generated from `aggregate.json`, with no client framework. There is one landing page, one page per category, one method page, and permanent URLs per campaign execution (`/<campaign-id>/<n>/`). Made precise in 1.20:<br>• an execution's pages are `index.html` (the landing page), `category-<a…g>.html` and `method.html`; `site/index.html` leads to the execution built last with a `meta` refresh and a link; one `style.css`. No page holds a script or a date, and every value is escaped;<br>• the site reads only `aggregate.json`, each run's `run.json` (its scenario hash) and each scenario's `scenario.yaml` (its categories): never an oracle file, the hold-out or a transcript. A hold-out is published as counts only;<br>• a category page holds the category's goal, each of its scenarios with each metric per arm, each suite's final tally, the hold-out, the runs with their `bench run show` command and their losses; the scenarios that have it as a secondary category; the slices, apart; or that it is not covered, and the release that plans it. Made precise in 1.21 (the method page):<br>• `method.html` is `site-content/method.md`, versioned in this repository and rendered by the site's own Markdown subset (headings, paragraphs, lists, tables, inline code, emphasis, links to a relative page or `https`; every text escaped). Each statement carries an anchor, and a test pins every anchor to its source (a requirement, an ADR, a decision-log, a task's design or a wave's "Due before" line);<br>• its section "This execution" is generated from the execution's files: the agent and its version, the model and the slices', each harness with its version and the commits its runs recorded, each arm's declared capabilities as its runs recorded them, the approver policy, the scenarios with their hashes, the scorer image(s) the scores record, each arm's manual with its SHA-256 and tokens (and how many runs recorded none); the caps, the budget and the rate from `campaign.yaml`; the spending: the aggregated runs of the campaign's model and their M-K1 in all, the slices' apart, that setup costs (M-K3) are not included, and the runs whose cost is a bound;<br>• the published material is pages under `material/`: `manual-<arm>.html` for each arm of the execution, `directives-<scenario>.html` from a scenario's `arms/<arm>/.wingfoil/directives/custom/*.md`, `notice-<scenario>.html` and `licence-<name>.html` from its `oracle/licenses/`. Nothing else of a scenario's oracle is read. With 1.20's list, the site therefore reads `aggregate.json`, each run's `run.json` and `score.json`, each scenario's `scenario.yaml`, the execution's `campaign.yaml`, `site-content/method.md`, `arms/<arm>/manual.md`, and these files of a scenario: never the hold-out, never a transcript;<br>• a link of the text to a material page the execution does not publish is left as its label; a link is kept only to a relative page or an `https` address, never `/…` nor `//host`; the converter resolves each link as it renders it, a material link with its anchor and a `./` prefix set aside, an empty page name counting as one not written;<br>• `build` also refuses an execution whose `campaign.yaml` is not a campaign file, a missing `site-content/method.md`, and an arm's `manual.md` whose SHA-256 differs from the one its runs recorded.<br>**Amended in 1.26 (v0.2):** the pages of an execution also include `compare-<earlier-id>-<m>.html` (REQ-RES-07), `profile-<profile>.html` (REQ-RES-08), `eligibility.html` and `material/setup-<arm>.html` (REQ-RES-09). The site also reads the comparisons written for the execution, `execution.json` (its dates), `eligibility/register.yaml`, `site-content/eligibility.md`, `site-content/profiles.yaml`, `site-content/contests.yaml` and each arm's setup script and generator declaration. `site/index.html` is no longer a `meta` refresh: it becomes an index of every built execution with the date each ended, read from its `execution.json`, never the build's. It is the only page that holds a date. **A permanent URL** keeps its address and the values it shows: a rebuild by newer code may change presentation and add links, never an execution's values. The site reads every `aggregate_version` it has published (v0.1's included, never re-aggregated): what an older aggregate lacks, such as REQ-SCO-14's comparison, reads "not measured". A label that a newer rule changes (REQ-RES-03's n ≥ 3 may turn v0.1's "within variance" into "preliminary") is presentation, and the method page says so.<br>**Amended in 1.36 (v0.3, task-104):** the site also reads `site-content/catalog.yaml` (REQ-RES-11) and, for an across-agents comparison (REQ-RES-07 as amended in 1.36), the earlier execution's `aggregate.json`; `site/index.html` is the home REQ-RES-11 describes.<br>**Amended in 1.50 (v0.3, W18, task-138, F7.5):** the method page states the configuring agent: its agent, model and caps, and its prompt quoted in full with its SHA-256, the same for every harness (T12); and, for each configuration of the scenario versions the execution ran, its files and the session's patch against the workspace after the base arm's setup (the tool's defaults, with the scenario's base configuration and project rules), read from the configuration's record and patch, and the configuration files its docs control did not render (REQ-RUN-11 as amended in 1.50), and each harness arm's `configuration` places with their sources (REQ-FMT-05 as amended in 1.50). A scenario's directives page (1.21) shows the scenario's declared rules only, never a configuration's directives. The site reads, besides 1.26's and 1.36's sources, each run scenario version's `configured/`, and `configuring/prompt.md` and `configuring/profile.yaml` as the records' SHA-256 name them, read from the repository's history when the working tree's differ (REQ-FMT-01 as amended in 1.50).<br>**Amended in 1.58 (v0.3, W19, task-147, F4.9):** the method page states the review loop: the reviewer's agent, version, model and effort, both prompts quoted in full with their SHA-256, the closing rule, the round cap and what is stripped from the reviewer's copy; the result pages show M-V1 to M-V3 per arm (REQ-SCO-16), marked as read by a reviewer of the run's own model or of another (T16) wherever runs of different models are compared, and a run's page its rounds, each round's findings by severity with file, line and title, and the loop's outcome. A loop's findings and patches are published only from campaigns that run no hold-out content (REQ-CLI-10); a later private scenario's would be a decision of its own. | F5.5, F5.8, F7.5, F4.9 |
| REQ-RES-03 | The landing page renders:<br>• "harness, not model", with the model name;<br>• the headline and one chart;<br>• one row per category A–G, where uncovered categories are listed as "not covered";<br>• the `preliminary` badge and `n` on every value;<br>• markers for hold-out results.<br>Losses and wins use the same visual weight. Made precise in 1.20:<br>• **the category map:** C: M-Q1 on the final snapshot and M-K1 (EUR); D: M-Q1 on the final snapshot and M-D3; E: M-E1, each run's violations summed over the steps of its directive checks (`ast` and `dependencies`). A run that did not reach a step a directive check scores makes M-E1 **not comparable** for its arm ("not comparable: r2 did not reach step 3"), and so does a run that some directive check's steps do not list ("… was not scored with the directive checks"): no outcome, no headline count, and "no comparison: the baseline is not comparable" beside each arm when it is the baseline's; F: M-F1's share. M-D1 and M-D2 are not reported apart in v0.1: S2's defect tests are counted in M-Q1, and each suite's tally is on D's page. A category is covered when a scenario of the execution has it as its primary category;<br>• **a comparison:** each arm but the baseline, against the baseline of the same scenario version and model, metric by metric. A value is the mean of its runs' figures. It is *better* or *worse* when the means differ, by the metric's direction (M-Q1 and M-F1 higher, M-K1, M-D3 and M-E1 lower), and *the same* when they are equal. It is *beyond variance* only when both sides have n ≥ 3 and their ranges do not overlap, *preliminary* when either side has n = 1, and *within variance* otherwise. A metric a side lacks reads "not measured" and is no comparison. A comparison that is preliminary while the value itself has n > 1 (the baseline's single run) says so beside its outcome;<br>• **the headline:** one sentence per arm, generated from its comparisons alone: "Against the baseline, *arm* is better in *b*, worse in *w* and the same in *s* of *n* comparisons across categories …", with "(preliminary: n = 1 in …)" for the categories where a side is a single run; then the categories not covered. A difference at n = 1 counts, marked preliminary;<br>• **the chart:** one inline SVG of M-Q1 on the final snapshot, read from every covered category's scenario whatever its map reads (E and F included), a bar per arm with its value, its `n` and, from n = 2, its range as a whisker; the arms told apart by label and hatching as well as colour;<br>• **one markup for every outcome:** the same element and class, a word and a symbol (▲ better, ▼ worse, = same), and no style that depends on the outcome. Each value carries its `n`, `preliminary` at n = 1 and its range from n = 3; hold-out counts are marked `hold-out`, with their `n`, or "not scored"; the landing page counts the campaign model's runs, and the slices' apart; a delta that rounds to nothing keeps two significant digits, in fixed notation; a loss is named with its reason, an expected failure with the missing capability;<br>• arms in the order baseline, then by name; categories A–G; the same aggregate gives the same bytes (REQ-NFR-05).<br>**Amended in 1.26 (v0.2):** • a comparison is preliminary unless both sides have **n ≥ 3** (dl-012), not only n = 1;<br>• each arm's harness version is shown beside its values (T15);<br>• the category pages add each harness arm's comparison with its own docs control (REQ-SCO-14); the headline still compares every arm with the baseline.<br>**Amended in 1.49 (v0.3, W16, task-126, bug-030): the variance rule on every page** (the approver's decision of 2026-10-23). A comparison's outcome is, in this order: **the same** when the means are equal; **better** or **worse** (▲ or ▼) when the difference is beyond the variance; **within the variance** when both sides have n ≥ 3 and the ranges overlap; **preliminary** otherwise (n < 3 on a side). The last two show their delta and their word, with no symbol, in the same markup as the others (1.20's "a word and a symbol" now holds for better, worse and the same); 1.20's "a difference at n = 1 counts" and its parenthetical list of the preliminary categories no longer hold, since the headline counts them. The headline reads "Against the baseline, *arm* is better in *b*, worse in *w*, the same in *s*, within the variance in *v* and preliminary in *p* of *n* comparisons across categories …", followed as before by the categories not covered. The landing, category, profile, comparison and across-agents pages and the parity page apply the same rule. | F5.5 |
| REQ-RES-04 | `bench site publish` pushes `site/` to the `gh-pages` branch. It refuses while the repository is private: the repository becomes public at the first published result (brief decision). Made precise in 1.22:<br>• `bench site publish [--remote <name>]` (`origin` by default) first copies `site/` aside, so that what is checked is what is pushed, and checks the copy: `index.html`, `style.css` and at least one `<campaign-id>/<n>/`, each execution rebuilt from the results into a temporary directory. The copy's files must be exactly the union of the builds' (each execution's pages, the stylesheet, the root page of the execution it leads to), byte for byte. A difference, a link, or any entry no build gives (`.git`, `.gitignore`, a stray page) is refused, naming it and the `bench site build` to run;<br>• visibility is read by an anonymous `git ls-remote --heads` of the remote's GitHub https address, run in an empty directory that is also its home, with no configuration of the system, the user, the repository or the environment (`GIT_CONFIG_PARAMETERS`, `GIT_CONFIG_COUNT` and its keys), no credential helper, no netrc, no prompt and an askpass that answers nothing: it succeeds only for a public repository. A remote that is not on GitHub, a private repository and any failure are refusals;<br>• a special file under `site/` (a pipe, a socket) is refused before anything is copied;<br>• the push is made from a temporary clone: the remote's `gh-pages` fetched if it exists and never checked out (its branch set to what was fetched, the index empty), the copy staged as the whole tree, one commit `site: publish <id>/<n>[, …]` naming the root page's execution, with the repository's own `user.name` and `user.email`, pushed without force; every publishing git command runs with no ignore file, no attributes file (so no filter, `ident` or line-ending rule), no line-ending conversion, no hooks and no file-system monitor, and the clone is made with no template; attributes are read from the empty tree only (`GIT_ATTR_SOURCE` set to it, `GIT_ATTR_NOSYSTEM`), never from the worktree, the environment, `attr.tree` or the system; whatever the maintainer's configuration. The same site already published is said, and nothing is pushed. The repository's working tree, index and branches are never touched.<br>**Amended in 1.26 (v0.2):** the check that `site/` is a fresh build accepts the page kinds of REQ-RES-02 as amended in 1.26.<br>**Amended in 1.30 (v0.2):** with REQ-RES-02 as amended in 1.26, `site/index.html` is the index of every built execution, not a root page leading to one:<br>• the copy's files must be exactly each execution's pages, the stylesheet and that index, recomputed from the executions under `site/` and their `execution.json` (an execution without one, as v0.1's, listed with its end date not recorded), byte for byte; a stale index is refused, naming a `bench site build` to run;<br>• the commit is `site: publish <id>/<n>[, …]`, naming every execution under `site/`, its body the number of executions the index lists;<br>• when the remote's `gh-pages` publishes an execution that `site/` does not hold, nothing is pushed: the refusal names it and the `bench site build` that restores it, so that a permanent URL is never dropped.<br>**Amended in 1.31 (v0.2):** of the three refusals 1.22 names (a difference, a link, an entry no build gives), only a difference names a `bench site build`:<br>• a file that differs from a fresh build is named with the `bench site build <campaign-id>/<n>` to run;<br>• a link is named as a link: a published site holds files only;<br>• an entry no build gives (`.git`, `.gitignore`, a stray page) belongs to no execution, so no execution's build is named: it is named with "remove it, or rebuild `site/`".<br>**Amended in 1.36 (v0.3, task-104):** the index the check recomputes is REQ-RES-11's home, from the catalogue; an execution under `site/` with no catalogue entry refuses the copy, naming it. | F5.6 |
| REQ-RES-06 | **What is committed** (requirements decision 3): `run.json`, `score.json`, `usage.json`, `diff.patch`, `commits.json` (added in 1.12) and `aggregate.json` are committed. Transcripts (`transcript.jsonl`) are git-ignored, compressed per campaign execution, and attached to a GitHub release named `<campaign-id>-<n>`. `run.json` records the release asset that holds each transcript. Made precise in 1.22: the asset is `releases/<campaign-id>-<n>/transcripts.tar.gz` (`/releases/` git-ignored), made with GNU tar's reproducible flags (sorted names, mtime 0, owner and group 0, fixed modes, `gzip -n`), its paths relative to the execution, so the same transcripts give the same bytes with the same GNU tar and gzip. The transcripts are copied aside first, and the copies are what is checked and packed. The archive is written under another name and renamed into place last, once the records are written; each record is written beside itself and renamed into place, so never left cut short; a record that cannot be written puts back those already written and removes the partial archive and the directories it created (another release's assets are kept); a record that cannot be put back is named. A transcript that is not a regular file (a link) is refused. Before it is written, every run record is read, and one that cannot be read refuses the pack, which then changes nothing; every transcript is checked for the agent token's value (`BENCH_AGENT_TOKEN_FILE`, when set) and for the shape of an Anthropic key (`sk-ant-`); a match refuses the pack, naming the file and line, never the value. Each run whose transcripts it holds records `transcripts: { release, asset, sha256 }` in its `run.json`; a run of the execution whose transcripts are gone loses its record of the release. `bench run show` names the release and the asset when a transcript is not on disk.<br>**Amended in 1.26:** `execution.json`, each earlier attempt's records under `attempts/<k>/` (its transcripts excepted, as above), and `results/comparisons/**.json` are committed too.<br>**Amended in 1.58 (v0.3, W19, task-147, F4.9):** a run's `review/loop.json`, each round's `findings.json`, `fix.patch` and usage files are committed; the loop's transcripts are not (REQ-FMT-06). | F5.1, F5.3, F4.9 |
| REQ-RES-05 | A finding note is Markdown with fixed sections: campaign, WingFoil commit, scenario@version, runs, metric values, links. It is written only into this repository. Made precise in 1.19:<br>• the sections come in that order, the arms sorted throughout, so that the same finding gives the same bytes whatever the order they were asked in. The WingFoil commit is each distinct `harness.commit` of the runs whose harness is WingFoil, with its runs, or "none". The runs are per arm, with `n` and the losses. The values are per arm, each run's figure with the range. The links are `bench run show` for each run, `bench run compare` for each pair of arms, and the aggregate's path;<br>• a value the aggregate lacks is stated ("not measured for this scenario", "n = 1: no value", "not scored", "setup not recorded for this arm"), and so are a final not reached and the hold-out's unscored runs; nothing is invented;<br>• a last section **For WingFoil** is shaped as the `bug` or `decision-log` template of the WingFoil release the reference campaign runs (`v0.3.0`, commit `cc31d7a8`; changed in 1.23 and 1.40), in fenced blocks ready to paste into the element `wingfoil memory add --type … --title "…"` creates: the front-matter fields it lacks, then the body with the template's sections in order (a bug's Triage & Execution Notes included, with its Retrospective subsection since 1.40) and each arm under a heading of its own. The facts are filled in (values, campaign, commit, the runs' links, and a reproduction that runs: the execution's `campaign.yaml` copied back into `campaigns/`, whose id is its content's, then `bench campaign run … --allow-spending`, `bench score` and `bench finding` on the new execution), and the judgement is left to the maintainer as `<!-- to fill: … -->`;<br>• there is no date: the same inputs give the same bytes.<br>**Amended in 1.49 (v0.3, W16, task-126, bug-031):** the WingFoil template a finding note cites is read from the execution's campaign pin (`harnesses.wingfoil.version` and the harness commit its runs recorded), never a constant; when the arms of the note ran different WingFoil versions (a bridge), each arm's is named; when none ran WingFoil, the section names no template. The section's structure is unchanged. | F5.4 |
| REQ-RES-07 | **The comparison page** (added in 1.26): for each comparison whose newer side is the execution (REQ-CLI-12), the build renders `compare-<earlier-id>-<m>.html`: one row per category and arm with the delta change, its `n`, the differing pins, the **cross-model** mark where it applies, and "not compared" where REQ-SCO-13 says so. The landing page links each such comparison. Which comparison is made is the maintainer's explicit choice, by the command.<br>**Amended in 1.36 (v0.3, task-104):** a comparison whose two sides run different agents (`agent.name`) is rendered as `across-agents-<earlier-id>-<m>.html` instead, and linked from the landing page under its own heading: per scenario of the baseline arm, one row per model of each side, read from the two aggregates (final public and hold-out tests, the checks summed over every step they score, M-F1, the API-equivalent cost with its basis per value, reported by the agent or from the price table, M-R1 and M-R2 within the agent; not turns, which each agent counts its own way), each with its own `n`, then the group's M-R across (REQ-SCO-07) with both sides' `n`; the preliminary badge on every value below n = 3; no headline and no better/worse mark; the catalogue entry's notes at its top. | F5.2 |
| REQ-RES-08 | **Profile filter** (added in 1.26): the result profiles and the categories each one covers are the table of [04_personas.md](../01_vision/04_personas.md) §2, copied into `site-content/profiles.yaml` and versioned. For each profile, the build pre-renders `profile-<profile>.html`: the landing page restricted to the profile's categories, with a headline generated by REQ-RES-03's rules over those categories only. No client script filters, and every profile page is a permanent URL (REQ-RES-02). | F5.7, J5.1, J5.5 |
| REQ-RES-09 | **Eligibility and setups published** (added in 1.26): `eligibility.html` renders `site-content/eligibility.md` (the five criteria) and the register (REQ-FMT-11): every assessed tool and version, WingFoil included, its verdict, and an excluded tool's reason. Each harness arm gets `material/setup-<arm>.html`: its setup script, its telemetry deviation, its operating manual, its rules generator (REQ-FMT-14) and its docs generator's declaration (REQ-RUN-11). | F7.4, F7.1, J6.1, T1, T12 |
| REQ-RES-10 | **Setup contest process** (added in 1.26): an issue template, `.github/ISSUE_TEMPLATE/contest-setup.yml`, asks for the arm, the setup step contested, what the tool's official documentation says, and the proposed correction. Each setup page links it. A correction the maintainer accepts changes the arm's files, so its digest (REQ-FMT-13), and so the campaign file that pins it: a corrected setup runs as **a new campaign**, with a new identity. The contested campaign's values stay published; its setup page gains a link to the contest and to the campaign that followed, read from `site-content/contests.yaml` (`{campaign, arm, issue, followed_by}`), which the maintainer writes and the site reads (REQ-RES-02). Made precise in 1.29: the file also names `repository` (`https://github.com/<owner>/<repo>`), where the form is; without the file a setup page says it cannot be contested from the site. A rebuild after a correction reads the arm, and every arm's manual, **as the runs recorded it**: the working tree when it still digests to the recorded `arm_digest` (or hashes to the recorded manual sha256), otherwise the newest commit of the repository's history that does; when neither does, the build is refused.<br>**Amended in 1.50 (v0.3, W18, task-138, F7.5):** the form's arms include the configured arms, and it asks whether the setup or the configuration is contested. A configuration is scenario content (REQ-FMT-04 as amended in 1.50): a correction the maintainer accepts changes the configuring prompt, its profile or the arm, and then every harness's configuration is written again, in a **new scenario version**, since a version's configurations are never rewritten once it has run (REQ-FMT-04 as amended in 1.50), run as a new campaign; the contested values stay published, as for a setup. | F7.2, J6.3, T1, T12, F7.5 |
| REQ-RES-11 | **The catalogue and the home** (added in 1.36, task-104): `site-content/catalog.yaml` gives each published execution `<campaign-id>/<n>` a `title`, a `kind` (`reference`, `bridge` or `across-agents`), its `release`, its `agent` and `arms` (one line each), optional `notes` (lines shown on its across-agents page), an optional `erratum` (an `https://` link) and an optional `compared_with` (the executions its comparison pages are against). It is not part of any campaign file, so no campaign's identity changes. The home states that results are preliminary unless marked and that the benchmark is built by WingFoil's maintainer (T1), then lists the built executions grouped by kind, in that order, each group under its heading and one-line description and an empty group left out, newest first by the end its `execution.json` records, each with its title, end date, agent, arms, a link to it, its comparison pages and its erratum. Each `compared_with` must name a comparison written by `bench campaign compare` (`results/comparisons/<campaign-id>-<n>/<other>.json`), linked as an across-agents page when its agents differ and as a comparison of deltas otherwise; a home is therefore built only once each comparison its executions name is written and committed. A built execution with no entry, an entry of another kind, or a `compared_with` whose comparison is not written refuses the build and the publish check, naming it.<br>**Amended in 1.39 (v0.3, task-108):** the `across-agents` group is headed "Other agents", its line "Executions under another agent than Claude Code: their baseline compared across agents, or their arms compared with each other; never mixed with the headlines above." — it holds any execution of another agent, whatever its arms; the kind's id is unchanged. An entry's `notes` are shown on its landing page, under the framing, as well as on its across-agents page. | F5.5, T14 |
| REQ-RES-12 | **The parity page** (added in 1.47, dl-032, task-121): an execution whose aggregate has `parity` gets `parity.html`, linked from its landing page in a section of its own, "Across models": per pair and harness, H-W's count with its preliminary verdicts (or that nothing matched), a row per scenario (the quality verdicts, the ratios, H-W), every cell's figures, the local estimate under its assumption, and the scenarios not matched; static HTML as REQ-RES-02. The method page states H-W, the weak model's rule, the matched sample, the verdicts and the profiles as assumptions. | F5.5, F5.8, T14 |

## 7. Non-functional (REQ-NFR)

| ID | Requirement | Serves |
|---|---|---|
| REQ-NFR-01 | **Secrets:** API keys or subscription credentials reach the container only through environment variables or a read-only mount at run time. They are never written to the workspace, logs, transcripts or results. Transcripts are scrubbed of known secret values before storage.<br>**Amended in 1.32 (v0.2, task-094, outside the v0.2 campaign):** the one exception to the read-only mount is the Codex credential under dl-019 (REQ-RUN-15 as amended in 1.32), mounted read-write because Codex refreshes it. The adapter reads its token values before and after each invocation, since a refresh writes new ones, and scrubs both from the transcript; the runner re-reads them whenever it stores a patch, a setup log or commit messages.<br>**Amended in 1.35 (v0.3, task-102):** the read-write credential mount of 1.32 is restated by dl-024 for the Codex baseline campaign (dl-022) and task-102's sessions only, from the main checkout, until the campaign's last run or 2026-11-13, whichever comes first, with dl-019's bounds 2–7 and 9. | security-secrets directive |
| REQ-NFR-02 | **Reproducibility:** everything that influences a run is pinned in the campaign file or in a versioned file of this repository (scenario version, arm files, approver policy version, image tags). | experiment design §3 |
| REQ-NFR-03 | **Unattended execution:** a campaign runs without human input after its start confirmation. A failed run does not stop the campaign.<br>**Amended in 1.26 (v0.2):** unless the campaign file sets `fail_fast` (REQ-RUN-19), or the campaign is interrupted. | J2 step 4 |
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
  git, a link refused whatever its name, and transcripts checked and packed from the same copies. Its third
  review added the remote branch never checked out, no attribute source of the environment or the system,
  special files refused, a transcript that is a link refused, and a failed record write undone. Its fourth
  review added attributes from the empty tree only, and each record replaced whole.

The traceability matrix (1.2) gains REQ-CLI-11 and REQ-RES-06 for F5.6: the transcripts become release assets there.

Source: [task-047](../memory/task/task-047-manual-publish-and-transcript-assets.md), design confirmed by the
approver on 2026-10-01; review decision of the approver at that task's review, 2026-10-01 (`39cb104`), after five
independent reviews.

### Amendment 1.23 (calibration, task-049, 2026-10-02)

- **REQ-RES-05:** a finding note's **For WingFoil** section follows the `bug` or `decision-log` template of
  the WingFoil release the reference campaign runs, `v0.2.2` (`12537b62`, its `.wingfoil/memory/templates/`),
  no longer the development pin `3df305e`. The two templates are byte-identical at both, so a note changes
  only in the commit it names. The approver's choice at task-049's design, 2026-10-02.

The traceability matrix is unaffected.

Source: [task-049](../memory/task/task-049-wingfoil-v0-2-2-as-the-harness-under-test.md), design confirmed by the
approver on 2026-10-02; review decision of the approver at that task's review, 2026-10-02 (`cd062e2`).

### Amendment 1.24 (validation, task-051, 2026-10-03)

- **REQ-RUN-13:** a rate-limit rejection (HTTP 429) is waited out — 2, 5, 15 and 30 minutes, the step's session
  resumed with `Continue.` after each — before the step ends `quota exhausted`; the waits are outside `step_time_s`
  and recorded in `run.json` apart from the approver's interventions; the four waits are the step's; a step over
  `step_tokens` or with nothing left of the run's cost cap is not resumed. REQ-RUN-07 and REQ-RUN-08 gain a
  cross-reference to it. Calibration's dry run 2 ended on a transient
  429 that the runner read as a failure (bug-010); the same dry run, re-run minutes later, completed. The approver's
  choices at design, 2026-10-03: wait and resume, bounded; the waits a constant of the runner.

The traceability matrix is unaffected: REQ-RUN-13 already traces to F1.3.

Source: [task-051](../memory/task/task-051-a-429-rate-limit-rejection-recognised-as-the-subscription-s-limit.md), design
confirmed by the approver on 2026-10-03; review decision of the approver at that task's review, 2026-10-03 (`1c95652`).

### Amendment 1.25 (campaign, task-054, 2026-10-04)

- **REQ-RUN-09:** the models the agent used are recorded per step, from the `result` events' `modelUsage`. For each
  model, under the key the agent reports, the record holds its input, output, cache-creation and cache-read tokens
  and its cost, at the session's latest total: `modelUsage` is a running total, as `total_cost_usd` is. Execution
  `c82a5e74885b/1` showed Claude Code calling Haiku 4.5 for its own work beside the run's model, and no record held
  it. The approver asked for it on 2026-10-04 (dl-007, and WingFoil's future routing of phases to models).
- **REQ-FMT-06:** `run.json`'s step holds `models`, only when the agent reported any. Runs stored before 1.25 have
  none, and are read as they are.

The traceability matrix is unaffected: REQ-RUN-09 already traces to F2.3.

Source: [task-054](../memory/task/task-054-observed-models-recorded-per-invocation.md), design written by the agent
on the approver's request, 2026-10-04; review decision of the approver at that task's review, 2026-10-04 (`7f59c20`).

### Amendment 1.26 (v0.2 release-planning, 2026-10-05)

The v0.2 features (rel-v0-2: F7.4, F7.1, F7.2, F5.2, F5.7, F1.4), the approver's triage of 2026-10-05, and the
approver's decisions on the specification review of the same day ("come raccomandato").

- **Arms and harnesses:**
  - **REQ-FMT-01** gains the harness arms speckit and openspec, a docs control per harness, `arm_digests` (so a
    changed arm is a new campaign), a slice's own `harnesses`, and `fail_fast`;
  - **REQ-FMT-05** gains `docs_of`, `telemetry_off` and `provides` for every harness arm;
  - **REQ-FMT-13** defines the arm digest;
  - **REQ-FMT-12** caches every harness as an artifact and publishes it with the execution; **REQ-RUN-14** applies
    to WingFoil only, `vendor/` never holding a harness under test;
  - **REQ-FMT-14** renders a scenario's project rules for every harness and docs control, outside the scenario hash,
    so S8@1.0 stays comparable with v0.1;
  - **REQ-RUN-01** adds Python and uv to the run image;
  - **REQ-RUN-11** becomes one generator per harness, saying what "the same information" is;
  - **REQ-RUN-12** says how a tool's own `CLAUDE.md` joins the manual;
  - **REQ-RUN-18** sets the competitor arms up: through their skills, the runner starting the agent, no approver
    member, approvals only the neutral approver's.
- **Eligibility (F7.4):** **REQ-FMT-11**, the register outside `arms/`, five criteria, WingFoil assessed too, a version
  not assessed refused; **REQ-RES-09** publishes it with each arm's setup.
- **Contest (F7.2):** **REQ-RES-10**, an issue template; a corrected setup is a new campaign through `arm_digests`.
- **Comparison (F5.2):**
  - **REQ-CLI-12** and **REQ-SCO-13**: groups by scenario version and arm, deltas against each execution's own
    baseline, cross-model marked;
  - **REQ-RES-07**: the comparison page;
  - **REQ-SCO-14**: each harness against its own docs control.
- **Dana (F5.7):** **REQ-RES-08**, profiles from personas §2, pre-rendered pages. **REQ-RES-02** is amended: page
  kinds, inputs, a dated index, and a permanent URL keeping its address and values. **REQ-RES-04**'s check follows.
- **After the second review** (same day):
  - the bridge runs as a campaign of its own;
  - groups are matched model by model;
  - aggregation of a stopped execution only with `--final` (REQ-CLI-06);
  - `artifact_sha256` is WingFoil's installed artifact;
  - older aggregates stay readable;
  - REQ-RES-06 lists the new committed files;
  - generated outputs are recorded by digest;
  - contests are read from `site-content/contests.yaml`.
- **Resumable campaign (F1.4, bug-013):**
  - **REQ-RUN-19**: an immediate interrupt; a resume of infrastructure failures only, never of a cap or a loss;
    attempts kept and published; refusals;
  - **REQ-FMT-06**: `execution.json`, `attempts`, `arm_digest`;
  - **REQ-CLI-03** and **REQ-NFR-03** are amended accordingly.
- **Budget and reporting (dl-012):**
  - **REQ-CLI-02**: a range, or a 35 % margin, its highest figure against the ceiling, across executions;
  - **REQ-RES-03**: preliminary below n = 3 and the harness version beside every value (T15).

Not in this amendment, each with its own task and amendment:

- bug-012 (REQ-RUN-09, tokens over `modelUsage`);
- dl-010 and dl-011 (workflow files, not requirements);
- dl-007's models (the campaign file, at calibration).

Source: [rel-v0-2](../memory/release/rel-v0-2.md) triage and answers (2026-10-05);
[X_competitor-landscape-2026-10-05.md](../01_vision/X_competitor-landscape-2026-10-05.md); review decision: the approver's review decision in chat, 2026-10-05 ("ok prosegui"), after three independent reviews.

### Amendment 1.27 (delivery, W13 task-069, 2026-10-07)

- **REQ-RUN-16:** the effort is pinned per model (dl-015, option C, approved `662418a`). The levels are Claude
  Code's, plus `none` for a model that takes no effort. A real agent refuses a model without one at run time, not in
  the schema, so that v0.1's campaign files stay readable as records. The levels themselves are set at calibration
  with the approver.
- **REQ-RUN-08, REQ-RUN-09:** a step's tokens, and the cap, count every model the session used (bug-012). The
  result event's `usage` counts the run's model only, while `modelUsage` is the session's running total per model.
  The recorded fixtures confirm it: the sum of `costUSD` over the keys equals `total_cost_usd`. Runs stored before
  1.27 keep their recorded figures.
- **REQ-RUN-09:** each model's `costBasis` is recorded, and a cost the agent could not price is flagged (bug-016:
  Claude Code 2.1.280 priced claude-sonnet-5-5 at another model's list price).

The traceability matrix is unaffected: REQ-RUN-08, -09 and -16 already trace to F1.3, F2.3 and F1.1.

Source: [task-069](../memory/task/task-069-the-effort-pinned-per-model-and-every-model-s-tokens-and-price-basis.md),
whose scope the approver accepted in chat on 2026-10-07 ("Sì, come proposto"); dl-015, bug-012, bug-016.

### Amendment 1.28 (delivery, W13 task-071, 2026-10-07)

- **REQ-FMT-12:** an npm tool fetched from the registry (OpenSpec) is pinned by its released version, with no clone.
  Its installed artifact is the registry's tarball installed with its dependencies into a prefix: task-070's spike
  found that an npm cache alone does not install offline, because the package metadata is missing. It is cached by
  that version, and the SHA-256 of the tarball stands as its `commit`, its content's identity. A commit pin is
  refused.

The traceability matrix is unaffected: REQ-FMT-12 already traces to F7.1.

Source: [task-071](../memory/task/task-071-openspec-arm-with-project-rules-rendered.md), from
[task-070](../memory/task/task-070-openspec-in-the-run-container-spike.md)'s answers; scope accepted by the approver
at task-071's pending → backlog gate (2026-10-07).

### Amendment 1.29 (delivery, W13 task-073, 2026-10-09)

- **REQ-RES-10:**
  - `contests.yaml` names the repository whose issue form each setup page links.
  - A contested execution is rebuilt with its arm and manuals **as they ran**, read from the repository's history when
    the working tree has moved on. Runs record the arm's digest and the manual's sha256, but no commit of this
    repository, so the site finds the commit by those.
  - This is the approver's choice for task-067's review point B (2026-10-07).
- **REQ-RES-02:** the refusals of a changed manual and of a changed arm now apply only when neither the working tree
  nor the history holds what the runs recorded.

The traceability matrix is unaffected: REQ-RES-10 already traces to F7.2.

Source: [task-073](../memory/task/task-073-setup-contest-process.md); task-067's Review notes (point B).

### Amendment 1.30 (delivery, W14 task-089, 2026-10-14)

- **REQ-RES-04:** its 1.22 text described the root page that led to one execution, and a commit naming it. REQ-RES-02
  as amended in 1.26 replaced that page with an index of every built execution (task-085). The check now compares
  `site/index.html` with that index, the commit names every execution under `site/`, and a push that would drop an
  execution `gh-pages` already publishes is refused. The behaviour and its tests came with task-085; this amendment
  states it.

The traceability matrix is unaffected: REQ-RES-04 already traces to F5.6.

Source: [task-089](../memory/task/task-089-requirements-1-30-req-res-04-describes-the-root-index-and-the-published-executions-it-keeps.md),
fixing [bug-020](../memory/bug/bug-020-req-res-04-still-describes-the-root-page-that-req-res-02-s-1-26-amendment-replaced.md)
(task-085's review, round 1, item 8); asked by the approver in chat on 2026-10-14.

### Amendment 1.31 (delivery, calibration task-092, 2026-10-14)

- **REQ-RES-04:** its 1.22 text said that a difference, a link, or any entry no build gives is refused "naming it and
  the `bench site build` to run". Of those three, only a difference names one. A link is refused as a link. An entry
  no build gives belongs to no execution, so the refusal says to remove it or to rebuild `site/`. The three messages
  came with task-047, with 1.22 itself; this amendment states them.

The traceability matrix is unaffected: REQ-RES-04 already traces to F5.6.

Source: [task-092](../memory/task/task-092-requirements-1-31-req-res-04-names-what-each-refusal-of-the-site-check-asks-for.md),
fixing [bug-021](../memory/bug/bug-021-req-res-04-says-every-refused-entry-names-a-bench-site-build-but-a-link-or-a-stray-entry-does-not.md)
(task-089's review, round 1, nit 2); the approver decided in chat on 2026-10-14 that the code is right.

### Amendment 1.32 (v0.2, plan-004 step 3-bis, task-094, 2026-10-15)

A Codex agent adapter, for a cross-agent comparison kept outside the v0.2 campaign (the approver in chat, 2026-10-15;
task-094's pending → backlog gate, `de6922f`). The Claude pin, the v0.2 campaign files and dl-017 do not change.

- **REQ-FMT-01, REQ-RUN-16:** `agent.name: codex`, its effort levels, its pin and its image.
- **REQ-RUN-04, REQ-RUN-09, REQ-RUN-13:** Codex's command lines, its usage (a running total per thread, input that
  includes the cached tokens), its cost from a pinned OpenAI price table (`costBasis: price-table`), its limit
  messages. Read from Codex 0.162.1's source at `rust-v0.162.1` (`exec_events.rs`, `event_processor_with_jsonl_output.rs`,
  `sse/responses.rs`, `protocol/src/error.rs`), to be confirmed by task-094's first real session.
- **REQ-RUN-12:** the manual as `AGENTS.md` for Codex.
- **REQ-RUN-15, REQ-NFR-01:** the subscription's `auth.json`, read-write as a single file, under
  [dl-019](../memory/decision-log/dl-019-the-codex-spike-s-subscription-credential-mounted-read-write-from-a-dedicated-directory-outside-the-repository.md)
  (approved `f10f5ce`) and for its scope only.
- **REQ-SCO-07, REQ-SCO-13:** M-R across two executions, as experiment design 1.4 §4.5 makes precise.
- **REQ-CLI-05:** `--profile <file>`, so that the spike's dry runs pin their own agent (the approver in chat,
  2026-10-15, before the first dry run).

No requirement is added: the adapter's rules amend the runner's own. The traceability matrix is unaffected: these
requirements already trace to F1.1, F1.3, F2.2, F2.3, F2.6, F2.7, F4.5, F5.2 and the security-secrets directive.

Source: [task-094](../memory/task/task-094-a-codex-agent-adapter-and-s3-s-baseline-compared-across-agents-spike.md);
dl-019.

### Amendment 1.33 (v0.2, calibration task-095, 2026-10-20)

WingFoil v0.3.0 admitted to the wingfoil arm (dl-017), with the approver's choices in chat on 2026-10-20.

- **REQ-CLI-05, REQ-CLI-02** (review round 2): a dry-run profile pins arm digests as a campaign does, and the estimate
  counts only a dry run of the pinned arm on the pinned harness version, so that the bridge's dry runs and the
  reference campaign's are never priced for each other.
- **REQ-FMT-13, REQ-FMT-01, REQ-FMT-06, REQ-RUN-03:** an arm whose pinned digest the working tree no longer has is read
  from the newest commit of the history that has it, and `run.json` says where it was read. The bridge keeps v0.2.2's
  wingfoil arm this way while the reference campaign runs v0.3.0's, both from one benchmark commit.

The traceability matrix is unaffected: these requirements already trace to F1.1, F1.2, F1.3, F2.5, F3.3, F5.1, F7.2 and T12.

Source: [task-095](../memory/task/task-095-wingfoil-v0-3-0-admitted-to-the-wingfoil-arm-the-bridge-s-arm-read-by-its-pinned-digest.md).

### Amendment 1.34 (v0.3, W15 task-101, 2026-10-24)

[dl-022](../memory/decision-log/dl-022-campaigns-run-outside-the-release-cycle-composed-from-self-explaining-presets-and-a-codex-only-campaign-as-the-first.md):
campaigns run on their own, from short files that extend a preset.

- **REQ-FMT-01:** presets in `campaigns/presets/`, `extends:` and its resolution; a file cannot remove what its preset
  sets; the execution's `campaign.yaml` is the resolved campaign.
- **REQ-FMT-02:** the identity is the digest of the resolved campaign; campaign-002's `81ebb2691f9c` and
  campaign-003's `bf3a1ac7dff5`, which extend nothing, keep theirs.
- **REQ-CLI-01:** `validate` prints the resolved campaign; **REQ-CLI-13** (new): `bench campaign presets`.
- Dry-run profiles (REQ-CLI-05) do not extend presets.

The traceability matrix gains REQ-CLI-13 under F1.1.

Source: [task-101](../memory/task/task-101-campaign-presets-and-extends-and-campaigns-run-on-their-own.md).

### Amendment 1.35 (v0.3, W15 task-102, 2026-10-24)

[dl-024](../memory/decision-log/dl-024-the-codex-campaign-s-subscription-credential-on-dl-019-s-model.md), the Codex
campaign's credential, and the Codex case of
[bug-032](../memory/bug/bug-032-an-interrupted-or-killed-step-loses-the-cost-it-spent.md).

- **REQ-NFR-01, REQ-RUN-15:** dl-024's scope restated and enforced before any Codex session (the date, the preset, the
  baseline arm).
- **REQ-ARC-04:** the port's optional `endRun()`; the Codex adapter forgets its threads there.
- **REQ-RUN-09:** an invocation whose usage is not known counts at its bound.

The traceability matrix is unaffected: these requirements keep their links (F2.3, M-K1, the acceptance README and the
security-secrets directive).

Source: [task-102](../memory/task/task-102-codex-models-spike-prices-and-the-codex-baseline-campaign-files.md).

### Amendment 1.36 (v0.3, W15 task-104, 2026-10-25)

The Codex baseline campaign (campaign-004, dl-022 arm A) is published as its own comparison across agents, never
mixed with the Claude headlines (T14).

- **REQ-RES-11** (new): the site's catalogue and a home grouped by kind (reference, bridge, across agents).
- **REQ-RES-02, REQ-RES-04:** the site reads the catalogue, and an across-agents comparison's earlier aggregate; the
  publish check's index is the catalogue's home.
- **REQ-RES-07:** the across-agents page.
- **REQ-SCO-07:** M-R across measures a baseline group although the other execution pins harnesses its baseline
  does not run.

The traceability matrix gains REQ-RES-11 under F5.5.

Source: [task-104](../memory/task/task-104-the-site-s-catalogue-a-home-grouped-by-kind-and-the-across-agents-comparison-page.md).

### Amendment 1.37 (v0.3, W15 task-105, 2026-10-25)

[dl-025](../memory/decision-log/dl-025-the-codex-credential-s-scope-widened-to-a-wingfoil-arm-against-its-docs-control-on-terra-dl-022-arm-b.md):
dl-022's arm B, a WingFoil arm on Codex against its docs control, on `gpt-5.6-terra`.

- **REQ-RUN-15:** the Codex refusals widened to dl-025's campaign and profile; an arm's MCP servers rendered into
  Codex's `config.toml`.
- **REQ-RUN-12:** the manual's merge under Codex stated.

The traceability matrix is unaffected.

Source: [task-105](../memory/task/task-105-a-wingfoil-arm-on-codex-against-its-docs-control-on-terra-dl-022-arm-b.md).

### Amendment 1.38 (v0.3, W15 task-106, 2026-10-26)

[bug-027](../memory/bug/bug-027-the-approval-classifier-v1-reads-an-account-of-pending-documents-as-an-approval-request.md)
and [bug-035](../memory/bug/bug-035-the-approval-classifier-v1-misses-codex-s-approval-requests.md): classifier v1
reads an account of pending documents as a request, and misses Codex's requests (campaign-005's results review).

- **REQ-RUN-06:** approver policy v2, its classifier's rules and its corpus; v1 unchanged.

The traceability matrix is unaffected.

Source: [task-106](../memory/task/task-106-classifier-v2-an-approval-request-needs-a-requester-and-codex-s-requests-are-recognised.md).

### Amendment 1.39 (v0.3, W15 task-108, 2026-10-27)

campaign-006, a Codex execution of three arms read against each other within Codex, belongs with the executions of
another agent, but the home's group described the baseline only, and an entry's notes reached the across-agents page
only, which campaign-006 has not (M-R across needs one approver policy).

- **REQ-RES-11:** the `across-agents` group headed "Other agents", its line covering both kinds of execution; the
  notes on the landing page too.

The traceability matrix is unaffected.

Source: [task-108](../memory/task/task-108-the-home-s-other-agents-section-and-an-execution-s-catalogue-notes-on-its-landing-page.md).

### Amendment 1.40 (v0.3, W15 task-109, 2026-10-27)

The WingFoil that manages this repository moves to the published `0.3.1`, and the finding's templates are re-checked
against it. The wingfoil arm of v0.2's reference campaign runs `v0.3.0` (task-095), whose `bug` and `decision-log`
templates are byte-identical at `v0.3.1`; they differ from `v0.2.2`'s by an optional `reported_by` field, a comment on
`memory add`, and, in the bug, a `### Retrospective` subsection closing its Triage & Execution Notes.

- **REQ-RES-05:** the **For WingFoil** section follows `v0.3.0`'s templates (commit `cc31d7a8`), no longer
  `v0.2.2`'s; a bug's block ends with the Retrospective subsection, left to the maintainer.

The traceability matrix is unaffected.

Source: [task-109](../memory/task/task-109-the-managing-wingfoil-pin-advanced-to-a-published-build-and-the-first-wingfoil-sync-of-the-feedback-inbox.md).

### Amendment 1.41 (v0.3, W15 task-114, 2026-10-27)

The wingfoil arm's step A ([dl-021](../memory/decision-log/dl-021-the-wingfoil-arm-follows-wingfoil-s-workflow-model-in-three-steps-each-on-the-wingfoil-release-that-enables-it.md))
on WingFoil 0.3.1: the session agent drives the workflow's cycle, acting in each step's role, so its docs control
carries every role's rules; and campaign-007, the Codex campaign of the step-A arms
([dl-027](../memory/decision-log/dl-027-step-a-brought-ahead-with-a-codex-campaign-of-the-step-a-arm-before-2026-11-13.md),
[dl-028](../memory/decision-log/dl-028-gpt-6-1-terra-as-a-model-slice-of-campaign-007-beside-gpt-5-6-terra-s-bridge.md)),
enters the Codex credential's scope.

- **REQ-FMT-05:** a docs control's `docs_directives: every-role`.
- **REQ-RUN-11:** every role's directives, labelled, for a docs control that declares it; the earlier rendering kept
  without it.
- **REQ-RUN-15:** campaign-007's file and dry-run profile, on `gpt-5.6-terra` and `gpt-6.1-terra`.

The traceability matrix is unaffected.

Source: [task-114](../memory/task/task-114-the-step-a-wingfoil-arm-on-wingfoil-0.3.1-baseline-docs-with-every-role-s-directives-dl-021-dl-027.md).

### Amendment 1.42 (v0.3, W15 task-115, 2026-10-28)

campaign-007's model slice moves from `gpt-6.1-terra` to `gpt-6-luna`
([dl-031](../memory/decision-log/dl-031-gpt-6-luna-replaces-gpt-6.1-terra-as-campaign-007-s-model-slice-the-weak-model-on-codex-before-2026-11-13.md)),
so the Codex credential's scope follows it.

- **REQ-RUN-15:** campaign-007's file and dry-run profile, on `gpt-5.6-terra` and `gpt-6-luna`; `gpt-6.1-terra`
  refused there, naming dl-027 and dl-031.

The traceability matrix is unaffected.

Source: [task-115](../memory/task/task-115-campaign-007-s-codex-scope-on-gpt-6-luna-instead-of-gpt-6.1-terra-dl-031.md).

### Amendment 1.43 (v0.3, W17 task-117, 2026-10-29)

S10's scripted verdicts
([dl-029](../memory/decision-log/dl-029-a-gates-and-roles-scenario-for-v0-4-s-release-planning-q-e2-q-e3.md),
[S10.md](scenarios/S10.md) §6), the first of the method's two changes before its calibration.

- **REQ-FMT-04:** a step's optional `verdict` (`kind`, `text`, `later`); a campaign running a scenario with verdicts
  pins a policy that reads them.
- **REQ-RUN-06:** approver policy v3, v2's classifier and replies with the scenario's verdicts; v1 and v2 frozen.

Carrying a verdict out under a separate approver identity is task-118's (REQ-RUN-17). The traceability matrix is
unaffected.

Source: [task-117](../memory/task/task-117-approver-policy-v3-scripted-verdicts-per-gate-on-classifier-v2-dl-029.md).

### Amendment 1.44 (v0.3, W17 task-118, 2026-10-30)

S10's separate approver
([dl-029](../memory/decision-log/dl-029-a-gates-and-roles-scenario-for-v0-4-s-release-planning-q-e2-q-e3.md),
[S10.md](scenarios/S10.md) §6, §7), the second of the method's two changes before its calibration: the scenario
conventions' open question 1, option (b1), for a scenario that declares it.

- **REQ-FMT-04:** a scenario's `approver`.
- **REQ-FMT-05:** an arm's `verdict_hook`; the wingfoil arm's.
- **REQ-FMT-06:** the commits' authors in `commits.json`; the verdict ledger, `verdicts.json`.
- **REQ-RUN-17:** the developer's identity, and verdicts carried out under the approver's, for such a scenario.
- **REQ-SCO-06:** the `gate`, `attribution` and `rejection` kinds (M-E2, M-E3a, M-E4).

The traceability matrix is unaffected.

Source: [task-118](../memory/task/task-118-a-separate-approver-identity-the-agent-never-the-approver-verdicts-executed-by-the-runner-dl-029.md).

### Amendment 1.45 (v0.3, W17 task-119, 2026-10-30)

S10's calibration found that no verdict reached baseline or the docs controls, whose agents wait on the approver in
the third person
([bug-038](../memory/bug/bug-038-a-verdict-never-reaches-an-agent-that-waits-on-the-scenario-s-approver-in-the-third-person-s10-policy-v3.md)).

- **REQ-RUN-06:** approver policy v4, v3 with a wait on the scenario's approver read as an approval request at a step
  with a verdict, once a step; v5, the wait read by any approval word. v3 frozen as task-117 left it (the
  calibration's first round ran on it), v4 as its third round ran it.

The traceability matrix is unaffected.

Source: [task-119](../memory/task/task-119-calibration-of-s10-dry-runs-in-three-arms-on-haiku-5.5-and-sonnet-5.5-then-its-registration-dl-029.md).

### Amendment 1.46 (v0.3, W17 task-120, 2026-11-01)

campaign-008's S10 wingfoil run on Haiku 5.5, r2, had a verdict refused by WingFoil with no reason in its results
([bug-041](../memory/bug/bug-041-the-wingfoil-arm-s-verdict-hook-discards-wingfoil-s-error-so-a-refused-verdict-carries-no-reason.md)).

- **REQ-FMT-05:** the verdict hook's line gains `detail`, the tool's reason for a refused verb or a failed search.
- **REQ-FMT-06:** the verdict ledger's `carried_out` may hold that `detail`.

The traceability matrix is unaffected.

Source: [task-120](../memory/task/task-120-the-wingfoil-verdict-hook-records-wingfoil-s-refusal-and-the-arm-s-manual-commits-an-element-s-edits-before-a-gate.md).

### Amendment 1.47 (v0.3, W17 task-121, 2026-11-01)

[dl-032](../memory/decision-log/dl-032-a-weak-model-with-wingfoil-against-a-strong-model-without-it-cost-and-time-at-equal-quality-and-a-local-model-s-estimate.md)
items 2–4: a weak model with a harness against a strong model without it, measured.

- **REQ-SCO-15** (new): the comparison, its verdicts and the local estimate, in `aggregate.json`'s `parity`.
- **REQ-RES-12** (new): the parity page and the method page's statement.

The traceability matrix: F4.3 gains REQ-SCO-15; F5.5 and F5.8 gain REQ-RES-12.

Source: [task-121](../memory/task/task-121-weak-with-a-harness-against-strong-without-the-cross-model-parity-comparison-and-a-local-model-s-estimate-dl-032.md).

### Amendment 1.48 (v0.3, W17 task-123, 2026-11-01)

A failing verdict hook's reason was dropped by the runner ([bug-043](../memory/bug/bug-043-the-runner-drops-a-verdict-hook-s-stderr-when-the-hook-fails-so-its-outcome-carries-no-reason.md)).

- **REQ-FMT-05:** a failing hook's `detail` is its own stderr's last non-blank line.

The traceability matrix is unaffected.

Source: [task-123](../memory/task/task-123-the-runner-records-a-failing-verdict-hook-s-stderr-as-its-detail-bug-043.md).

### Amendment 1.49 (v0.3, W16 task-126, 2026-11-02)

W16, "The method corrected" ([plan-005](../plans/plan-005-release-v0-3.md)): the retrospective's bugs of the method,
stated before the tasks that fix them; experiment design 1.7 set the variance rule and M-K4's, this amendment settles
what it left to W16.

- **REQ-SCO-06:** content checks v2 (whole words in the agent's own text) and a rubric with the maintainer's
  judgement ([bug-026](../memory/bug/bug-026-the-oracle-s-content-checks-match-substrings-and-template-text-not-the-agent-s-own-words.md)).
- **REQ-SCO-05, REQ-SCO-07:** M-R2 v2, the interface resolved from the entry point ([bug-028](../memory/bug/bug-028-m-r2-measures-the-file-layout-not-the-public-interface.md)).
- **REQ-SCO-08:** M-K3 as one-off costs; M-K4's variance on both its quality and its step-cost conditions (the
  approver's choice of 2026-11-02 between bug-029's Resolution and its Expected; experiment design 1.11)
  ([bug-029](../memory/bug/bug-029-m-k3-is-always-zero-and-m-k4-s-not-applicable-ignores-the-variance.md)).
- **REQ-RES-03:** ▲/▼ and headline counts only beyond the variance; within it and preliminary shown apart
  ([bug-030](../memory/bug/bug-030-the-up-and-down-marks-and-the-headline-counts-flag-differences-within-the-variance.md)).
- **REQ-RES-05:** the cited template read from the execution ([bug-031](../memory/bug/bug-031-findings-cite-the-v0-2-2-template-through-template-commit.md)).
- **REQ-RUN-09:** a step that ends without a result event counted at its bound, an interruption recorded as such
  ([bug-032](../memory/bug/bug-032-an-interrupted-or-killed-step-loses-the-cost-it-spent.md)).
- S1 1.1's step 5 ([bug-025](../memory/bug/bug-025-s1-1-0-s-step-5-leaves-createpatch-s-diff-ambiguous-and-its-result-is-bimodal-in-every-arm.md)) follows the scenario conventions' K7 (amendment 1.5): no
  requirement changes.

The acceptance scenarios are written by the task that implements each item, with their tests (the approver's choice
in chat, 2026-11-02). The traceability matrix is unaffected.

Source: [task-126](../memory/task/task-126-w16-s-requirements-and-acceptance-the-method-corrected-bug-025-bug-026-bug-028-to-bug-032.md).

### Amendment 1.50 (v0.3, W18 task-138, 2026-11-06)

W18, "Configured variants" ([plan-005](../plans/plan-005-release-v0-3.md)): F7.5 as the experiment design 1.7 states
it (§2, T12), carried into the requirements before the tasks that build it, with the approver's choices in chat
(2026-11-06): the configuring agent sees the seed, its README included, and the harness as its setup installs it,
with a run's network; Claude Code on `claude-sonnet-5-5` for every harness; S1, S2, S3 and S8 at 1.1, S8's wingfoil
configuration extended; its sessions later, on consent.

- **REQ-ARC-03, REQ-FMT-04, REQ-FMT-05, REQ-FMT-13:** the configured arms and their docs controls, by name;
  `configured_of` and its digest; a harness arm's `configuration` places, outside which a configuration is refused
  (the approver's choice at the gate); a configuration and its records as scenario content, from 1.1 on.
- **REQ-FMT-01:** a campaign's pins checked against the configurations' records.
- **REQ-FMT-08:** the leak scan over the configurations and the configuring prompt.
- **REQ-RUN-03, REQ-RUN-11:** a configured arm's setup, the configuration copied before the setup commit; its docs
  control's generation.
- **REQ-RUN-20, REQ-CLI-14** (new): the configuring agent and `bench scenario configure`; **REQ-CLI-11:** its
  transcripts in each execution's asset.
- **REQ-SCO-08:** the configuration's cost in M-K3, every session's, for the configured arm and its docs control.
- **REQ-RES-02, REQ-RES-10:** the configuring agent and each configuration on the method page; a configuration
  contested, corrected in a new scenario version.

The acceptance scenarios are written by the task that implements each item, with their tests, as in 1.49; this
task's Execution notes draft them. The traceability matrix gains F7.5 (1.7).

Source: [task-138](../memory/task/task-138-w18-s-requirements-and-acceptance-configured-variants-f7.5.md).

### Amendment 1.51 (v0.3, W18 task-139, 2026-11-07)

[bug-034](../memory/bug/bug-034-symlinks-spaces-and-line-endings-in-scenario-and-arm-files-are-handled-inconsistently.md),
before W18's configured variants add arm and scenario files written by an agent
([plan-005](../plans/plan-005-release-v0-3.md) delivery order item 4).

- **REQ-FMT-04, REQ-FMT-05:** no symbolic link in a scenario version or an arm, each refused, named.
- **REQ-FMT-14:** a directive file read one way by every generator; an open code fence refused.
- **REQ-SCO-04, REQ-SCO-07:** the scoring's path helpers: no link followed, a patch's paths read exactly; the
  published runs unchanged.

Source: [task-139](../memory/task/task-139-bug-034-symlinks-spaces-and-line-endings-handled-one-way.md).

### Amendment 1.52 (v0.3, W18 task-140, 2026-11-07)

The first part of W18's configuring agent, at the approver's choice of 2026-11-07: the formats and their loading, with
no session ([plan-005](../plans/plan-005-release-v0-3.md) delivery order item 4).

- **REQ-FMT-04:** the configuring records' file and their consistency; what `configured/` holds; a configuration kept
  apart from an arm's configuration, the open-fence rule applying to it.
- **REQ-FMT-05:** the places' glob syntax; `state` only beside `configuration`, and both only on a harness arm; the
  manual's paths.
- **REQ-RUN-20:** the profile's pins.

Source: [task-140](../memory/task/task-140-w18-configuration-places-the-configuring-profile-and-stored-configurations.md).

### Amendment 1.53 (v0.3, W18 task-141, 2026-11-08)

The second part of W18's configuring agent: `bench scenario configure` and the session
([plan-005](../plans/plan-005-release-v0-3.md) delivery order item 4).

- **REQ-FMT-04:** the records' dates in order; a registry tool's harness commit, its tarball's SHA-256 (the record's
  schema of 1.52 took a 40-character commit only, which a session on OpenSpec could not have written).
- **REQ-RUN-20:** the session's outcomes and its cost when unreported, the reported usage standing once the step
  returned; a result that changes nothing, a type change and a file holding the credential's value refused; an
  executable file's mode kept; the members and roles read from the tool's own declaration; no record for a failure
  before the session, and what it made under `runs/` removed; the transcript's `<n>`; the session's workspace; the
  records' clock.
- **REQ-CLI-14:** exit 1 for a session that could not start; `--allow-spending` whatever the agent.

Source: [task-141](../memory/task/task-141-w18-bench-scenario-configure-and-the-configuring-session.md).

### Amendment 1.54 (v0.3, W18 task-142, 2026-11-08)

The third part of W18's configured variants: the configured arms, their runs and docs controls
([plan-005](../plans/plan-005-release-v0-3.md) delivery order item 4).

- **REQ-FMT-06:** a configured arm's and a configured docs control's `run.json` record the configuration's base arm,
  its records and their cost.
- **REQ-SCO-08:** M-K3's one-off part read from the runs' records, the same as the version's records.
- **REQ-CLI-05:** a dry run of a configured arm or docs control refused as `validate` refuses a campaign's.
- **REQ-CLI-14:** a configured arm refused as `--arm`.

Source: [task-142](../memory/task/task-142-w18-configured-arms-and-the-configured-docs-controls.md).

### Amendment 1.55 (v0.3, W18 task-143, 2026-11-09)

The configurations of S1, S2, S3 and S8 at 1.1, written by twelve configuring sessions, met a false positive of the
leak scan.

- **REQ-FMT-08:** a configuration is not searched for the oracle literals that are one prose word, lower case or
  capitalised; camelCase names and upper-case codes are still searched for.

Source: [task-143](../memory/task/task-143-w18-the-twelve-configurations-of-s1-s2-s3-and-s8-at-1.1.md),
[bug-047](../memory/bug/bug-047-the-leak-scan-refuses-a-configuration-that-uses-an-ordinary-word-the-oracle-quotes-such-as-a-test-group-s-name.md).

### Amendment 1.56 (v0.3, W18 task-144, 2026-11-11)

The first dry run of `openspec-docs-configured` (`dry-runs/160`, S2@1.1) received no rules: the openspec-docs
generator read only a context in the rules generator's shape.

- **REQ-RUN-11:** openspec-docs renders a context with no `## ` line whole, and the per-artifact `rules:` and the
  `operations:` guidance a configuration holds; the output of a configuration without them is unchanged.

Source: [task-144](../memory/task/task-144-w18-every-arm-s-dry-run-on-s1-s2-s3-and-s8-at-1.1-the-configured-arms-included.md),
[bug-048](../memory/bug/bug-048-the-openspec-docs-generator-drops-a-configured-context-that-has-no-level-two-heading-so-openspec-docs-configured-runs-with-no-rules.md).

### Amendment 1.57 (v0.3, W18 task-145, 2026-11-12)

`bench scenario configure` scanned only its prompt: a configuration holding an oracle literal was found by a later
`scenario validate` or dry run, after the session was paid for (bug-047 surfaced that way in task-143).

- **REQ-CLI-14:** configure runs the leak scan on the configuration it has just written, the hold-out included, and
  exits 1 on a finding; the configuration and its record stay written.

Source: [task-145](../memory/task/task-145-bug-049-bench-scenario-configure-scans-the-configuration-it-writes.md),
[bug-049](../memory/bug/bug-049-bench-scenario-configure-writes-a-configuration-without-scanning-it-for-leaks-so-a-leaking-one-is-found-only-by-a-later-validate-or-dry-run.md).

### Amendment 1.58 (v0.3, W19 task-147, 2026-11-13)

W19, "The review loop" ([plan-005](../plans/plan-005-release-v0-3.md)): F4.9 as the experiment design 1.7 states it
(§4.7), carried into the requirements before the tasks that build it, with the approver's choices in chat (2026-11-13):
the loop runs after the run's last step on a copy, its fixes discarded; the reviewer is Claude Code on
`claude-sonnet-5-5` at `medium`, the same in every arm; at most 5 rounds, a round with nits only or none closing it,
nits never fixed; M-V2 attributes a finding to a fix by its line. Chosen after this task's independent review
(2026-11-13): the reviewer's copy keeps the agent's own records, and a later round sees the whole copy, pointed at the
fix's diff.

- **REQ-RUN-21** (new): the review loop on completed runs, its stripped copy, reviewer, fixer, closing rule and
  stops; **REQ-SCO-16** (new): M-V1 to M-V3.
- **REQ-RUN-01, REQ-RUN-02, REQ-RUN-13, REQ-RUN-19:** the reviewer's image; the loop run before the run's container
  is removed, the fixer in it (the approver's choice after review round 4); quota and interrupt inside a loop; a loop
  never resumed.
- **REQ-RES-06, REQ-CLI-11:** the loop's records committed, its transcripts packed.
- **REQ-FMT-01, REQ-FMT-06, REQ-FMT-08:** the campaign's `review_loop` entry; a run's `review/` records; the stripped
  reserved names.
- **REQ-RUN-08, REQ-RUN-09:** the loop's own caps and usage, apart from the steps'.
- **REQ-SCO-14:** the loop's metrics against the docs control.
- **REQ-RES-02:** the loop on the method page, the result pages and a run's page.
- **REQ-CLI-02, REQ-CLI-03, REQ-CLI-05:** the loop in the estimate, the budget and the dry runs.

The acceptance scenarios are written by the task that implements each item, with their tests, as in 1.50; this
task's Execution notes draft them. The traceability matrix gains F4.9, T16 and T17 (1.8).

Source: [task-147](../memory/task/task-147-w19-s-requirements-and-acceptance-the-review-loop-f4.9.md).
