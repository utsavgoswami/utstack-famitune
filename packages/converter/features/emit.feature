Feature: FamiStudio Text emission
  Scenario: Hello World matches the golden file
    Given the Hello World fixture
    When the converter emits FamiStudio Text
    Then the output is byte-identical to the golden file

  Scenario: Repeat conversion is identical
    Given the Hello World fixture
    When the converter emits FamiStudio Text twice
    Then both outputs are byte-identical

  Scenario: Middle C converts exactly
    Given a score containing C4
    When the converter emits FamiStudio Text
    Then the output contains a note named C3 at the corresponding position

  Scenario: Flat converts to its sharp equivalent
    Given a score containing E-flat in octave 4
    When the converter emits FamiStudio Text
    Then the output contains a note named D#3 and the conversion report notes the respelling
