@render
Feature: Rendered audio verification
  Scenario: Hello World renders one audible pitch
    Given the Hello World FamiStudio Text
    When the pinned build renders WAV output
    Then the WAV contains a single sustained pitch corresponding to C4 for the expected duration
