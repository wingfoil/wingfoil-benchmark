---
id: task-095-wingfoil-v0-3-0-admitted-to-the-wingfoil-arm-the-bridge-s-arm-read-by-its-pinned-digest
type: task
title: "WingFoil v0.3.0 admitted to the wingfoil arm, the bridge's arm read by its pinned digest"
status: backlog
release: v0.2
wave: calibration
features: [F7.4, F7.2]
acceptance: []
requirements: [REQ-FMT-11, REQ-FMT-13, REQ-FMT-01, REQ-FMT-06, REQ-RUN-03, REQ-RUN-11, REQ-RUN-12, REQ-RUN-14, REQ-FMT-10]
fixes: []
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
