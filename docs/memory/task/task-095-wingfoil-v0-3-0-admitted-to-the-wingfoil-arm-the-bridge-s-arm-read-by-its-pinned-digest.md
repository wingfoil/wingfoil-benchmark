---
id: task-095-wingfoil-v0-3-0-admitted-to-the-wingfoil-arm-the-bridge-s-arm-read-by-its-pinned-digest
type: task
title: "WingFoil v0.3.0 admitted to the wingfoil arm, the bridge's arm read by its pinned digest"
status: in-review
release: v0.2
wave: calibration
features: [F7.4, F7.2]
acceptance: []
requirements: [REQ-FMT-11, REQ-FMT-13, REQ-FMT-01, REQ-FMT-06, REQ-RUN-03, REQ-RUN-11, REQ-RUN-12, REQ-RUN-14, REQ-FMT-10]
fixes:
  - bug-022-the-codex-credential-s-checkout-check-takes-any-git-for-a-repository
tags: ["harness","wingfoil","calibration","eligibility"]
---

## Context

[dl-017](../decision-log/dl-017-the-v0-2-campaign-pins-wingfoil-v0-3-beside-a-bridge-on-v0-2-2-one-repetition-per-group.md)
(approved `5d7f35b`): the v0.2 reference campaign pins WingFoil v0.3 "once released and admitted to the eligibility
register", beside a bridge that re-runs v0.1's configuration on v0.2.2 with task-086's manual, both from the same
benchmark commit. Its consequence: "Before calibration, a task admits v0.3 to the eligibility register, reviews the
wingfoil arm's manual against v0.3's guide, checks the arm's setup and the docs control's generator with v0.3, and pins
it in the campaign file." plan-004 step 3 (calibration) waits for it (rel-v0-2, `a052982`).

**WingFoil 0.3.0 was released on 2026-10-19**, before dl-017's 2026-10-31 cutoff: tag `v0.3.0` → `cc31d7a8`
(`git -C ../WingFoil2 rev-parse v0.3.0^{commit}`), npm `wingfoil@0.3.0` = `latest`. `docs/agents.md` exists at the
tag. The approver gave this task to this session on 2026-10-20.

**WingFoil's answer of 2026-10-18** on its 0.3.0 build, fresh repositories, `init --template Scrum|Kanban`: bug-389
does not reach them; the scaffold's `sw-life-cycle` (inception → specification → delivery → sunset) has seven phases
with no role, actions, produces or approval, completed by seven `workflow finalize` with no Memory element;
`agent execute --next` needs an element; `dna.yaml` declares no `team.agents`. Its CHANGELOG's one breaking change for
0.2.x projects: a phase `include:` must name a workflow, not a path.

**Open since task-091:** the bridge (`campaigns/v0-2-bridge.yaml`) and the reference campaign both read `arms/wingfoil/`.
The bridge needs v0.2.2's arm and task-086's manual while the reference needs v0.3.0's; both arms must be named
`wingfoil`, or the comparisons (`c82a5e74885b/2` → bridge → reference) match no group.

**The approver's choices in chat, 2026-10-20:**
1. **The bridge's arm is read by its pinned digest:** a campaign whose `arm_digests` names an arm whose working-tree
   files no longer digest to the pin reads that arm from the newest commit of the repository's history that does, as
   the site already reads a contested arm "as it ran" (task-073, `src/site/recorded.ts`). One benchmark commit, one arm
   name, no duplicated directory.
