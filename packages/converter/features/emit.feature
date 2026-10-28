Feature: FamiStudio Text emission
  Scenario: Hello World matches the golden file
    Given the Hello World fixture
    When the converter emits FamiStudio Text
    Then the output is byte-identical to the golden file

  Scenario: Repeat conversion is identical
    Given the Hello World fixture
    When the converter emits FamiStudio Text twice
    Then both outputs are byte-identical
