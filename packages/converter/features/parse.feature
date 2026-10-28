Feature: MusicXML parsing
  Scenario: Hello World score converts
    Given the Hello World fixture
    When the converter parses the fixture
    Then the parse yields one C4 event with MIDI pitch 60, onset 0, and duration 4 quarter notes

  Scenario: Timewise score is rejected
    Given a timewise score
    When the converter parses the score
    Then parsing fails stating the layout is unsupported

  Scenario: Two voices in one staff split into two streams
    Given a measure with two voices
    When the converter parses the measure and splits streams
    Then each voice forms one stream with onsets 0 and 1 quarter notes

  Scenario: Chord onset keeps three pitches in one stream
    Given a measure with a three-note chord
    When the converter parses the measure and splits streams
    Then one stream holds three pitches at onset 0

  Scenario: Tied notes merge
    Given a tie across a barline
    When the converter parses and merges ties
    Then one note sounds with the summed duration

  Scenario: Marked tempo enters the tempo map
    Given a score marking tempo 120
    When the converter parses the score
    Then the tempo map holds 120 at measure 0 without the default

  Scenario: Missing tempo warns and defaults
    Given a score with no tempo marking
    When the converter parses the score
    Then the tempo map uses the default tempo and flags it

  Scenario: Unhandled construct is logged
    Given a score with a grace note
    When the converter parses the score and builds the report
    Then conversion completes for supported content and the report names the unhandled construct
