---
type: Reference
title: FamiStudio tempo — frames, BPM and grooves
description: How FamiStudio tempo mode turns BPM into NES frame counts — NoteLength, grooves, groove padding — and the FamiTracker tempo alternative.
tags: [famistudio, tempo, bpm, frames, groove]
status: stable
generated: { by: muse-wonder/1.0, at: 2026-10-27T05:10:21Z }
sources:
  - id: famistudio-gitingest
    resource: /references/sources/gitingest-bleubleu-famistudio-8a5edab282632443.txt
    title: Gitingest of BleuBleu/FamiStudio (FamiStudio repo)
---

# Overview

The NES does not have a BPM clock: music advances once per video frame
(**60.0988 fps NTSC**, **50.0070 fps PAL** in FamiStudio's emulation
constants). Every note duration in a FamiStudio song is ultimately an integer
number of frames, so arbitrary BPM values are approximated by patterns of
frame counts. This concept covers the math a MusicXML converter needs; the
conversion policy is in the
[mapping spec](/famitune/musicxml-to-famistudio-mapping.md).[^famistudio-gitingest]

# FamiStudio tempo mode (default; use this)

In FamiStudio tempo mode the piano roll shows frames, and tempo is set per
song (and overridable per pattern column via `PatternCustomSettings`):

| Song attribute | Meaning |
|---|---|
| `NoteLength` | Frames per note (row) when no groove is needed — integer **1–18** (`MinNoteLength`/`MaxNoteLength` in `TempoUtils.cs`) |
| `Groove` | A short cycle of frame counts per note (e.g. `7-6-6`) whose *average* hits a BPM that no single integer can; groove entries differ by at most 1, cycle length ≤ 8 |
| `BeatLength` | Notes per beat (rows per beat) — the BPM reference unit; recommended 4 (i.e. a row = a 16th note in 4/4) |
| `GroovePaddingMode` | `Beginning` / `Middle` / `End` — where the extra "pad" frames sit inside notes; Middle is least audible |

BPM math (from `TempoUtils.ComputeBpmForGroove`):[^famistudio-gitingest]

```
BPM = fps * 60 / (averageFramesPerNote * notesPerBeat)
```

Worked numbers (NTSC, `BeatLength=4`):

- `NoteLength=7` flat → 60.0988 × 60 / (7 × 4) ≈ **128.8 BPM**.
- At 112.5 BPM FamiStudio uses 8 frames per note.
- At 142 BPM it uses groove `7-6-6` (average 6.33 frames/note): the first row
  lasts 7 frames, the next two 6, repeating. Only the *minimum* (6) is fully
  editable per row; injected pad frames still advance envelopes/arpeggios but
  start no new note.

Converter implications:

- Given a MusicXML BPM and a chosen row grid (rows per quarter note), compute
  `idealFramesPerRow = (60 / BPM) * fps / rowsPerQuarter`, then realize it as
  either a flat `NoteLength` (if near-integer, 1–18) or the nearest groove of
  one/two frame values; report the resulting actual BPM vs requested.
- Tempo changes are only possible **at pattern starts** in this mode — align
  converter tempo changes to measure/pattern boundaries.
- PAL vs NTSC changes sounding tempo for the same frame counts; generated
  projects should declare/export NTSC unless targeting PAL explicitly.

# FamiTracker tempo mode (do not generate; read for imports)

Tracker-style: `FamiTrackerTempo` + `FamiTrackerSpeed` counters decide how
many frames each row lasts, with effects (`Fxx` speed, delayed notes/cuts) for
frame-level adjustments. FamiTracker imports land in this mode. It is more
awkward to generate ( uneven rows need delay/cut effects) — generate
FamiStudio tempo instead, and treat FamiTracker mode as an import dialect.

[^famistudio-gitingest]: Gitingest of BleuBleu/FamiStudio (FamiStudio repo)
