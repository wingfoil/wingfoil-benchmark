# Acceptance — Competitors (v0.2)
# Traces to: F7.4, F7.1, F7.2 · J6 steps 1–3 · experiment design 1.2 §2 (parity rules), §5 T1, T3, T12, T15
# Version: 1.0 (draft) · Status: in review (2026-10-05)

Feature: Competitor arms admitted by published criteria and set up under the same rules
  As Avery, who audits and compares tools
  I want each competing harness admitted by published criteria, set up from its own documentation and open to contest
  So that a comparison with WingFoil is fair, and can be checked and corrected

  Background:
    Given the published eligibility criteria
    And the eligibility register assesses Spec Kit, OpenSpec and BMAD Method at a named version

  @F7.4
  Scenario: A tool that meets every criterion is admitted
    Given a tool whose register entry passes every criterion with its evidence
    When the maintainer validates a campaign that gives the tool an arm
    Then the campaign is accepted

  @F7.4 @error
  Scenario: A campaign cannot give an arm to a tool the register does not admit
    Given a tool that the register excludes, with its reason
    When the maintainer validates a campaign that gives the tool an arm
    Then the campaign is rejected
    And the message names the tool and the criterion it fails

  @F7.4
  Scenario: Excluded tools are published with their reason
    When the maintainer builds the site
    Then the eligibility page lists every assessed tool, the version assessed, its verdict and, for an excluded tool, the reason

  @F7.1
  Scenario Outline: A competitor arm runs a scenario under the same rules
    Given the <arm> arm installs <tool> from its pinned artifact and initializes it as its documentation says for Claude Code
    And the tool's telemetry is turned off
    When the maintainer runs a scenario in the <arm> arm with the fake agent
    Then every step runs in a fresh session started by the runner, with the same prompt as in every other arm
    And the neutral approver answers the sessions that wait, as in every arm
    And the run records the tool, its version and the artifact's digest

    Examples:
      | arm      | tool     |
      | speckit  | Spec Kit |
      | openspec | OpenSpec |

  @F7.1
  Scenario Outline: Each harness has its own docs control
    Given the <arm> arm's configuration, captured by running its own setup
    When the <docs> environment is generated twice
    Then both generations are byte-identical
    And the <docs> arm holds the same information as the <arm> arm, as free-form Markdown, and no tool

    Examples:
      | arm      | docs          |
      | wingfoil | baseline-docs |
      | speckit  | speckit-docs  |
      | openspec | openspec-docs |

  @F7.1
  Scenario: Every arm's setup is published
    When the maintainer builds the site
    Then each harness arm has a setup page with its setup script, its telemetry deviation, its operating manual and what its docs control renders

  @F7.2
  Scenario: A setup can be contested from its page
    Given a published setup page
    When a reader follows its contest link
    Then an issue form asks for the arm, the setup step, what the tool's documentation says and the proposed correction

  @F7.2
  Scenario: A corrected setup yields a new campaign and the old one stays published
    Given a contest the maintainer accepts, and the arm's files corrected
    When the maintainer validates the campaign file that ran before
    Then the corrected arm's digest differs from the one the earlier runs recorded, so the results belong to a new campaign
    And the earlier campaign's pages stay published, with its setup page linking the contest and the campaign that followed
