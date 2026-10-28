Feature: Converter smoke
  Scenario: Smoke test passes
    Given the converter package exists
    When the smoke check runs
    Then the smoke check succeeds
