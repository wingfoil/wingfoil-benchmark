# Acceptance — Results and reporting (v0.1)
# Traces to: F5.1, F5.3, F5.4, F5.5, F5.6, F5.8 · J1, J2 steps 7–8, J4 · vision (losses published equally) · experiment design §4.6
# Version: 1.0 · Status: Approved (2026-09-22)

Feature: Stored results, run detail, finding notes and the published site
  As the WingFoil maintainer, and as Riley the curious reader
  I want every published number traceable to runs, and a page that is honest at a glance
  So that the results are credible and can steer WingFoil

  @F5.1
  Scenario: Every aggregate links to the runs behind it
    Given a scored campaign
    When the maintainer opens any aggregate value in the results store
    Then it lists the runs it was computed from, with their campaign, scenario version, arm, model id and repetition

  @F5.1
  Scenario: Dry runs never enter campaign results
    Given dry runs and campaign runs of S1 exist
    When the campaign's results are aggregated
    Then only campaign runs are included

  @F5.3
  Scenario: Run detail shows everything about one run
    When the maintainer opens the detail of one run
    Then it shows the transcript of every step, the diff of every step, the test results, the token usage and the interventions

  @F5.3
  Scenario: Two arms of the same scenario can be compared side by side
    When the maintainer compares the wingfoil and baseline runs of S3
    Then their steps are shown side by side, with cost and pass rate per step

  @F5.4
  Scenario: A finding note is ready to become a WingFoil bug or decision-log
    Given the maintainer selects a difference between arms in a scored campaign
    When the maintainer exports it as a finding note
    Then the note contains the campaign identity, the WingFoil commit, the scenario and version, the runs involved, the metric values, and links to the run details
    And the note is written as a file in the benchmark repository
    And nothing is written to the WingFoil repository

  @F5.5
  Scenario: The landing page answers the question at a glance
    Given a scored campaign
    When the site is built
    Then the landing page states that harnesses are compared, not models, and names the model
    And it shows a headline sentence and one chart comparing the arms
    And it shows one row per category, with the delta per arm

  @F5.5
  Scenario: Losses, ties and gaps are as visible as wins
    Given a campaign where the wingfoil arm loses in category D and wins in category F
    When the site is built
    Then category D shows the loss with the same prominence as the win in category F
    And categories A, B and G are listed as "not covered in this campaign"

  @F5.5
  Scenario: Preliminary results are labelled
    Given a category whose results come from a single repetition
    When the site is built
    Then that category carries a "preliminary" badge and shows "n = 1"
    And results from hold-out additions are marked as such

  @F5.8
  Scenario: The method page explains how to read the results
    When the site is built
    Then the method page describes the arms, the controls, the run protocol, the approver policy, the validity threats, the pins and the budget, in plain language

  @F5.6
  Scenario: Publishing is explicit
    Given the site was built from a scored campaign
    When the maintainer does not request publishing
    Then nothing is published

  @F5.6
  Scenario: Publishing deploys exactly the built site
    Given the site was built from a scored campaign
    When the maintainer requests publishing
    Then the built site is deployed to GitHub Pages
    And the published pages show the same numbers as the results store for that campaign
