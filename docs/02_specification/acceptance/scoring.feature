# Acceptance — Scoring (v0.1)
# Traces to: F4.1–F4.5, F4.7, F4.8 · J2 steps 5–6 · experiment design §4 (M-Q*, M-D*, M-K*, M-F*, M-E1, M-R*)
# Version: 1.0 · Status: Approved (2026-09-22)

Feature: Scoring runs with defined, reproducible metrics
  As the WingFoil maintainer
  I want every metric computed outside the container, from the per-step snapshots, as defined in the experiment design
  So that the numbers mean the same thing in every arm and every campaign

  Background:
    Given a completed run with one committed snapshot per step

  @F4.1
  Scenario: Hidden tests run outside the container on each snapshot
    When the run is scored
    Then the scenario's hidden tests are executed in a scoring environment separate from the run container
    And M-Q1 is recorded for the final snapshot and for every step that defines tests

  @F4.1
  Scenario: Scoring the same snapshot twice gives the same result
    Given a run that was already scored
    When it is scored again with the same oracle version
    Then every recorded metric is identical

  @F4.2
  Scenario: Static quality is reported per indicator
    When the run is scored
    Then M-Q2 records, for the files changed by the run: lint findings per 1,000 lines, mean and maximum cyclomatic complexity, duplicated-line percentage, and test coverage
    And no composite score is produced

  @F4.3
  Scenario: Cost metrics are recorded per step and per run
    When the run is scored
    Then M-K1 and M-K2 are recorded per step and summed per run: tokens by kind, API-equivalent cost in euro, wall time, turns and interventions

  @F4.4
  Scenario: Break-even reads the variance on quality and on step cost
    Given an arm whose final M-Q1 is lower within the variance and whose step cost is lower beyond it, three runs a side
    Then break-even is the value, its quality's outcome "within the variance"
    Given its M-Q1 lower beyond the variance
    Then break-even is "not applicable", reason "quality"
    Given fewer than three runs a side and a lower M-Q1 mean
    Then break-even is "not applicable", reason "quality", its quality's outcome "preliminary"
    Given the arm's runs, none of which reached a step, and every baseline run's final M-Q1 above 0
    Then break-even is "not applicable", reason "quality"
    Given an M-Q1 the same or within the variance, and step costs within the variance
    Then break-even is "not applicable", reason "saving within variance"
    Given equal step-cost means, a step cost higher beyond the variance, or fewer than three runs and a higher one
    Then break-even is "never"
    Given fewer than three runs a side and a lower step cost
    Then break-even is the value, its step cost's outcome "preliminary"
    Given three runs a side, one of the arm's reaching no step
    Then the step-cost comparison reads the other two, its n is 2 and its outcome "preliminary"
    Given a side's runs, none of which reached a step: the arm's, three runs a side, with a baseline run at M-Q1 0
    And likewise a baseline none of whose runs reached a step
    Then break-even is "not applicable", reason "not measured"
    And each entry records both outcomes, each with its runs and n

  @F4.4
  Scenario: M-K3 is the one-off cost per scenario version and harness
    Given a configured arm whose configuration cost is recorded once and three runs' setup costs
    Then M-K3 is the configuration's cost plus their mean
    And an arm with no configuration recorded has M-K3 the mean of its runs' setup costs, every model's

  @F4.5
  Scenario: Determinism is measured across repetitions
    Given 3 completed repetitions of S1 in the wingfoil arm with the same pins
    When determinism is computed
    Then M-R1 is the share of hidden tests with the same verdict in all 3 repetitions
    And M-R2 is the mean pairwise Jaccard similarity of the public interfaces
    And M-R3 is the mean pairwise Jaccard similarity of the file-path sets, excluding generated and harness files
    And no threshold of equivalence is applied

  @F4.5
  Scenario: M-R2 v2 compares the interface the entry point exposes
    Given two runs whose src/index.ts re-exports the same functions from different modules
    Then M-R2 is 1
    Given two runs with the same files exposing different functions
    Then M-R2 is below 1
    And a module the entry point does not reach is not counted
    And each value records version 2
    Given a run with no src/index.ts
    Then its interface is "(no entry point)"
    Given a reached module that does not parse
    Then its entry is "<file>: (does not parse)"

  @F4.5 @error
  Scenario: Determinism is not computed from a single repetition
    Given 1 completed repetition of S2 in the wingfoil arm
    When determinism is computed
    Then no determinism value is produced for S2
    And the report states "n = 1"

  @F4.7
  Scenario: Next-change cost is attributed to later steps
    When a run of S3 is scored
    Then M-F2 records the cost and the M-Q1 pass rate of steps 2 to 5

  @F4.7
  Scenario: Decision consistency counts explicit revisions as consistent
    Given after step 4 of S3 whole-day bookings still behave as before
    And the repository records that the "whole days only" decision was revised
    When M-F1 is computed
    Then decision D3 counts as consistent

  @F4.7 @error
  Scenario: A silent revision counts as a failure
    Given after step 4 of S3 whole-day bookings still behave as before
    And nothing in the repository records the revision of "whole days only"
    When M-F1 is computed
    Then decision D3 counts as a failure

  @F4.7
  Scenario: A v2 content check reads whole words in the agent's own text
    Given a content check with "match: words" for "revised"
    And a run whose setup added a template holding the line "Mark it revised"
    When a step adds "unrevised" to a source file and the line "Mark it revised" to a new document
    Then the check fails: a stem is not a word, and the template's line is not the agent's
    When the step also adds the front-matter line "title: D3 revised" to the document
    Then the check passes, matched in the document
    When the step adds "D3 revised" to the seed's README instead
    Then the check passes, matched in the README
    And in a scenario with a separate approver, a commit the verdict hook made saying "revised" does not count
    And the agent's own "Reason: D3 revised" in the commit of a harness command counts

  @F4.7
  Scenario: The maintainer's judgement is shown beside a content check's verdict
    Given judgements.json holds the maintainer's judgement of a v2 content check at a step of a run
    When the site is built
    Then the execution's judgements page shows the automatic verdict and the judgement together
    And the execution's landing page counts the disagreements

  @F4.8
  Scenario: Directive violations are counted per rule and per step
    When a run of S8 is scored
    Then M-E1 records the violations of R1, R2, R3 and R4 for each step snapshot

  @F4.8
  Scenario: Governance checks do not depend on a harness's format
    Given two runs of S3 that record the D3 revision, one in a WingFoil decision-log and one in a plain notes file
    When M-F1 is computed for both
    Then D3 counts as consistent in both runs

  # task-139, bug-034 (requirements 1.51)
  @F4.2
  Scenario: The scoring reads a patch's paths exactly and follows no symbolic link
    Given a setup patch touching a path with a space, a quoted path and a renamed file
    Then every one of their paths is read, and none is measured
    Given a snapshot holding a symbolic link to a file and one to a directory
    Then neither is listed or entered

  @F7.5
  Scenario: The configuring cost counts once in M-K3, every session's
    Given S1 1.1's records for "wingfoil-configured": a refused session of 0.10 EUR and a written one of 0.40 EUR
    When the execution is aggregated
    Then M-K3 of "wingfoil-configured" and "baseline-docs-configured" on S1 1.1 include 0.50 EUR once
    And M-K3 of "wingfoil" does not
