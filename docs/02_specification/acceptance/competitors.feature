# Acceptance — Competitors (v0.2)
# Traces to: F7.4, F7.1, F7.2 · J6 steps 1–3 · experiment design 1.2 §2 (parity rules), §5 T1, T3, T12, T15
# Version: 1.0 · Status: Approved (2026-10-05)

Feature: Competitor arms admitted by published criteria and set up under the same rules
  As Avery, who audits and compares tools
  I want each harness admitted by published criteria, set up from its own documentation and open to contest
  So that a comparison with WingFoil is fair, and can be checked and corrected

  Background:
    Given the published eligibility criteria
    And an eligibility register that assesses each candidate tool, WingFoil included, at a named version

  @F7.4
  Scenario: A tool admitted at the pinned version can have an arm
    Given a tool whose register entry for the pinned version passes every criterion with its evidence
    When the maintainer validates a campaign that gives the tool an arm
    Then the campaign is accepted

  @F7.4 @error
  Scenario: A campaign cannot give an arm to a tool the register excludes
    Given a tool that the register excludes, with its reason
    When the maintainer validates a campaign that gives the tool an arm
    Then the campaign is rejected
    And the message names the tool and the criterion it fails

  @F7.4 @error
  Scenario: A version the register has not assessed is refused
    Given a tool admitted at one version
    When the maintainer validates a campaign that pins another version of it
    Then the campaign is rejected until that version is assessed

  @F7.4
  Scenario: Every assessed tool is published with its verdict
    When the maintainer builds the site
    Then the eligibility page lists every assessed tool and version, WingFoil included, its verdict and, for an excluded tool, the reason

  @F7.1
  Scenario Outline: A competitor arm runs a scenario under the same rules
    Given the <arm> arm installs <tool> from its pinned artifact and initializes it as its documentation says for Claude Code
    And the tool's telemetry is turned off
    When the maintainer runs a scenario in the <arm> arm with the fake agent
    Then every step runs in a fresh session started by the runner, with the same prompt as in every other arm
    And the neutral approver answers the sessions that wait, and no other approval exists in the arm
    And the run records the tool, its version, the artifact's digest and the arm's digest

    Examples:
      | arm      | tool     |
      | speckit  | Spec Kit |
      | openspec | OpenSpec |

  @F7.1 @error
  Scenario: A harness artifact that does not match its recorded digest is refused
    Given a cached harness artifact whose content no longer matches the digest recorded for it
    When the maintainer runs a campaign that pins it
    Then no run starts, and the message names the artifact

  @F7.1
  Scenario Outline: Each harness has its own docs control
    Given the <arm> arm's configuration, captured by running its own setup
    When the <docs> environment is generated twice
    Then both generations are byte-identical
    And every kind of content the generator declares as rendered appears in it, and no kind it declares as left out

    Examples:
      | arm      | docs          |
      | wingfoil | baseline-docs |
      | speckit  | speckit-docs  |
      | openspec | openspec-docs |

  @F7.1 @error
  Scenario: An arm definition that misses what v0.2 requires is refused
    Given an arm definition whose docs control names an unknown arm, or a harness arm that declares no telemetry setting
    When the maintainer validates a campaign that uses it
    Then the campaign is rejected, naming the arm and the field

  @F7.1
  Scenario: A scenario's project rules reach every arm without changing the scenario
    Given a scenario whose project rules are declared once
    When it runs in the wingfoil, speckit and openspec arms and in their docs controls
    Then each harness arm gets the rules in its tool's own place, and each docs control gets them as Markdown
    And the scenario's content hash is the one its earlier results recorded

  @F7.1
  Scenario: Every harness arm's setup is published
    When the maintainer builds the site
    Then each harness arm has a setup page with its setup script, its telemetry setting, its operating manual, its rules and what its docs control renders

  @F7.2
  Scenario: A setup can be contested from its page
    Given a published setup page
    When a reader follows its contest link
    Then an issue form asks for the arm, the setup step, what the tool's documentation says and the proposed correction

  @F7.2
  Scenario: A corrected setup runs as a new campaign and the old one stays published
    Given a contest the maintainer accepts, and the arm's files corrected
    When the maintainer pins the corrected arm's digest in the campaign file
    Then the campaign has a new identity
    And the contested campaign's values stay published, its setup page linking the contest and the campaign that followed

  @F7.2 @error
  Scenario: A campaign file whose pinned arm digest no longer matches the arm is refused
    Given a campaign file that pins an arm's digest, and that arm's files changed since
    When the maintainer validates the campaign file
    Then the campaign is rejected, naming the arm
