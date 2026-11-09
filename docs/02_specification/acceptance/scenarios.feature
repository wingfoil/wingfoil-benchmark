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

  @F3.4
  Scenario: S1 1.1's step 5 has one reading
    Given S1 1.1
    Then it is valid and passes the leak scan
    And its step 5's request states how a patch describes an item an array gains, loses or moves
    And everything else in it is S1 1.0's
    And S1 1.0 stays registered, unchanged, with its step 5's limit stated on the method page

  @F3.4
  Scenario: S2, S3 and S8 1.1 carry the oracle's corrections
    Given S2, S3 and S8 1.1
    Then each is valid and passes the leak scan
    And each is its 1.0 but for its version and, in S2 and S3, its content check and its rubric
    And S2's duplicate and S3's D3 revision checks match whole words, each with its section in the version's rubric
    And the 1.0 versions stay registered, unchanged

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

  # task-139, bug-034 (requirements 1.51)
  @F3.1
  Scenario: A scenario version holds no symbolic link and no directive file with an open fence
    Given a scenario version whose scenario.yaml is a symbolic link leading outside it
    When the scenario is validated
    Then it is refused, naming scenario.yaml as a symbolic link
    Given a scenario version with a symbolic link deep in its seed
    Then it is refused, naming the link
    Given an arm configuration whose directive file leaves a code fence open
    Then it is refused, naming the file

  # task-140, F7.5 (requirements 1.50): a scenario version's configurations
  @F7.5
  Scenario: A symbolic link in a configuration is refused
    Given "arms/openspec-configured/" of S3 1.1 holds a symbolic link
    When S3 1.1 is loaded
    Then it is refused, naming the link

  @F7.5
  Scenario: A version 1.0 holding a configuration is refused
    Given S2 1.0 holds "arms/speckit-configured/"
    When S2 1.0 is loaded
    Then it is refused, naming the directory

  @F7.5
  Scenario: The leak scan covers a configuration
    Given a configuration file holds an oracle literal of S2 1.1
    When S2 1.1 is validated
    Then the scan fails, naming the file and the configuration, not the literal

  # task-143, bug-047 (requirements 1.55): an ordinary word an oracle quotes is prose in a configuration
  @F7.5
  Scenario: A configuration may use a one-word literal of the oracle as prose
    Given S2 1.1's oracle quotes "duplicate" as a test group's name
    And a configuration file of S2 1.1 says "duplicate SKUs merged"
    When S2 1.1 is validated
    Then it is valid
    And a configuration file holding a literal of more than one word, or with a character other than a letter, is still refused

  # task-141, F7.5 (requirements 1.50, 1.53): bench scenario configure and the configuring session
  @F7.5
  Scenario: The configuring agent sees the seed and the installed harness only
    When the configuring agent runs for S3 1.1 and "openspec"
    Then its workspace holds the seed and the openspec arm's setup
    And no step prompt, oracle file, hold-out file or other arm's configuration

  @F7.5
  Scenario: The configuring agent writes what it added or changed, and its record
    When a configuring session adds two files and changes one
    Then the three files are written to "arms/openspec-configured/" of the scenario version
    And "configured/openspec-configured.json" records the agent, model, prompt digest, pin, usage, cost and files

  @F7.5
  Scenario Outline: A configuring session's result is refused when it touches what is not configuration
    When a configuring session <does>
    Then no configuration is written, its record states the refusal, and the command exits 1

    Examples:
      | does                         |
      | deletes a file               |
      | writes a symbolic link       |
      | changes "src/index.ts"       |
      | writes CLAUDE.md             |

  @F7.5
  Scenario Outline: A configuring session that writes outside its configuration places is refused
    Given the wingfoil arm declares configuration ".wingfoil/dna.yaml" and ".wingfoil/roles.yaml"
    And the wingfoil arm declares configuration ".wingfoil/directives/custom/**"
    And the wingfoil arm declares state ".wingfoil/directives/custom/.index/**"
    When a configuring session for S1 1.1 and "wingfoil" <writes>
    Then no configuration is written, its record names <path>, and the command exits 1

    Examples:
      | writes                                         | path                                   |
      | adds "src/helpers.ts"                          | "src/helpers.ts"                       |
      | adds ".wingfoil/directives/custom/.index/a"    | ".wingfoil/directives/custom/.index/a" |
      | changes the Benchmark Approver's role          | ".wingfoil/dna.yaml"                   |
      | adds a member with the approver role           | ".wingfoil/dna.yaml"                   |

  @F7.5
  Scenario: A configuration place over a seed file is refused for that version
    Given the speckit arm declares configuration "src/**"
    And the speckit arm is otherwise valid, its state and its constitution's place declared
    When "bench scenario configure S8@1.1 --arm speckit --allow-spending" runs
    Then it is refused before any session, naming the glob and the seed file it matches, and exits 1

  @F7.5
  Scenario: A harness arm's configuration places hold its project rules
    Given the speckit arm declares configuration ".specify/memory/constitution.md"
    And the speckit arm declares its state globs
    And no state glob of the speckit arm matches ".specify/memory/constitution.md"
    When a configuring session for S8 1.1 and "speckit" extends the generated constitution
    Then the configuration is written with ".specify/memory/constitution.md"

  @F7.5
  Scenario: The configuring agent for Spec Kit on S8 sees S8's project rules
    When the configuring agent runs for S8 1.1 and "speckit"
    Then its workspace holds the constitution REQ-FMT-14 generates from S8's rules
    And its record holds that constitution's SHA-256

  @F7.5
  Scenario Outline: A version a run has recorded is never configured again
    Given a dry run under "results/dry-runs/" has run S1 1.1
    When "bench scenario configure S1@1.1 --arm <arm> --allow-spending <flag>" runs
    Then it is refused before any session, and exits 1

    Examples:
      | arm      | flag      |
      | speckit  |           |
      | wingfoil | --replace |

  @F7.5
  Scenario: An existing configuration is kept unless replaced
    Given S1 1.1 holds a configuration for "wingfoil-configured"
    When "bench scenario configure S1@1.1 --arm wingfoil --allow-spending" runs
    Then it is refused before any session, and exits 1

  @F7.5
  Scenario: A version 1.0 is never configured
    When "bench scenario configure S1@1.0 --arm wingfoil --allow-spending" runs
    Then it is refused before any session, naming the approver's choice, and exits 1

  @F7.5
  Scenario: The configuring session runs without the arm's manual and MCP server
    When the configuring agent runs for S1 1.1 and "wingfoil"
    Then the workspace holds no CLAUDE.md and no MCP server is attached during the session
    And the merged manual is back after it

  @F7.5
  Scenario: A configuring session killed at a cap writes its record only
    When a configuring session is killed at the step time cap
    Then its record has the outcome "killed", its cost at its bound and cost_reported false, and no configuration

  @F7.5
  Scenario: A configuring prompt that names a harness is refused before any session
    Given "configuring/prompt.md" names "Spec Kit"
    When "bench scenario configure S1@1.1 --arm speckit --allow-spending" runs
    Then it is refused before any session, naming the prompt, and exits 1

  @F7.5
  Scenario: Without --allow-spending nothing runs
    When "bench scenario configure S1@1.1 --arm speckit" runs
    Then it is refused before any session, with campaign run's message, and exits 1

  @F7.5
  Scenario: A failed replacement keeps the configuration
    Given S1 1.1 holds a configuration for "wingfoil-configured"
    When a "--replace" session for it is refused
    Then S1 1.1 still holds the earlier configuration, and both records are kept
