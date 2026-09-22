# Acceptance — Scenarios (v0.1)
# Traces to: F3.1–F3.6, F6.1–F6.3, F6.8 · J3 · scenario specs (docs/02_specification/scenarios/) · K1–K5
# Version: 1.0 · Status: Approved (2026-09-22)

Feature: Scenario format, hygiene and the v0.1 scenario content
  As the WingFoil maintainer acting as scenario author
  I want scenarios in a checked format, without leaks, versioned and calibrated
  So that every arm faces the same, fair task, and older results stay comparable

  @F3.1
  Scenario: A scenario declares everything the runner and the scorer need
    Given a scenario directory
    Then it declares: an ID, a version, the seed, one prompt per step, the oracle reference, primary and secondary categories, result profiles, the GQM questions it answers, and the capabilities it exercises

  @F3.2
  Scenario: A well-formed scenario passes the validator
    Given scenario S1 as specified
    When the maintainer validates it
    Then validation passes

  @F3.2 @error
  Scenario: A step prompt that names a harness is rejected
    Given a step prompt of S3 that mentions "WingFoil"
    When the maintainer validates S3
    Then validation fails
    And the message names the step and the offending text

  @F3.2 @error
  Scenario: Oracle content that appears in the seed or the prompts is rejected
    Given a hidden test of S2 whose expected value also appears in a step prompt
    When the maintainer validates S2 with the hold-out path configured
    Then validation fails
    And the message names the file and the step, without printing the hold-out content

  @F3.3
  Scenario: A dry run measures the real cost of a scenario in one arm
    When the maintainer dry-runs S1 in the wingfoil arm with the real agent
    Then one run of S1 is executed in that arm
    And its cost per step and in total is recorded as the dry-run cost of S1 in that arm
    And the result is marked as a dry run and never appears in published results

  @F3.4
  Scenario: Changing a scenario creates a new version
    Given S1 at version 1.0 has stored results
    When the maintainer changes a step prompt of S1
    Then S1 must be registered as a new version before it can run
    And the stored results keep pointing to version 1.0

  @F3.5
  Scenario: Hold-out additions are used for scoring only
    Given the hold-out path is configured
    And the hold-out contains additional tests for S1
    When a run of S1 is scored
    Then the hold-out tests are executed on the run's snapshots
    And their results are reported apart from the public tests

  @F3.5 @error
  Scenario: A missing hold-out does not break scoring of public oracles
    Given the hold-out path is not configured
    When a run of S1 is scored
    Then the public oracle is scored
    And the report states that hold-out additions were not scored

  @F3.6
  Scenario: A scenario that needs a missing harness capability is an expected failure
    Given a scenario that declares the capability "workflow engine"
    And the WingFoil under test does not provide it
    When the scenario runs in the wingfoil arm
    Then the run is executed normally
    And its result is marked "expected failure", naming the missing capability
    And it is published as a loss, never skipped

  @F6.1 @F6.2 @F6.3 @F6.8
  Scenario Outline: Each v0.1 scenario is ready for a campaign
    Given scenario <id> as specified in docs/02_specification/scenarios/<id>.md
    When the maintainer validates it and dry-runs it in each of the three arms
    Then validation passes
    And every arm has a recorded dry-run cost
    And the public oracle scores the dry runs without errors

    Examples:
      | id |
      | S1 |
      | S2 |
      | S3 |
      | S8 |
