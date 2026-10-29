# Tasks

## 1. Adapt rule

- [x] 1.1 Add the articulation rule in the adapt stage and unit tests for same pitch, different pitch, rest, tie, cross-pattern, and too-short cases. Verify: the new unit tests pass.
- [x] 1.2 Add `gapSubrows` to the pattern note model and subtract the gap in the write stage. Verify: a write test shows a duration 1 subrow less for the first note of a pair.
- [x] 1.3 Add the two report counts and the report text. Verify: a report test shows both counts.

## 2. Fixture and export check

- [x] 2.1 Add the `repeated-notes` fixture with untied, tied, different-pitch, and rest cases. Verify: the converter test gives the correct note count and report counts for the fixture.
- [x] 2.2 Add the sound-level check at a repeated-note boundary and an export scenario for the fixture. Verify: the export scenario passes with the pinned FamiStudio build and skips with no error if the build is not present.
- [x] 2.3 Add a feature scenario for the rule in `features/adapt.feature`. Verify: the adapt feature tests pass.

## 3. Docs

- [x] 3.1 Update the mapping spec text for the gap rule. Verify: the text states the 1-subrow rule, the tie exception, and the report counts.
- [x] 3.2 Update the converter README ladder with the new fixture. Verify: the ladder row gives the fixture name and the correct loss text.

## 4. Full check

- [x] 4.1 Run the converter test, typecheck, and lint targets. Verify: all three targets pass.
- [x] 4.2 Convert the Rieding score to a temp directory with export. Verify: the report gives 13 shortened notes, the text gives 355 Square 1 notes, and the WAV has a sound-level drop at each checked boundary.
- [x] 4.3 Run `openspec validate articulate-repeated-notes`. Verify: the command passes.

## Workflow follow-up

- Archive the change after a person hears the new exported WAV and accepts the sound.
