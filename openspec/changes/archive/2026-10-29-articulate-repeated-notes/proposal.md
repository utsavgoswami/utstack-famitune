# Proposal

## Why

Two notes with the same pitch and no tie between them sound as one long note in the exported WAV. The first note ends at the exact time that the next note starts. The instrument has one volume value for the full note. A listener cannot hear the start of the second note.

## What Changes

- Shorten the first note by 1 subrow when the next note has the same pitch and starts at the exact time that the first note ends.
- Apply the rule inside one pattern and across two patterns.
- Do not change tied notes. The tie rule merges tied notes before this rule runs.
- Do not change notes with a different next pitch. Do not change notes with a rest after them.
- Keep a note at 1 subrow or more. Count a note that the rule cannot shorten.
- Add two counts to the conversion report. One count gives notes that the rule shortened. One count gives notes that the rule could not shorten.
- Add a fixture and tests for the new rule.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `musicxml-to-famistudio-conversion`: Add a requirement for a short time with no sound before a repeated note with the same pitch.

## Impact

- Code: `packages/converter/src/adapt/`, `packages/converter/src/write/write.ts`, `packages/converter/src/report/report.ts`, and `packages/converter/src/index.ts`.
- Tests: new unit tests, one new fixture, and one export test with the pinned FamiStudio build.
- Docs: the mapping spec in `packages/kb/famitune/musicxml-to-famistudio-mapping.md` and the converter README ladder.
- Output: the FamiStudio Text changes only for a repeated note with the same pitch. All other notes keep the same text.
