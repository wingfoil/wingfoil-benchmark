# Acceptance — Campaign (v0.1, v0.2)
# Traces to: F1.1, F1.2, F1.3, F1.4 (v0.2) · J2 steps 1–2, 4 · experiment design §3 (pins), §6 (budget) · K4 · bug-013, dl-012
# Version: 1.1 (draft) · Status: Approved (1.0, 2026-09-22); 1.1 in review (2026-10-05)

Feature: Campaign definition, cost estimate and budget guard
  As the WingFoil maintainer
  I want every campaign pinned in one file, with its cost known before it runs
  So that results are reproducible and the budget is never exceeded by surprise

  Background:
    Given the scenarios S1, S2, S3 and S8 are registered with a version
    And each of them has a recorded dry-run cost for every arm

  @F1.1
  Scenario: A campaign file pins every variable
    Given a campaign file that names:
      | field                 | example                       |
      | harness versions      | wingfoil@3df305e              |
      | scenarios             | S1@1.0, S2@1.0, S3@1.0, S8@1.0 |
      | arms                  | baseline, baseline-docs, wingfoil |
      | agent and version     | claude-code@<version>         |
      | model id              | claude-sonnet-5               |
      | repetitions           | S1: 3, others: 1              |
      | approver policy       | v1                            |
      | currency rate         | EUR per USD                   |
    When the maintainer validates the campaign file
    Then the campaign is accepted
    And the campaign is identified by a digest of the file's content

  @F1.1 @error
  Scenario: A campaign with an unpinned harness is rejected
    Given a campaign file whose wingfoil arm names a branch instead of a commit or version
    When the maintainer validates the campaign file
    Then the campaign is rejected
    And the message names the arm and the unpinned field

  @F1.1
  Scenario: The same campaign file identifies the same campaign
    Given a campaign file that was already run
    When the maintainer runs it again without changing it
    Then the new results are stored under the same campaign identity, as a new execution

  @F1.2
  Scenario: The cost is estimated before any run starts
    When the maintainer asks for the campaign's cost estimate
    Then the estimate lists, per scenario and per arm, the dry-run cost times the repetitions
    And it shows the total in euro, as an API-equivalent cost
    And no agent session is started

  @F1.2 @error
  Scenario: A scenario without a dry run cannot be estimated
    Given scenario S3 has no recorded dry-run cost for the wingfoil arm
    When the maintainer asks for the campaign's cost estimate
    Then the estimate fails
    And the message names S3 and the wingfoil arm, and says to run a dry run first

  @F1.3
  Scenario: A campaign above the warning threshold warns but may start
    Given the estimate is 42 euro
    And the warning threshold is 30 euro and the ceiling is 100 euro
    When the maintainer starts the campaign
    Then a warning shows the estimate and the threshold
    And the campaign starts only after the maintainer confirms

  @F1.3 @error
  Scenario: A campaign above the ceiling refuses to start
    Given the estimate is 130 euro
    And the ceiling is 100 euro
    When the maintainer starts the campaign
    Then the campaign does not start
    And no agent session is started
    And no command-line option can make it start

  @F1.3
  Scenario: A run that exceeds its own cost cap is stopped
    Given a run whose cost cap is 3 euro
    When the run's accumulated cost reaches 3 euro during a step
    Then the step is stopped
    And the run ends with the outcome "cap reached"
    And the snapshot at that moment is kept for scoring

  @F1.3
  Scenario: A campaign stops starting new runs when the budget is spent
    Given the campaign's accumulated cost reaches the ceiling
    When the next run would start
    Then it does not start
    And the campaign ends with the outcome "budget exhausted"
    And the completed runs are kept and can be scored

  # Added in 1.1 (v0.2, draft, in review 2026-10-05): F1.4 resumable campaign, bug-013, dl-012.

  @F1.4
  Scenario: An interrupted campaign stops cleanly
    Given a campaign execution with runs still to start
    When the maintainer interrupts it during a run
    Then the current run is recorded as interrupted, its step counted at its bound, and its container removed
    And the execution is recorded as stopped, with why

  @F1.4
  Scenario: A resume re-runs only what infrastructure stopped
    Given a stopped execution holding a completed run, a run that reached its cost cap, a run failed by the infrastructure, an interrupted run, a run stopped at the subscription's quota and runs never started
    When the maintainer resumes it
    Then only the failed, interrupted, quota-stopped and never-started runs run, in the same execution
    And the run that reached its cap is not re-run
    And each earlier attempt is kept beside the new one, and the number of attempts is recorded

  @F1.4 @error
  Scenario: A resume is refused when it could mix results
    When the maintainer resumes an execution with a campaign file that changed, or an execution already aggregated
    Then the resume is refused, naming the reason

  @F1.4
  Scenario: A campaign stops itself after the same failure repeats
    Given a campaign file that stops after 2 runs fail with the same error at the same step
    When two runs fail that way
    Then the campaign starts no further run and records why

  @F1.4
  Scenario: The ceiling covers every execution of a campaign
    Given a campaign whose earlier execution already spent part of its ceiling
    When the maintainer runs or resumes it
    Then the budget guard compares the ceiling with what every execution spent plus the highest estimate of what is left

  @F1.4
  Scenario: Scoring a stopped execution keeps it resumable
    Given a stopped execution with runs never started
    When the maintainer scores it
    Then its runs are scored but the execution is not aggregated, and it can still be resumed
    And only when the maintainer declares it final is it aggregated, the runs never started listed as not run
