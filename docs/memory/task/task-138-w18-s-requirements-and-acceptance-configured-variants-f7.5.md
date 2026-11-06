---
id: task-138-w18-s-requirements-and-acceptance-configured-variants-f7.5
type: task
title: "W18's requirements and acceptance: configured variants (F7.5)"
status: in-progress
release: v0.3
wave: W18
features: []
acceptance: []
requirements: [REQ-ARC-03, REQ-FMT-01, REQ-FMT-04, REQ-FMT-05, REQ-FMT-08, REQ-FMT-13, REQ-RUN-03, REQ-RUN-11, REQ-RUN-20, REQ-SCO-08, REQ-RES-02, REQ-RES-10, REQ-CLI-11, REQ-CLI-14]
fixes: []
tags: ["v0.3","specification","w18"]
---

## Context

[plan-005](../../plans/plan-005-release-v0-3.md)'s W18, "Configured variants" (F7.5): its requirements and acceptance
first, as each wave's first task (plan-005 step 1), then
[bug-034](../bug/bug-034-symlinks-spaces-and-line-endings-in-scenario-and-arm-files-are-handled-inconsistently.md)
(delivery order item 4, before any arm file written by an agent), then the configuring agent, then the configured arms
and their docs controls, and W18's "Ends with": every arm, the configured ones included, in a dry run.

The vision and the experiment design already state F7.5
([task-103](task-103-the-v0-3-vision-and-experiment-design-amendments.md): `06_features.md` 1.4,
`09_experiment-design.md` 1.7 §2 and T12, the scenario conventions' K7). This task carries them
into `requirements.md` and drafts the acceptance scenarios, so that each later task starts from a stated, red-first
criterion. A specification change: no code, no real-agent session, nothing spent.

The approver's choices in chat (2026-11-06):

1. **What the configuring agent sees:** the scenario version's seed, its `README.md` included, and the harness as its
   arm's setup installs it (the tool's own files and documentation), with the same network access as a run; never the
   prompts, the oracle or the hold-out.
2. **Its agent and model:** Claude Code on `claude-sonnet-5-5`, the `reference` preset's default model; the same for
   every harness.
3. **The scope:** S1, S2, S3 and S8 at 1.1; not S10, and no 1.0. For S8, whose 1.1 already holds a wingfoil
   configuration for the project (dl-005), the configuring agent starts from it and extends it.
4. **The spending:** the configuring agent's sessions (four scenarios × three harnesses) are a later task's, with the
   approver's consent on an estimate; nothing is spent before it.

## Acceptance criteria

<!-- A specification change, as task-126: this task amends the requirements and drafts each acceptance scenario's
     text; the task that implements an item adds the scenario to its `.feature` with its test, red first. -->

1. **The configured arms (REQ-FMT-05, REQ-ARC-03):** `wingfoil-configured`, `speckit-configured` and
   `openspec-configured`, each its harness arm plus the scenario version's configuration for it, in
   `scenarios/<id>/<version>/arms/<arm>-configured/`; a configured arm on a scenario version with no configuration
   for it is refused by `validate`, naming the scenario and the arm. Scenario drafted for its task
   (`competitors.feature` or `campaign.feature`, as the implementing task finds fitting).
2. **The configured docs controls (REQ-RUN-11):** `baseline-docs-configured`, `speckit-docs-configured` and
   `openspec-docs-configured`, each generated mechanically by its harness's generator from the configured arm's
   configuration as captured after setup; the generator's declaration of what it renders holds for them too, and the
   method page states it. Scenario drafted (`runner.feature`).
3. **The configuring agent (a new requirement):** a command (named by its task) runs it once per scenario version and
   harness, in a container holding the seed and the harness installed by its arm's setup, and nothing else of the
   scenario; one prompt, one agent and one model for every harness, the prompt a file of the repository; it writes
   only the configuration's directory, which then holds the configuration and a record of the session (agent, model,
   prompt digest, harness pin, usage, cost, wall time; never a credential). A configuration that already exists is
   not overwritten unless asked. Scenarios drafted (`scenarios.feature`).
