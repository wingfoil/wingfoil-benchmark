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
  Scenario: Break-even is computed only when quality is not worse
    Given the wingfoil arm's M-Q1 is not lower than the baseline's on S3
    And the wingfoil arm's mean step cost is lower than the baseline's
    When break-even is computed for S3
    Then M-K4 equals the wingfoil setup cost divided by the difference in mean step cost

  @F4.4
  Scenario Outline: Break-even special cases
    Given on S3 the wingfoil arm's quality is <quality> the baseline's
    And its mean step cost is <step cost> the baseline's
    When break-even is computed for S3
    Then M-K4 is reported as "<result>"

    Examples:
      | quality       | step cost        | result         |
      | lower than    | lower than       | not applicable |
      | not lower than | not lower than  | never          |

  @F4.5
  Scenario: Determinism is measured across repetitions
    Given 3 completed repetitions of S1 in the wingfoil arm with the same pins
    When determinism is computed
    Then M-R1 is the share of hidden tests with the same verdict in all 3 repetitions
    And M-R2 is the mean pairwise Jaccard similarity of the public interfaces
    And M-R3 is the mean pairwise Jaccard similarity of the file-path sets, excluding generated and harness files
    And no threshold of equivalence is applied

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

  @F4.8
  Scenario: Directive violations are counted per rule and per step
    When a run of S8 is scored
    Then M-E1 records the violations of R1, R2, R3 and R4 for each step snapshot

  @F4.8
  Scenario: Governance checks do not depend on a harness's format
    Given two runs of S3 that record the D3 revision, one in a WingFoil decision-log and one in a plain notes file
    When M-F1 is computed for both
    Then D3 counts as consistent in both runs
