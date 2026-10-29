# Spec Delta

## ADDED Requirements

### Requirement: Repeated notes with the same pitch are audible as separate notes
When two notes on one channel have the same pitch, have no tie between them, and the second note starts at the exact time that the first note ends, the converter SHALL shorten the first note by 1 subrow. The converter SHALL keep the first note at 1 subrow or more. The report SHALL give the count of notes that the converter shortened and the count of notes that the converter could not shorten.

#### Scenario: Two half notes with the same pitch stay separate
- **WHEN** a measure has two half notes with the same pitch and no tie between them
- **THEN** the output has two notes and the first note has a duration 1 subrow less than a half note

#### Scenario: A repeated note across a barline stays separate
- **WHEN** a note ends at a barline and the next note has the same pitch and starts at the barline with no tie between them
- **THEN** the output has two notes and the first note has a duration 1 subrow less than the written duration

#### Scenario: Tied notes stay as one note
- **WHEN** two notes with the same pitch have a tie between them
- **THEN** the output has one note with the sum of the two durations and the converter does not shorten that note for this rule

#### Scenario: A note with a different next pitch keeps the written duration
- **WHEN** a note ends at the exact time that a note with a different pitch starts
- **THEN** the converter does not shorten the first note for this rule

#### Scenario: A note before a rest keeps the written duration
- **WHEN** a rest sits between two notes with the same pitch
- **THEN** the converter does not shorten the first note for this rule