4. **The configuration is scenario content (REQ-FMT-04, REQ-FMT-08):** pinned by the scenario's hash, as REQ-FMT-13
   as amended in 1.33 states for a scenario's arm configuration; the leak scan covers it (no oracle literal, no step
   prompt's text); a symbolic link in it is refused (bug-034's rule). Only versions 1.1 hold one; S8's extends the
   wingfoil configuration its 1.1 already holds. Scenario drafted (`scenarios.feature`).
5. **Its cost in M-K3 (REQ-SCO-08, REQ-RUN-03):** the configuration's record gives M-K3's one-off part (REQ-SCO-08 as
   amended in 1.49), once per scenario version and harness, not per run, and the configured arm's setup its per-run
   part as for any arm. Scenario drafted (`scoring.feature`).
6. **Published (T12, REQ-RES-10):** the method page states the configuring agent, its model and prompt, and each
   configuration's difference from the tool's defaults; the setup contest form covers a configured arm's
   configuration. Scenario drafted (`results.feature`).
7. `requirements.md` 1.50 records the amendments and their source; `traceability.md` gains the rows; the scenario
   conventions need no change (K7 already states the per-version configuration). Characterization of the documents'
   consistency: `scripts/pre-review.sh main` green.

## Design

- Documents only: `docs/02_specification/requirements.md` (1.50) and `docs/02_specification/traceability.md` (1.7);
  the scenarios drafted below, for the implementing tasks.
- Names: the `-configured` suffix for every configured arm and docs control (experiment design 1.7 §2), so that a
  configured arm and its base arm never share a path or a group.
