# Acceptance — Campaign comparison and Dana's views (v0.2)
# Traces to: F5.2, F5.7 · J2 step 6, J5 steps 1 and 5 · experiment design 1.2 §4.6, §5 T7, T14, T15
# Version: 1.0 (draft) · Status: in review (2026-10-05)

Feature: A campaign compared with an earlier one, and filtered views with permanent links
  As the maintainer, and as Dana who evaluates adoption
  I want a campaign compared with an earlier one, and views filtered by my profile that I can link to
  So that progress between campaigns is visible, and a shared link keeps showing what it showed

  @F5.2
  Scenario: Two campaigns are compared through each arm's delta against its own baseline
    Given two aggregated executions that share scenario versions and arms
    When the maintainer compares them, naming the earlier one first
    Then for each category and arm, the comparison shows each execution's delta against its own baseline, and the change of that delta
    And it shows n, and the range from three runs
    And it lists the pins that differ between the executions

  @F5.2
  Scenario: A comparison across models is marked
    Given two executions run on different models
    When the maintainer compares them
    Then every row of the comparison is marked cross-model

  @F5.2 @error
  Scenario: A group whose scenario changed is not compared
    Given two executions where a scenario's content hash differs
    When the maintainer compares them
    Then that scenario's groups read "not compared", naming the two hashes

  @F5.2 @error
  Scenario: Only aggregated campaign executions can be compared
    When the maintainer compares a dry run, an execution not yet aggregated, or one execution with itself
    Then the comparison is refused, naming what was given

  @F5.2
  Scenario: The comparison is published with the newer execution
    Given a comparison whose newer side is an execution
    When the maintainer builds the site
    Then that execution's landing page links its comparison page

  @F5.7
  Scenario: A result profile filters the landing page
    Given the result profiles and the categories each one covers
    When the site is built
    Then each profile has its own page, showing only its categories, with a headline over those categories only
    And no client-side script is needed to filter

  @F5.7
  Scenario: A published link keeps showing the same values
    Given an execution published earlier, and a newer execution of another campaign
    When the site is rebuilt and published
    Then every page of the earlier execution has the same address and shows the same values as before
    And the root index lists both executions with the date each ended
