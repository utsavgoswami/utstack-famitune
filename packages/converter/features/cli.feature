Feature: Converter CLI
  Scenario: CLI converts a file
    Given a MusicXML file on disk
    When the CLI converts the file
    Then the CLI exits zero and writes FamiStudio Text

  Scenario: CLI rejects bad input
    Given a timewise file on disk
    When the CLI converts the file
    Then the CLI exits non-zero and names the problem

  Scenario: CLI writes the conversion report
    Given a MusicXML file on disk
    When the CLI converts the file
    Then the report file states the tempo and the written paths
