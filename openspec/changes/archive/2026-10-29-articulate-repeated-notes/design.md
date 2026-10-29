# Design

## Context

See proposal.md for the reason for this change. The adapt stage gives patterns with notes in rows. The write stage writes each duration in subrows. One subrow is one part of a row. `NoteLength` gives the number of subrows in one row. The write stage uses the `NoteLength` base of the pattern tempo, or the song tempo if the pattern has no tempo.

## Goals / Non-Goals

**Goals:**

- Make the start of a repeated note audible in the exported WAV.
- Keep all onsets at the same rows.
- Change no note except the first note of a repeated pair.

**Non-Goals:**

- No change to tie, rest, pitch, tempo, or channel rules.
- No new instrument envelope.
- No gap before a note with a different pitch.

## Decisions

1. Run the new rule after chord reduction. Chord reduction gives the final note on each channel. A count from an early stage can count a note that chord reduction later removes.
2. Walk the patterns of one channel in measure order. Compare each note with the next note in the same pattern. Also compare the last note of a pattern with the first note of the next pattern that has a note.
3. Store the gap on the note as `gapSubrows`. The write stage writes `durationRows * base - gapSubrows`. This keeps onset rows and row counts in the adapt stage. The write stage owns the subrow unit.
4. Use 1 subrow for the gap. A full row is 8 rows per quarter in the Rieding file, so 1 row removes too much time from a short note. One subrow is near 1 frame at the song groove and keeps the rhythm.
5. Skip a note if the new duration is less than 1 subrow. Count the skip in the report. Do not write a duration of 0.
6. Add an export test that checks the sound level at the boundary. The old onset check holds the scored onset when no drop exists, so that check cannot find this fault.

## Risks / Trade-offs

- [Risk] One subrow gives no audible drop in the exported WAV. Mitigation: the export test checks the sound level at the boundary with the pinned FamiStudio build. If the test fails, use a stop note at the boundary and keep the same spec.
- [Risk] A pattern with a tempo change uses a new `NoteLength` base. Mitigation: the write stage and the skip check use the base of that pattern.
- [Trade-off] The first note of each pair is 1 subrow short. The report gives the count, so the loss is not silent.
