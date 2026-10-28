---
type: Reference
title: MusicXML notes — pitch, duration, chords, voices
description: Sounding semantics of the note element — step/alter/octave to MIDI pitch, duration/divisions timing, rests, ties, chords, and the backup/forward time counter.
tags: [musicxml, note, pitch, duration, midi]
status: stable
generated: { by: muse-wonder/1.0, at: 2026-10-27T05:10:21Z }
sources:
  - id: musicxml-gitingest
    resource: /references/sources/gitingest-w3c-cg-musicxml-8a5edab282632443.txt
    title: Gitingest of w3c-cg/musicxml (MusicXML standard repo)
---

# Overview

Everything a sound converter needs lives in `<note>` plus the time-counter
elements. MusicXML splits a note into *sounding* data (`<pitch>`, `<duration>`,
`<tie>`) and *notation* data (`<type>`, `<stem>`, `<beam>`, accidentals,
`<notations>`). Convert from the sounding data; do not infer sound from
notation elements.[^musicxml-gitingest] See also
[score structure](/musicxml/score-structure.md).

# Pitch

```xml
<pitch>
  <step>E</step>     <!-- A–G, required -->
  <alter>-1</alter> <!-- semitones: -1 flat, 1 sharp; optional; -2/2 double; decimals = microtones -->
  <octave>5</octave> <!-- required; octave 4 starts at middle C -->
</pitch>
```

Rules that matter for conversion:[^musicxml-gitingest]

- `<alter>` is part of the *sounding* pitch and must be honored **even when the
  alteration comes from the key signature** (an E♭ in E♭ major still carries
  `<alter>-1</alter>`). Never reconstruct pitch from `<key>` + `<accidental>`
  (the `<accidental>` element is appearance only).
- Convert to a MIDI note number with:

  ```
  stepBase = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 }
  midi     = (octave + 1) * 12 + stepBase[step] + alter
  ```

  So middle C (`C`, octave 4) = 60, and the NES/FamiStudio name for a sounding
  MIDI number is the sharp spelling of that number minus one octave —
  `NoteNames[(midi - 12) % 12]` + octave `(midi - 12) / 12 - 1` using sharp names
  (`C, C#, D, D#, E, F, F#, G, G#, A, A#, B`): FamiStudio octave labels run
  one above scientific pitch notation (FamiStudio `C3` sounds middle C) — see
  [NES channels and notes](/famistudio/nes-channels-and-notes.md) and the
  [mapping spec](/famitune/musicxml-to-famistudio-mapping.md).
- Non-integer `<alter>` (microtones) has no exact NES pitch; it needs a
  fine-pitch approximation or rejection (input profile decision).
- Add `<transpose><chromatic>` from the part's `<attributes>` to get sounding
  pitch for transposing instruments.
- Rests use `<rest/>` instead of `<pitch>` (a whole-measure rest may carry
  `measure="yes"`); unpitched percussion uses `<unpitched>` and does not map to
  a melodic pitch.

# Duration and the time counter

- `<duration>` is an integer count of **divisions**; `<divisions>` (in
  `<attributes>`) is divisions per quarter note. Sounding length in quarter
  notes is `duration / divisions`. Example: with `divisions=24`, a quarter =
  24, an eighth = 12, an eighth triplet = 8.[^musicxml-gitingest]
- Each `<note>` **advances the musical time counter** by its duration, except:
  - a note with `<chord/>` starts at the *same* time as the previous note (it
    does not advance the counter past the chord's first note), and
  - `<backup><duration>` moves the counter backward (start another voice/staff/
    layer), `<forward><duration>` moves it forward without a note (invisible
    rest).
- A converter must therefore maintain, per part, a cursor: onsets are cursor
  positions, not note indices. Voices (`<voice>`) and staves (`<staff>`)
  label which stream a note belongs to; `<backup>`/`<forward>` are how
  parallel streams are interleaved in one measure.
- Prefer computing absolute onsets (in quarter notes or seconds) and
  quantizing onsets cumulatively; rounding each duration independently
  accumulates drift, especially with tuplets. Tuplet notes carry a
  `<time-modification>` (actual/normal notes), but their `<duration>` already
  reflects the sounding length in divisions — the grid must be fine enough to
  represent it.
- `<type>` (whole/half/quarter/eighth/…), `<dot/>`, beams and stems are
  notation. `<duration>` is authoritative for sound; `<type>` is a useful
  cross-check only.

# Ties, chords, multiple voices

| Construct | Sounding semantics | Converter handling |
|---|---|---|
| `<tie type="start"/>` … `<tie type="stop"/>` | One sustained pitch across written notes (a note can carry both: stop then start) | Merge tied notes into a single event with summed duration. Use `<tie>` (sound), not `<notations><tied>` (appearance) |
| `<chord/>` on 2nd+ notes | Simultaneous pitches at one onset | One onset, multiple pitches — must be reduced for monophonic NES channels (see mapping spec) |
| `<voice>` / `<staff>` | Parallel streams within a part (e.g. piano RH/LH, divided voices) | Split part into streams by (staff, voice) before channel allocation |
| `<backup>` / `<forward>` | Counter moves for interleaved streams | Track cursor per stream; `<forward>` gaps are rests in that stream |
| `<grace>` notes | Ornaments with no normal duration | No `<duration>`-based onset; defer/ignore in a first converter (profile decision) |
| Repeats: `<barline><repeat direction="forward|backward">`, `<ending>` | Playback order unfolds repeated sections | Unfold to a linear measure sequence, or map the loop to a song loop point (profile decision) |

# Tempo and dynamics (sound suggestions)

- Tempo: `<sound tempo="88"/>` (quarter notes per minute) inside a
  `<direction>`, or a `<direction>` with `<metronome>` (`<beat-unit>` +
  `<per-minute>`). MusicXML specifies **no default tempo** — a converter must
  choose and warn (e.g. default ♩=120).[^musicxml-gitingest]
- Dynamics: `<sound dynamics="71"/>` is a percentage of the standard forte
  velocity (MIDI velocity 90 ≈ forte by default). `<direction>` dynamics marks
  (`<pp/>`…`<ff/>`) are the notation counterpart. Either can drive a 0–15 NES
  volume mapping; see the [mapping spec](/famitune/musicxml-to-famistudio-mapping.md).

[^musicxml-gitingest]: Gitingest of w3c-cg/musicxml (MusicXML standard repo)
