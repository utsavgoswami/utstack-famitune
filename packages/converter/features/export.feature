@export
Feature: Exported audio verification
  Scenario: Hello World renders one audible pitch
    Given the Hello World FamiStudio Text
    When the pinned build renders WAV output
    Then the WAV contains a single sustained pitch corresponding to C4 for the expected duration

  Scenario: Hello World exports a valid NES ROM
    Given the Hello World FamiStudio Text
    When the pinned build exports a NES ROM
    Then the ROM passes iNES validation
