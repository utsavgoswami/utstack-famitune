Feature: Event conversion to rows
  Scenario: Onsets land on expected rows
    Given an eighth-note melody
    When the converter quantizes the melody
    Then onsets land on rows 0, 8, 12, and 16 with no error

  Scenario: Maximum quantization error is reported in frames
    Given a melody mixing triplets and sixteenths
    When the converter quantizes the melody
    Then the report states the maximum onset error in frames

  Scenario: Marked tempo is realized
    Given a score marking quarter-note 120 on a 16th grid
    When the converter converts the score
    Then the song uses a frame groove realized within 1 BPM of 120 as stated in the report

  Scenario: Two measures chunk into two patterns
    Given a two-measure melody
    When the converter chunks the melody into patterns
    Then two patterns hold one measure each

  Scenario: Pickup measure gets a length override
    Given a melody with a pickup measure
    When the converter chunks the melody into patterns
    Then the pickup pattern carries a shorter length

  Scenario: Two streams use two channels
    Given a high melody stream and a low bass stream
    When the converter allocates streams to channels
    Then the melody sounds on Square 1 and the bass on Triangle

  Scenario: Overflow stream is reported
    Given four melodic streams
    When the converter allocates streams to channels
    Then three streams are converted and the report identifies the dropped stream and its note count

  Scenario: Three-note chord keeps one pitch
    Given a melody stream with a three-note chord
    When the converter reduces chords
    Then one pitch sounds on that stream's channel and the report counts two dropped chord tones

  Scenario: Rest produces a gap
    Given a measure with a quarter rest between two notes
    When the converter quantizes the measure
    Then no note sounds during the rest and the following note starts at the correct position
