# Acceptance — Campaign comparison and Dana's views (v0.2)
# Traces to: F5.2, F5.7 · J2 step 6, J5 steps 1 and 5 · experiment design §4.6, §5 T7
# Version: 1.0 (draft) · Status: in review (2026-10-05)

Feature: A campaign compared with the previous one, and filtered views with stable links
  As the maintainer, and as Dana who evaluates adoption
  I want a second campaign compared with the first, and views filtered by my profile that I can link to
  So that progress between campaigns is visible, and a shared link keeps showing what it showed

  @F5.2
  Scenario: Two campaigns are compared through each arm's delta against its own baseline
    Given two aggregated campaign executions that share scenario versions, arms and the model
    When the maintainer compares them
    Then for each category and arm, the comparison shows each execution's delta against its own baseline, and the change of that delta
    And it shows n and, from two runs, the variance
    And it lists the pins that differ between the executions

  @F5.2 @error
  Scenario: A group whose scenario changed is not compared
    Given two executions where a scenario's content hash differs
    When the maintainer compares them
    Then that scenario's groups read "not compared", naming the two hashes

  @F5.2
  Scenario: The comparison is published with the newer campaign
    Given a comparison between the new execution and the previous published one
    When the maintainer builds the site
    Then the new execution's landing page links its comparison page

  @F5.7
  Scenario: A profile filters the landing page
    Given an execution whose scenarios declare result profiles
    When the site is built
    Then each declared profile has its own landing page, showing only the categories of the scenarios that declare it
    And no client-side script is needed to filter

  @F5.7
  Scenario: A published link keeps showing what it showed
    Given an execution published earlier, and a newer execution of another campaign
    When the site is rebuilt and published
    Then every page of the earlier execution has the same address and content as before
    And the root index lists both executions with their dates