2. **The wingfoil arm measures WingFoil 0.3.0 as its documentation sets it up:** the bare `init` scaffold, with no
   benchmark-written workflow; the method page says so. The parity rule (experiment design §2: each tool "set up from
   its official documentation") is the one Spec Kit and OpenSpec follow. WingFoil's reference templates are its v0.4.
3. **No real-agent session in this task:** everything offline, with the fake agent and the docker tests on the
   v0.3.0 clone. Calibration's dry runs are the first real runs on v0.3.0.

**Done** means: v0.3.0 admitted; the arm, its manual and its capabilities set for v0.3.0; the S8 fixture regenerated
from 0.3.0's `init`; `v0-2-reference.yaml` pinned to `v0.3.0` with the new digests and `v0-2-bridge.yaml` keeping
v0.2.2's, both valid from one commit; the method and the specification saying so; the approver told that calibration
can start.

## Acceptance criteria

1. A campaign whose pinned arm digest differs from the working tree's runs that arm as the newest commit holding that
   digest has it; it is refused only when no commit does (REQ-FMT-01, REQ-FMT-13 as amended). For a docs control the
   digest covers its borrowed manual too, so the arm and that manual come from the same commit. **Red-first.**
2. `run.json` records where the arm was read: the working tree, or the commit (REQ-FMT-06 as amended). **Red-first.**
3. `campaign validate` and `campaign run` say which arms are read from history, naming the commit. **Red-first.**
4. The eligibility register admits `wingfoil` `v0.3.0` with the five criteria and their evidence (REQ-FMT-11); a
   campaign pinning `v0.3.0` validates, and one pinning an unassessed `v0.3.1` is still refused. **Red-first.**
5. `v0-2-reference.yaml` pins `wingfoil: v0.3.0` and the new `wingfoil` and `baseline-docs` digests;
   `v0-2-bridge.yaml` keeps `v0.2.2` and the digests of `5d7f35b`'s arms; both validate from this branch's commit, the
   bridge's two arms read from history (test/unit/campaign/v0-2-campaigns.test.ts). **Red-first.**
6. The wingfoil arm's manual: the "This arm" section rewritten against v0.3.0's `docs/agents.md`, departures stated
   as task-086 did, the common core byte-identical to the baseline's (test/unit/arms/manuals.test.ts). **Red-first.**
7. `provides` re-assessed from v0.3.0's source (REQ-FMT-10, K5), with the evidence in the Execution notes; the
   telemetry comment re-checked. **Red-first** where a value changes (expected failures move with it), otherwise
   **characterization**.
8. The arm's setup works with v0.3.0: `init` with no TTY, the approval authority, the write guard, the S8 scenario
   configuration copied over 0.3.0's `init` output (docker W3 test on the clone at `v0.3.0`). **Red-first** (the pin
   in `WINGFOIL_UNDER_TEST` moves first).
9. The S8 fixture (`test/fixtures/wingfoil-config/S8/`) regenerated from 0.3.0's `init`, no agent; the docs control's
   generator (REQ-RUN-11) reads it as before, `S8.PROJECT_RULES.md` refreshed. **Characterization** of the generator,
   the fixture as new evidence.
10. The method page: T10 names v0.3.0 for the reference campaign and v0.2.2 for the bridge; the wingfoil arm's process
    paragraph says the bare 0.3.0 scaffold is what is measured (test/unit/site/method-statements.test.ts).
    **Red-first.**
