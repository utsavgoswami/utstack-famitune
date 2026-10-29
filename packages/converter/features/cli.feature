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

  Scenario: CLI exports playable files with the export flag
    Given a MusicXML file on disk
    When the CLI exports the file
    Then the CLI exits zero and writes WAV, NSF, and NES files

  Scenario: CLI fails loudly when FamiStudio is unavailable
    Given a MusicXML file on disk
    When the CLI exports the file without FamiStudio
    Then the CLI exits non-zero but keeps the FamiStudio Text

  Scenario: CLI fails loudly on an invalid ROM
    Given a MusicXML file on disk
    When the CLI exports the file with a corrupt ROM
    Then the CLI exits non-zero and names validation

  Scenario: CLI fails loudly when an export produces no ROM
    Given a MusicXML file on disk
    When the CLI exports the file but the ROM export fails
    Then the CLI exits non-zero, names the ROM export, but keeps the FamiStudio Text

  Scenario: CLI without the export flag never touches FamiStudio
    Given a MusicXML file on disk
    When the CLI converts the file without the export flag
    Then the CLI exits zero and never checks FamiStudio availability