- **Decided here, beyond the criteria's wording** (for the approver's review):
  - a configured arm is a directory of its own under `arms/`, declaring `configured_of` and borrowing everything else
    from its base arm; its digest covers both directories (REQ-FMT-05, REQ-FMT-13); its harness pin is its base
    arm's `harnesses` entry, checked against the configuration's record (REQ-FMT-01);
  - the docs controls' names, `baseline-docs-configured`, `speckit-docs-configured` and `openspec-docs-configured`
    (the experiment design names only the three configured arms);
  - the command is `bench scenario configure` (REQ-CLI-14); the prompt and the profile are `configuring/prompt.md`
    and `configuring/profile.yaml`, the profile carrying the harness pins;
  - **what the configuring agent sees is the workspace a run of the harness arm starts step 1 from:** the setup, the
    scenario's base configuration (S8's wingfoil directives), the merged manual and the project rules REQ-FMT-14
    generates (S8's rules for Spec Kit and OpenSpec). Criterion 3's "nothing else of the scenario" and choice 1 hold
    for what is not the arm's setup; the review's round 1 asked for it (finding 2);
  - the configuration is what the session added or changed outside the seed's files and the manual; a deletion, a
    link, a changed seed file or a changed manual refuses it (REQ-RUN-20);
  - in a run, the configuration is copied after the whole setup and before the setup commit (REQ-RUN-03);
  - the records live in the scenario version's `configured/`, beside the configuration, not in its directory as
    criterion 3 reads, so that the configuration's directory holds only what is copied into the workspace;
  - M-K3 counts every session's cost, refused, killed and replaced ones included, for the configured arm and its
    docs control (REQ-SCO-08);
  - a correction after a contest is a new scenario version (REQ-RES-10), since a configuration is scenario content;
    `--replace` only before any execution has run the version;
  - the method page quotes the prompt in full rather than linking a separate page (REQ-RES-02);
  - **nothing is written to a version's configurations once any run, a dry run's included, has recorded its hash**
    (REQ-FMT-04): every configuration of S1, S2, S3 and S8 at 1.1 is written before their first 1.1 run, and a
    later one needs a new version. No 1.1 run exists on 2026-11-06. The alternative, configurations pinned by a
    digest of their own outside the scenario's hash, keeps 1.1 open longer but adds a pin to every campaign; review
    round 2 offered both (its blocker);
  - **the manual and the MCP server are absent during the configuring session** (REQ-RUN-20): the run's manuals
    differ per harness, so leaving them would break "one prompt for every harness" (T12); the agent works with the
    tool's own files and command line;
  - the profile's agent, harness pins and caps fixed in one file, no other accepted; the transcript kept as a run's
    and packed into each execution's asset that runs the configuration (REQ-CLI-11);
  - "holds a configuration" as the newest record `written` with exactly its files; a replaced directory replaced only
    on a `written` outcome;
  - a run, and a configured docs control's generation, refused when the generated project rules differ from the
    record's (REQ-RUN-03, REQ-RUN-11);
  - a campaign's records share one prompt and profile SHA-256, each held by some commit (REQ-FMT-01); the prompt
    scanned by `configure` before any session (REQ-FMT-08);
  - the command requires `--allow-spending`, as every real-agent command does, and exits 1 for a refusal, 2 for a
    usage error only (REQ-CLI-14).
- Left to the implementing tasks: the prompt's text (reviewed by the approver before any session), the record's exact
  field names, and where each drafted scenario lands among the `.feature` files.

## Execution notes

- `requirements.md` 1.50: eleven requirements amended (REQ-ARC-03, REQ-FMT-01, 04, 05, 08, 13, REQ-RUN-03, 11,
  REQ-SCO-08, REQ-RES-02, 10), each gaining F7.5 in its column, two added (REQ-RUN-20, REQ-CLI-14), and the
  amendment's section; review round 1 rewrote the first draft (below). REQ-FMT-01, REQ-FMT-13, REQ-RES-02 and the two
  new ones join the frontmatter's `requirements`. `traceability.md` 1.7: F7.5's row in §2, T12's in §3.
- **The scenarios drafted** (each written into its `.feature` by the task that implements it, red first):

  ```gherkin
  Scenario: A configured arm runs its base arm with the scenario's configuration over it
    Given "wingfoil-configured" declares configured_of "wingfoil"
    And S8 1.1 holds a configuration for "wingfoil-configured"
    When a run of "wingfoil-configured" on S8 1.1 is set up
    Then the wingfoil setup runs, S8's wingfoil configuration is copied, and the configured one over it
    And the arm's digest covers its own files and the wingfoil arm's

  Scenario: A configured arm on a version with no configuration is refused
    Given a campaign that runs "speckit-configured" on S2 1.0
    When the campaign is validated
    Then it is refused, naming S2 1.0 and "speckit-configured"

  Scenario: A configured docs control is generated from the configured arm
    Given "baseline-docs-configured" declares docs_of "wingfoil-configured"
    When its environment is generated for S1 1.1
    Then it renders what baseline-docs renders, read from the configured arm after its setup and copy

  Scenario: The configuring agent sees the seed and the installed harness only
    When the configuring agent runs for S3 1.1 and "openspec"
    Then its workspace holds the seed and the openspec arm's setup
    And no step prompt, oracle file, hold-out file or other arm's configuration

  Scenario: The configuring agent writes what it added or changed, and its record
    When a configuring session adds two files and changes one
    Then the three files are written to "arms/openspec-configured/" of the scenario version
    And "configured/openspec-configured.json" records the agent, model, prompt digest, pin, usage, cost and files

  Scenario Outline: A configuring session's result is refused when it touches what is not configuration
    When a configuring session <does>
    Then no configuration is written, its record states the refusal, and the command exits 1

    Examples:
      | does                         |
      | deletes a file               |
      | writes a symbolic link       |
      | changes "src/index.ts"       |
      | writes CLAUDE.md             |

  Scenario: The configuring agent for Spec Kit on S8 sees S8's project rules
    When the configuring agent runs for S8 1.1 and "speckit"
    Then its workspace holds the constitution REQ-FMT-14 generates from S8's rules
    And its record holds that constitution's SHA-256

  Scenario: A configured arm's copy comes after the project rules and before the setup commit
    Given S8 1.1 holds a configuration for "speckit-configured" that extends the generated constitution
    When a run of "speckit-configured" on S8 1.1 is set up
    Then the workspace holds the configured constitution, and "setup/diff.patch" holds it
    And a run whose generated rules differ from the record's is refused before step 1

  Scenario: A campaign whose pins differ from the configuration's record is refused
    Given S1 1.1's record for "wingfoil-configured" pins wingfoil v0.3.1
    And a campaign that runs "wingfoil-configured" on S1 1.1 with harnesses.wingfoil at v0.3.2
    When the campaign is validated
    Then it is refused, naming S1 1.1, "wingfoil-configured" and "harnesses"

  Scenario Outline: A version a run has recorded is never configured again
    Given a dry run under "results/dry-runs/" has run S1 1.1
    When "bench scenario configure S1@1.1 --arm <arm> --allow-spending <flag>" runs
    Then it is refused before any session, and exits 1

    Examples:
      | arm     | flag      |
      | speckit |           |
      | wingfoil| --replace |

  Scenario: An existing configuration is kept unless replaced
    Given S1 1.1 holds a configuration for "wingfoil-configured"
    When "bench scenario configure S1@1.1 --arm wingfoil --allow-spending" runs
    Then it is refused before any session, and exits 1

  Scenario: A version 1.0 is never configured
    When "bench scenario configure S1@1.0 --arm wingfoil --allow-spending" runs
    Then it is refused, naming the approver's choice, and exits 1

  Scenario: The leak scan covers a configuration
    Given a configuration file holds an oracle literal of S2 1.1
    When S2 1.1 is validated
    Then the scan fails, naming the file and the configuration, not the literal

  Scenario: The configuring cost counts once in M-K3, every session's
    Given S1 1.1's records for "wingfoil-configured": a refused session of 0.10 EUR and a written one of 0.40 EUR
    When the execution is aggregated
    Then M-K3 of "wingfoil-configured" and "baseline-docs-configured" on S1 1.1 include 0.50 EUR once
    And M-K3 of "wingfoil" does not

  Scenario: The configuring session runs without the arm's manual and MCP server
    When the configuring agent runs for S1 1.1 and "wingfoil"
    Then the workspace holds no CLAUDE.md and no MCP server is attached during the session
    And the merged manual is back after it

  Scenario: A configuring session killed at a cap writes its record only
    When a configuring session is killed at the step time cap
    Then its record has the outcome "killed", its cost at its bound and cost_reported false, and no configuration

  Scenario: A configuring prompt that names a harness is refused before any session
    Given "configuring/prompt.md" names "Spec Kit"
    When "bench scenario configure S1@1.1 --arm speckit --allow-spending" runs
    Then it is refused before any session, naming the prompt, and exits 1

  Scenario: Without --allow-spending nothing runs
    When "bench scenario configure S1@1.1 --arm speckit" runs
    Then it exits 2 with the usage, and no session starts

  Scenario: A symbolic link in a configuration is refused
    Given "arms/openspec-configured/" of S3 1.1 holds a symbolic link
    When S3 1.1 is loaded
    Then it is refused, naming the link

  Scenario Outline: A campaign whose configurations disagree with their pins is refused
    Given a campaign that runs "wingfoil-configured" on S1 1.1 and "speckit-configured" on S2 1.1
    And <difference>
    When the campaign is validated
    Then it is refused, naming the scenario, the arm and the field

    Examples:
      | difference                                                                   |
      | S1 1.1's record names a base-arm digest the configured arm's pin does not resolve |
      | the two records carry different prompt SHA-256                               |
      | a record's profile SHA-256 is held by no commit                               |

  Scenario Outline: A configured arm declares only its name and its base
    Given "arms/wingfoil-configured/arm.yaml" declares configured_of "<base>" and <extra>
    When the arm is loaded
    Then it is refused, naming the field

    Examples:
      | base                | extra             |
      | wingfoil            | setup "setup.sh"  |
      | speckit-configured  | nothing else      |
      | baseline            | nothing else      |

  Scenario: The contest form covers a configured arm's configuration
    When the contest form is read
    Then it lists the configured arms and asks whether the setup or the configuration is contested

  Scenario: The method page states the configuring agent and each configuration
    When the site is built for an execution that ran "speckit-configured" on S1 1.1
    Then the method page names the agent, the model and the caps, and quotes the prompt with its SHA-256
    And lists the configuration's files, the session's patch against the setup's workspace, and the files its docs
      control did not render
  ```

- No code, no `results/`, `site/`, arm or scenario file changed; nothing spent.
- **For the approver, not done here:** choice 1 extends F7.5's "sees only the seed and the README"
  (`06_features.md`, experiment design §2, plan-005) to the harness as its setup installs it; the vision documents
  still read the shorter form. An erratum in this task, or a note in the vision's next amendment, is the approver's
  choice (review round 2).

## Review

Independent reviews (dl-020), each a fresh read-only agent on a clone under `/tmp/claude-1000/`; main's HEAD and
reflog checked unchanged after each.

**Round 1** (`fd18b69a`): 2 blockers, 12 should-fix, 6 nits; all taken, requirements 1.50 rewritten from main.

| # | Finding | Outcome |
|---|---|---|
| 1 | blocker: the leak scan reads an arm's lines against the seed, so a configuration repeating the README fails | REQ-FMT-08: a configuration's lines are needles against the prompts only |
| 2 | blocker: S8's Spec Kit and OpenSpec rules (REQ-FMT-14) and the configured copy's order unstated | REQ-RUN-20 sees the whole setup, rules included; REQ-RUN-03 copies after it; the rules' SHA-256 checked |
| 3 | changes to seed files and the manual captured as configuration | REQ-RUN-20 refuses them |
| 4 | REQ-RUN-03's base overlay misdescribed; the copy unplaced against the setup commit | the setup script applies it, as today; the copy before the setup commit |
| 5 | the image and the harness pin of the configuring profile undefined | the profile holds `harnesses`; its image built as a dry run's |
| 6 | no rule ties a campaign's pins to the record | REQ-FMT-01 amended: `validate` refuses a mismatch |
| 7 | `--replace` edits a run version in place and drops the earlier cost | refused once an execution ran the version; records kept |
| 8 | "configuration" and "record" ambiguous | "holds a configuration" defined (REQ-FMT-04); every record's cost in M-K3 |
| 9 | a diff cannot be read from paths and digests; the site's sources not extended | the session's patch kept; REQ-RES-02 names its sources; the prompt quoted |
| 10 | a docs control's digest analogy does not hold | REQ-FMT-13 amended: both directories, one commit |
| 11 | the prompt's scan undefined | REQ-FMT-08: by `scenario configure`, harness names and the version's literals |
| 12 | the same prompt across records unchecked; a correction must re-configure every harness | REQ-FMT-01 and REQ-RES-10 amended |
| 13 | criterion 3's record location and "nothing else" differ from REQ-RUN-20 unflagged | listed under Design's decided-here |
| 14 | the docs controls' names are new | listed under Design's decided-here; REQ-FMT-05's citation fixed |
| 15–20 | nits: `docs_directives`, `environment`, a killed session's cost, exit codes and consent, "configured" hold-out, F7.5 in the columns | all taken |

**Round 2** (`b1a2d0fc`): 1 blocker, 10 should-fix, 10 nits; round 1's findings 5, 6 and 12 partly resolved and 18
not. All taken; the vision's wording left to the approver.

| # | Finding | Outcome |
|---|---|---|
| 1 | blocker: a first write after a run of the version still edits a hashed version | REQ-FMT-04: nothing written once any run, a dry run's included, recorded the hash; Design names the alternative |
| 2 | exit 2 is the CLI's usage error | refusals exit 1; 2 for usage only |
| 3 | `--yes` and a confirmation diverge from `--allow-spending` | `--allow-spending` required |
| 4 | the base digest check undefined when the base arm is not in the campaign | compared with the base files the configured pin resolves |
| 5 | records not checked against the prompt and profile files | each SHA-256 held by a commit; the site reads them from history |
| 6 | the scan's two directions and "lines" for non-Markdown files unclear | two checks stated: literals in every file; `.md` lines against the prompts |
| 7 | the run's manual and MCP server present during the session break T12 | both absent during the session |
| 8 | the transcript's publication unstated in REQ-RES-06 and REQ-CLI-11 | REQ-CLI-11 amended; the file named `transcript.jsonl` |
| 9 | untracked and ignored outputs ambiguous | compared by git: tracked and untracked not ignored |
| 10 | scenarios missing (link, contest form, killed session, prompt scan, pins, arm.yaml) | drafted |
| 11 | Design's decided-here list incomplete | completed |
| 12–21 | nits: "the tool's defaults" on S8, K6 and K7 cited for what they do not say, the profile's image and effort, which setup applies `~/scenario`, the docs control's rules check, "exactly the record's files", files the docs control does not render, T3 and the vision | taken; the vision's wording left to the approver |