11. `claude-code`, `codex`, `fake` and every other arm unchanged: the existing suites. **Characterization.**
12. bug-022: `BENCH_CODEX_AUTH_FILE` is inside a git checkout only when a `.git` directory holding `HEAD`, or a `.git`
    file starting with `gitdir:`, is above its real path; an empty `.git` makes nothing a checkout. **Red-first**
    (added with the approver's go in chat, 2026-10-20).

## Design

### Specification first (one `docs(spec)` commit before any test)

- **Requirements 1.33:** REQ-FMT-13 and REQ-FMT-01 (an arm read by its pinned digest from history when the tree has
  moved; refused only when no commit holds it); REQ-FMT-06 (`run.json`'s arm source); REQ-RUN-03 (the setup runs the
  arm as read); REQ-RUN-12 (the manual as read).
- **Experiment design 1.5:** §6's bridge says how "the same benchmark commit" holds while the bridge's arm is
  v0.2.2's (read by its digest); §2's wingfoil arm row says the bare scaffold is measured, with WingFoil's answer of
  2026-10-18 as the source.
- **dl-017** is not edited: its consequence is carried out here; the Execution notes cite it.

### 1. The arm read by its pinned digest (`src/runner/campaign.ts`, `src/arms/`)

- `checkCampaign` today refuses a pinned digest that differs from the tree's (`src/runner/campaign.ts` L76–85). It
  becomes: tree first; otherwise `recordedArm` (moved from `src/site/recorded.ts` to `src/arms/`, shared by the site
  and the runner) finds the newest commit whose arm digests to the pin, written to a directory under the execution's
  own `runs/` area, and the arm is loaded from there. No commit → the same refusal as today.
- **A docs control:** its digest covers the borrowed manual (REQ-FMT-13), so the search reconstructs both from one
  commit: the docs control's directory and the source arm's `manual.md`.
- `checkCampaign` is synchronous and `recordedArm` reads history through the `HistoryPort`: the check either becomes
  asynchronous or takes the history read as an injected function; decided by the red tests, the smaller change wins.
- **Scenario arm configurations** (`scenarios/S8/1.0/arms/wingfoil/`) are scenario content, pinned by the scenario's
  hash, and are not read from history.
- `run.json` gains `arm_source: { tree: true } | { commit }`; the site reads it when present (a run without it was
  read from the tree).

### 2. The admission (`eligibility/register.yaml`, `arms/wingfoil/`)

- **Register:** a `wingfoil` `v0.3.0` entry, 2026-10-20, the five criteria assessed as task-063 assessed v0.2.2's,
  the evidence from the tag (`cc31d7a8`), its `docs/agents.md`, its CHANGELOG and its licence.
- **Manual:** `git -C ../WingFoil2 show v0.3.0:docs/agents.md` read whole; "## This arm" rewritten as task-086 did,
  departures stated. With choice 2, it says what the bare scaffold offers (and what `workflow next` will print), not a
  workflow the benchmark adds.
- **`provides`:** re-assessed from the tag's source. WingFoil 0.3.0 ships a workflow engine; whether
  `workflow-engine` is `true` for the arm as set up (the bare scaffold's engine runs, but guides nothing) is read
  against K5's definition and stated with its evidence. If it changes, the scenarios' expected failures are re-read
  (none of S1, S2, S3, S8 declares `workflow-engine` today).
- **Setup:** `setup.sh` re-checked on 0.3.0 (`init --template Kanban` with no TTY, `dna` commands, the write guard);
  its comments name v0.3.0. Its digest changes, which is why choice 1 comes first.
- **The bridge's arm** is not edited anywhere: it is `5d7f35b`'s, read by its digest.

### 3. Fixtures, campaign files, the method

- `test/fixtures/wingfoil-config/S8/`: regenerated by running 0.3.0's `init` and the arm's setup steps on the S8 seed
  in a container from the v0.3.0 build, no agent; its README says how.
- `campaigns/v0-2-reference.yaml`: `wingfoil: { tool: wingfoil, version: v0.3.0 }` and the new digests; its
  `# placeholder` values stay calibration's. `campaigns/v0-2-bridge.yaml`: unchanged.
- `test/docker/run.test.ts`: `WINGFOIL_UNDER_TEST = 'v0.3.0'`; a docker test that the bridge's arm, read from
  history, builds and sets up v0.2.2.
- `site-content/method.md`: T10 and the wingfoil arm's paragraph (choice 2). `src/results/finding.ts`
  `TEMPLATE_COMMIT` follows the pin.
- **Left as they are:** `scenarios/dry-run.yaml` (calibration's profile, set by calibration); the repository's own
  governance CLI (`vendor/wingfoil-0.2-pre-3df305e.tgz`, the `wingfoil-cli` directive's rules 8–9), which is not the
  harness under test and moves only through its own task.

### Spending, checks, review

- **No spending:** no real-agent session (choice 3). The fake agent, the unit and acceptance suites, and the docker
  tests on the WingFoil clone at `v0.3.0` (built locally, no agent).
- Day checks only, niced: vitest `--maxWorkers=2` on the touched tests, `npm run lint` (read in full),
  `npx tsc --noEmit -p .`; `npm run test:bin` when CLI output changes; the touched docker tests. Full suites
  (`scripts/full-suites.sh`) when the approver asks; green on the offered commit gates in-review → approved.
- Review by an independent read-only agent, one round at a time until clean, each round in the Review notes.
- After approval: tell the approver that calibration (plan-004 step 3) can start.

## Execution notes

- `npx wingfoil memory add --type task --title "WingFoil v0.3.0 admitted to the wingfoil arm, the bridge's arm read
  by its pinned digest" --tags "harness,wingfoil,calibration,eligibility"`, on main. Declared: the element from the
  template in `draft`, one commit. Observed: `4eba949`, `status: draft`, `tags` written, the other fields empty
  (W-02). Matches.
- `npx wingfoil memory submit task-095-…`, on main. Declared: `draft → pending`, one commit. Observed: `d131733`, one
  file, `status` only. Matches. The approver's `memory approve` → `042a22f` (`pending → backlog`). Matches.
- `npx wingfoil memory submit task-095-…`, in the linked worktree `WingFoil2-Benchmark-wt/task-095` with its own
  `npm ci`. Declared: `backlog → in-progress`, one commit. Observed: `89cc04e`, one file, `status` only. Matches.

### Reading WingFoil v0.3.0 (free)

- Tag `v0.3.0` → `cc31d7a8` in `../WingFoil2`; npm `wingfoil@0.3.0` is `latest`. Its CHANGELOG's 0.3.0 section:
  workflow commands that deduce a workflow's state from Memory at `HEAD` (`workflow start|next|status|finalize|end|
  show`), `agent execute` (launches an agent CLI through an adapter a `team.agents` entry declares), `memory
  park|amend`, verbs that act only on committed documents, `include:` by workflow name (breaking), a
  `WingFoil-Version:` trailer on every commit, `tools/list` answering `[]` (still no MCP Tools). Its source has no
  telemetry or network call of its own.
- `docs/agents.md` v0.2.2 → v0.3.0: §4 rule 1 adds `memory park` and the workflow verbs, `approve|reject|amend` the
  approver's; §6 adds "act only on committed documents" errors; §7 "WingFoil 0.3 records and routes workflows; it does
  not execute their steps … Start or end a workflow only when the human asks you to"; §9 drops "no workflow engine".
- **Nested agents:** `agent execute` needs a `team.agents` entry with an adapter (`src/agent/execute.ts` L274–287).
  The `init` scaffold declares none, and the arm's manual already keeps configuration commands (`dna`) away from the
  agent (departure 2), so no run can launch an unmetered agent; the register's `no-own-llm` evidence says so.

### What was done

- **Specification** `8838f02`: requirements 1.33 (REQ-FMT-13, -01, -06, REQ-RUN-03), experiment design 1.5 (§2's
  wingfoil row: the bare scaffold; §6's bridge: its arm read by digest; decision 10).
- **The arm read by its pinned digest** (criteria 1–3): red `d4cbcc4`, code `f5a53ce`. `src/arms/history.ts`
  `armFromHistory` reads `git log` / `ls-tree` / `cat-file` synchronously under `historyCli`'s read-only environment,
  digests each commit's `arms/<arm>/` as the tree's digest does (bytes, links by target), and writes the first match
  under `.cache/arms/<commit>/`; `checkCampaign` loads the arm from there with `from: { commit, root }`; `run.ts`
  digests it there and writes `run.json`'s `arm_source`; `campaign validate` and `campaign run` print "arm <name>: read
  from commit <sha12>, which holds its pinned digest". A docs control needed nothing more: since task-067 its manual is
  its own copy, so `baseline-docs`' digest (`2ac51091da99`) did not change.
- **bug-022** (found by the day checks: an empty `/tmp/.git` made every temporary credential "inside a git checkout"):
  filed on main (`180fc3a`, `4150534`, submitted `98b7cfc`), main merged into the branch (`f0c3167`), criterion 12
  added (`08d5e82`), red `c82cd35`, fix `c393358`: a checkout is a `.git` directory holding `HEAD` or a `.git` file
  starting with `gitdir:`.
- **The admission** (criteria 4–7, 10): red `358be8c`, code `77b4fea`. The register's `wingfoil` `v0.3.0` entry (five
  passes, evidence from the tag and this task); the manual's "This arm" now cites release 0.3.0 and adds two of the
  guide's rules (the verbs act only on committed documents; start or end a workflow only when asked); `provides`:
  `workflow-engine: true` (the engine records and routes, executes no step), `mcp-tools: false`; the telemetry comment
  and the setup's comments re-checked; `v0-2-reference.yaml` pins `v0.3.0` and the arm's digest (`39b7c4c64454`, then `45a5cce3de19` after review round 1's setup comment);
  `v0-2-bridge.yaml` keeps `680b19f27c9f`, read from history (its test reads task-086's manual "release 0.2.2"); the
  method page's T10 and wingfoil paragraph.
- **The setup on v0.3.0** (criterion 8): red `1adf272` (the W3 docker test and `test/fixtures/campaigns/arms.yaml`
  pinned to `v0.3.0`), then the docker W3 test run against the clone: **1 passed** (init with no TTY, the scenario's
  configuration, the approver member, the fake agent's approval round trip, the harness built from `cc31d7a8`).
- **The S8 fixture** (criterion 9, `ba51eac`): regenerated from a dry run of S8@1.0 in baseline-docs with the fake
  agent, in a scratch copy of the branch with a v0.3.0 profile (no agent session: the snapshot is made before the
  steps). The new `.wingfoil/` includes by name, adds `plan.md` and `agents/built-in/{claude-code,codex-cli}.yaml`;
  `S8.PROJECT_RULES.md` changed in one line (0.3.0's `doc-versioning` directive). The generator's acceptance test
  (@F2.5) passes on it. K5 (`scenarios/README.md` 1.4) says v0.3.0.

### Where the build departs from the Design

1. **`TEMPLATE_COMMIT` not moved** (`src/results/finding.ts`): it names the WingFoil whose Memory templates a finding
   note follows, and 0.3.0's `bug` and `decision-log` templates add fields (`reported_by`, a Retrospective section).
   Moving it means changing the finding export: a follow-up, for the approver.
2. **No docker test of the bridge's arm read from history**: the unit tests read it from the real history
   (`v0-2-campaigns.test.ts`, task-086's manual) and from a scratch repository (`arm-history.test.ts`); v0.2.2's setup
   itself ran in v0.1's campaigns and task-049's docker tests. The bridge's dry runs at calibration are the first runs
   of it on this code.
3. **The capabilities test came after the code** for `workflow-engine: true` (`ba51eac` after `77b4fea`): the TDD order
   slipped for that one value.
4. **`dl-017` is not edited**, as planned; `scenarios/dry-run.yaml` stays calibration's (v0.2.2) and the governance CLI
   (`vendor/`) stays as it is.

### Checks (offline, niced)

- `tsc` and lint clean (lint read in full). Unit and acceptance: 105 files, 1635 passed, 8 skipped. `test:bin` 8/8.
  Docker: W3 on v0.3.0 1/1. No real-agent session, no spending.

### Review

- **Round 1** (independent read-only Explore subagent, on `961999a`): not clean. Red `10e2f98`, fixes in the commit
  after it. Findings and outcomes:
  1. should-fix, close to blocking — **dry runs ignored the pinned digest**: `checkDryRun` loaded the tree's arm, so a
     wingfoil dry run on a v0.2.2 profile ran 0.3.0's arm, and the estimate matched dry runs by arm name only.
     **Fixed:** a dry-run profile may pin `arm_digests` (read from history as a campaign's are); a dry run's identity
     includes its arms' digests; the estimate counts a dry run only when its recorded `arm_digest` matches the
     campaign's pin (one stored before arm digests still counts); tests. **For calibration:** the bridge's dry runs need
     a profile with WingFoil v0.2.2 and `arm_digests: { wingfoil: 680b19f27c9f }`; the reference's a v0.3.0 profile
     (`--profile`, task-094). `scenarios/dry-run.yaml` stays calibration's to set.
  2. should-fix — baseline-docs keeps one digest in both campaigns while its generated rules differ (0.3.0's
     `doc-versioning` text). **Stated** in experiment design 1.5 §6.
  3. should-fix — the cached arm was rewritten in place, and a stale extra file made a false refusal. **Fixed:** written
     aside, then renamed into place whole; test.
  4. should-fix — criteria partly tested. **Added:** `campaign run` naming the commit, a v0.3.1 pin refused, an arm the
     tree no longer has (these two passed at once: characterization). The `workflow-engine` order slip stays as stated.
  5. should-fix — two departures not listed. **Listed** below (5, 6).
  6. nit — the bridge test needs the real history. **Fixed:** skipped on a shallow clone.
  7. nit — experiment design 1.5 said a run "mostly records checkpoints". **Fixed:** the engine stays unstarted, as the
     method page says.
  8. nit — `workflow-engine: true` though runs never start it. **Stated** in K5 (1.4).
  9. nit — `setup.sh`'s "process template" comment. **Fixed** (the arm's digest moved to `45a5cce3de19`, pinned).
  10. nit — bug-022's fix confirmed.

Departures added to the list above:

5. **`recordedArm` not moved:** the runner reads history synchronously (`src/arms/history.ts`, `checkCampaign` is
   synchronous), the site keeps its asynchronous `recordedArm`; both digest with `armDigestOf`.
6. **The cache is `.cache/arms/<commit>/`**, not the execution's `runs/` area: the arm is read at `checkCampaign`, before
   an execution exists; `.cache/` is ignored.

- Checks after round 1: `tsc` and lint clean; unit and acceptance 1642 passed, 8 skipped.
- **Round 2** (a new independent read-only Explore subagent, on `5f91107`): round 1's outcomes confirmed; not clean.
  Spec `04e1e50`, red `ed24e1f`, fixes in the commit after it.
  1. should-fix — the estimate never compared the WingFoil version a dry run ran with a version pin (only a commit
     pin), so a dry run of 0.3.0's arm on the default v0.2.2 profile would count for the reference silently. **Fixed:**
     a dry run counts only if its stored profile (`dry-run.yaml` beside it) pinned the harness at the campaign's pin,
     for a harness arm and for a docs control (by its source arm's harness), which also settles finding 3; test.
  2. should-fix — the dry-run behaviours were not in the specification. **Fixed:** requirements 1.33 amend REQ-CLI-05
     (a profile's `arm_digests`; a dry run's identity) and REQ-CLI-02 (the estimate by arm digest and harness pin).
  3. nit — a baseline-docs dry run on another WingFoil counted. **Fixed** with 1.
  4. nit — the cache's remove-then-rename window, a race, leftover staging directories. **Fixed:** an arm already
     cached at that commit is reused untouched; staging is removed in `finally`; a rename that loses a race keeps the
     other process's copy when it digests right; test.
  5. nit — every dry run's identity changed. **Stated** in REQ-CLI-05 1.33: one interrupted before this change is not
     found again and starts afresh.
  6. nit — order: round 1's `campaign run` test came in its fix commit, and that commit also fixed the red fixture
     (`leak-scan.yaml`), so two red dry-run tests first failed for that reason. **Recorded here.** The refusal names
     the profile for a dry run; the campaign's text, which @F7.2 pins, is unchanged.
- Checks after round 2: `tsc` and lint clean; the touched tests and @F7.2 green; unit and acceptance re-run below.
- **Round 3** (a new independent read-only Explore subagent, on `6fbfafe`): round 2's outcomes confirmed (the harness
  map is keyed by arm name, as `harnessOf` assumes); one nit and two cosmetic points. Red `79a686c`, spec `a0f4414`,
  fix `1564e10`.
  1. nit — pins compared as `commit ?? version` on each side, so a profile naming the commit of the pinned version was
     skipped (safe, but a paid dry run lost). **Fixed:** the same version, or commits (either side's, or a version
     that is a commit) one a prefix of the other; test.
  2. nit — REQ-CLI-02 1.33 did not say a dry run stored without its profile counts. **Fixed.**
  3. cosmetic — a commit pin printed bare in the skip. **Fixed:** `version (commit12)`.
- **Round 4** (a new independent read-only Explore subagent, on `9c8c053`): round 3's cases checked (same release,
  different releases, commit prefixes, a version that is a commit, a release against a commit alone: skipped, rightly).
  Red `6dfa714`, fix `b054aa0`.
  1. nit — the same version counted even when both pins named different commits (a re-tagged release). **Fixed:** when
     both name a commit, the commits decide; test.
  2. cosmetic — `COMMIT_PIN` now the third copy of the commit pattern (`src/runner/estimate.ts`, `src/site/model.ts`).
     **Left:** two copies predate this task; folding them is a refactor for another task.
- **Round 5** (a new independent read-only Explore subagent, on `b172d4a`): **clean on logic**; two low nits. (1) long
  lines in `dry-runs.ts`: prettier and lint accept them, left. (2) an empty `commit:` in a stored profile would match
  every commit: **fixed**, only a commit-shaped value counts (`COMMIT_PIN`). No further round: the review is closed.
- Checks on `5537e2b`: `tsc` and lint clean; unit and acceptance 105 files, 1646 passed, 8 skipped; `test:bin` 8/8.
  The docker W3 test on v0.3.0 ran on `1adf272`'s arm; the setup's comment has changed since (the arm's digest with
  it), so the full suites re-run it.

### Review and approval
