# Acceptance — Runner (v0.1)
# Traces to: F2.1–F2.7 · J2 steps 3–4 · experiment design §2 (arms, parity), §3 (run protocol) · is/is-not 1.1

Feature: Isolated, multi-step runs of a scenario in an arm
  As the WingFoil maintainer
  I want every run executed the same way in every arm, in isolation, one fresh session per step
  So that differences between arms come from the harness and not from the procedure

  Background:
    Given a validated campaign
    And the agent is the scripted fake agent

  @F2.1
  Scenario: Each run gets its own container with only the seed and the arm's environment
    When the runner starts a run of S1 in the baseline arm
    Then a new container is created for that run
    And the container holds the S1 seed and the baseline arm's environment
    And the container holds no oracle, no hold-out content, no runner code and no other run

  @F2.1 @error
  Scenario: A run cannot see the hold-out even if the path is configured
    Given the hold-out path is configured for scoring
    When the runner starts any run
    Then the hold-out path is not mounted in the container

  @F2.2
  Scenario: Each step starts a new agent session
    Given scenario S3 has 5 steps
    When the runner executes a run of S3
    Then 5 separate agent sessions are started, one per step
    And no conversation state is passed from one session to the next
    And after each step the working tree is committed with a neutral message naming only the step number

  @F2.3
  Scenario: The Claude Code adapter records usage and the transcript of every session
    When a step's session ends
    Then the run log records, for that session: input, output and cache tokens, the API-equivalent cost, wall time and number of turns
    And the full transcript is stored with the run

  @F2.4
  Scenario: The neutral approver answers an approval request
    Given the fake agent ends a session asking for an approval
    When the runner detects that the session is waiting for input
    Then the runner resumes the session with "Approved. Proceed."
    And one intervention is recorded for that step

  @F2.4
  Scenario: The neutral approver answers a question
    Given the fake agent ends a session with a question
    When the runner detects that the session is waiting for input
    Then the runner resumes the session with "No further input is available. Make the most reasonable choice, record it, and proceed."
    And one intervention is recorded for that step

  @F2.4
  Scenario: A step ends after the maximum number of interventions
    Given the maximum is 3 interventions per step
    And the fake agent asks a fourth question in the same step
    When the runner detects that the session is waiting for input
    Then the step ends without a further reply
    And the step's outcome is "intervention cap reached"

  @F2.4
  Scenario: The policy is the same in every arm
    Given a campaign with the baseline, baseline-docs and wingfoil arms
    When the same fake session runs in each arm
    Then each arm receives the same replies, in the same order
    And the run log of each arm names the approver policy version

  @F2.5
  Scenario: Each arm's setup is scripted and measured apart from the steps
    When the runner starts a run in the wingfoil arm
    Then the arm's setup script runs before the first step
    And its tokens, time and cost are recorded as setup, not as a step

  @F2.5
  Scenario: The baseline-docs environment is generated from the wingfoil arm's configuration
    Given the wingfoil arm's configuration for S8
    When the baseline-docs environment for S8 is generated
    Then it contains the same directives, decisions and project description as Markdown
    And generating it twice yields byte-identical output

  @F2.6
  Scenario: The WingFoil under test is the version pinned by the campaign
    Given the campaign pins wingfoil@3df305e
    When the runner sets up the wingfoil arm
    Then the WingFoil installed in the container is built from commit 3df305e
    And it is independent of the WingFoil that manages the benchmark repository

  @F2.7
  Scenario: Each arm is activated by its operating manual, and prompts stay identical
    When the runner prepares step 1 of S1 in every arm
    Then the step prompt is byte-identical in every arm
    And each arm's environment contains that arm's operating manual
    And the size of each operating manual in tokens is recorded with the run
