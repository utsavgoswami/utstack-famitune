---
type: Conversion Spec
title: MusicXML → FamiStudio mapping spec
description: Normative conversion rules — pitch, rhythm/frame quantization, tempo, channel allocation, chords, ties, rests, instruments — with loss reporting.
tags: [famitune, mapping, conversion, musicxml, famistudio, nes]
status: draft
generated: { by: muse-wonder/1.0, at: 2026-10-27T05:10:21Z }
sources:
  - id: musicxml-gitingest
    resource: /references/sources/gitingest-w3c-cg-musicxml-8a5edab282632443.txt
    title: Gitingest of w3c-cg/musicxml (MusicXML standard repo)
  - id: famistudio-gitingest
    resource: /references/sources/gitingest-bleubleu-famistudio-8a5edab282632443.txt
    title: Gitingest of BleuBleu/FamiStudio (FamiStudio repo)
---

# Overview

This spec defines how [utstack-famitune](/famitune/utstack-famitune-overview.md)
turns MusicXML events into a
[FamiStudio Text](/famistudio/famistudio-text-format.md) project. Terminology:
an **event** is (stream, onset, duration, MIDI pitch) with onset/duration in
quarter notes; a **stream** is one monophonic line extracted from a part by
(staff, voice); a **row** is one FamiStudio note unit (`BeatLength` rows = one
beat). Every lossy step emits a warning into a conversion report — a port that
silently drops music is a failed port.

Status is `draft`: rules are ready to implement, defaults need validation by
the [vertical slice](/famitune/vertical-slice-plan.md) listening checks.

# 1. Pitch

| Step | Rule |
|---|---|
| MusicXML → MIDI | `midi = (octave + 1) * 12 + {C:0,D:2,E:4,F:5,G:7,A:9,B:11}[step] + alter`, plus part `<transpose><chromatic>` (see [notes, pitch and duration](/musicxml/notes-pitch-and-duration.md)) |
| MIDI → FamiStudio `Value` | Sharp spelling of the sounding pitch minus one octave: `NoteNames[(midi - 12) % 12]` + `(midi - 12) / 12 - 1` (e.g. sounding MIDI 63 → `D#3`, never `Eb3`). FamiStudio octave labels run one above scientific pitch notation (FamiStudio `C3` sounds middle C at 261.6 Hz; verified by render probe against the 4.5.0 build). Enharmonic respelling is exact in pitch; warn once per score, not per note |
| Range | Valid output is C0–B7 (sounding MIDI 24–119). Out-of-range: shift by ±12 (octave) repeatedly until in range if that lands in range (report count); else clamp to C0/B7 (report each note) |
| Microtones (non-integer `alter`) | Round to nearest semitone; report. (FinePitch refinement is future work) |

# 2. Time: from divisions to frames

1. Per part, track `<divisions>` (may change; read it at each `<attributes>`).
   Event onset/duration in quarter notes = accumulated `duration / divisions`
   using the time counter (`<chord/>` shares the previous onset;
   `<backup>`/`<forward>` move the cursor). **Onsets are absolute** — never
   derive them from note order alone.
2. Tempo map: tempo at each measure from `<sound tempo>` or `<metronome>`
   (quarter-notes-per-minute); default ♩=120 with a warning if absent.
3. Choose the row grid: default row = 16th note (4 rows per quarter,
   `BeatLength=4`), or the shortest event duration in the piece if shorter
   (down to a 64th). 
4. Frame realization per pattern (FamiStudio tempo): with
   `fps = 60.0988` (NTSC), ideal frames-per-row =
   `(60 / BPM) * fps / rowsPerQuarter`. Emit flat `NoteLength` when the ideal
   is within tolerance of an integer in 1–18; otherwise emit the nearest
   `Groove` (1–2 frame values differing by ≤ 1, cycle ≤ 8) and set
   `GroovePaddingMode="Middle"`. Report requested vs actual BPM (actual from
   `BPM = fps * 60 / (avgFramesPerRow * BeatLength)`).
5. Quantize event onsets/durations to rows by rounding **absolute** row
   positions (cumulative), so per-note rounding cannot drift; a duration
   rounds to at least 1 row. Report the maximum onset error in frames.
6. Tuplets need no special case beyond grid fineness: their `<duration>`
   already encodes sounding length; if the grid cannot represent a tuplet
   onset exactly, rule 5's error report must say so.

References: [tempo, frames and grooves](/famistudio/tempo-frames-and-grooves.md).

# 3. Structure: measures → patterns → song

| MusicXML | FamiStudio |
|---|---|
| Movement/work title, composer | `Project Name/Author`; `Song Name` from movement title |
| Measure | One **pattern** per channel per measure (pattern name e.g. `M001`), `PatternLength` = rows in the measure from the current time signature (`beats * rowsPerBeat`) |
| Measure sequence | `PatternInstance` per measure column, per channel; `Song Length` = measure count; `LoopPoint="-1"` (no loop) unless repeats map to a loop (below) |
| Pickup/anacrusis or odd measures | Shorter pattern via `PatternCustomSettings Length` override at that column |
| Tempo change at a measure | `PatternCustomSettings` with new `NoteLength`/`Groove` at that column (FamiStudio tempo can only change at pattern starts) |
| Time-signature change | New pattern length from that measure on (per-column override or re-chunking) |
| Repeats (`<repeat>`, endings) | v1: unfold into the linear measure sequence and report; song-loop mapping is an alternative to evaluate (do not do both) |

# 4. Streams → channels (allocation)

1. Split each part into streams by (`<staff>`, `<voice>`), following
   `<backup>`/`<forward>` interleaving.
2. Sort streams deterministically: part order (as in `<part-list>`), then
   staff, then voice; compute each stream's median pitch.
3. Assign to stock melodic channels in this order: highest-median stream →
   `Square1` (`Lead`), next → `Square2` (`Harmony`), lowest-median stream →
   `Triangle` (`Bass`). If only the extremes exist, still prefer
   Square1 + Triangle over Square1 + Square2.
4. Overflow streams (4th+ melodic stream): **drop with a report** (stream
   identity + note count) in v1. Future options, in preference order: enable
   an expansion for more channels; merge a sparse stream into a free channel's
   gaps; arpeggio-ize chords. Never silently interleave two streams on one
   channel by cutting notes.
5. `Noise`/`DPCM` get no pitched content in v1 (percussion parts are reported
   as skipped).

# 5. Within a stream: chords, ties, rests

| Case | Rule |
|---|---|
| Chord (multiple pitches, one onset, one stream) | Keep **one** pitch: default the highest (melody bias); report per-measure kept/dropped counts. Alternatives to A/B by ear: keep lowest (bass bias per channel role), or emit an arpeggio instrument (future) |

Extensibility rule (v1 decision, made 2026-10-27): v1 converts monophonic
streams only, but the intermediate event model **retains every chord pitch**
at an onset. Chord reduction is a conversion policy applied at channel
allocation time, not a parser behavior. Future policies — split chord tones
across free melodic channels, or emit an arpeggio instrument — therefore
require no parser or event-model change, only a new allocation rule. See
OpenSpec design decision D7 in
`openspec/changes/musicxml-to-nes-vertical-slice/design.md`.
| Overlapping notes in one stream (should not happen after stream split) | Truncate the earlier note at the next onset; report |
| Tie chain (`<tie start/stop>`) | Merge into one event, durations summed, before quantization. (Read `<tie>`, not `<notations><tied>`) |
| Rest / gap (incl. `<forward>` gaps) | Emit nothing; the previous note's `Duration` already ends it. A trailing articulation gap (e.g. shorten every note by 1 frame for separation) is **off** by default — durations stay faithful until listening says otherwise |
| Note exactly at pattern end | `Duration` may end on the pattern boundary; do not spill into the next pattern — split with `Attack="False"` continuation only if a duration must cross (prefer exact measure alignment so this is rare) |

# 6. Instruments and volume

- Generate exactly the instruments in
  [instruments and envelopes](/famistudio/instruments-and-envelopes.md):
  `Lead` (Square1), `Harmony` (Square2), `Bass` (Triangle), flat envelopes,
  and reference them by name on every note.
- v1 volume: omit per-note `Volume` (instrument envelope governs). Dynamics
  (`<sound dynamics>` % / `<pp/>`–`<ff/>`) → `Volume` 0–15 is phase 2; when
  added, anchor forte (default velocity 90) ≈ 12 and scale linearly, clamped
  1–15, with the mapping table recorded in the conversion report.

# 7. Conversion report (required output alongside the .txt)

Counts and details for: notes converted per channel; dropped overflow-stream
notes; reduced chord tones; octave-shifted/clamped pitches; microtone
roundings; tempo defaulting and requested-vs-actual BPM; max onset
quantization error (frames); unfolded repeats; skipped percussion/grace
content. The slice's acceptance checks consume this report — see the
[vertical slice plan](/famitune/vertical-slice-plan.md).

# Worked micro-example

Hello World (C4 whole note, 4/4, divisions=1, no tempo marking → default
♩=120 warned): grid = 16ths (16 rows/measure), frames-per-row ideal =
(60/120)*60.0988/4 ≈ 7.51 → groove `8-7` (avg 7.5, actual ≈ 120.2 BPM,
reported). Event: one note, MIDI 60 → `C3`, row 0, duration 16 rows:

```text
Project Version="<pinned>" TempoMode="FamiStudio" Name="Hello World"
	Instrument Name="Lead"
		Envelope Type="Volume" Length="1" Values="15"
		Envelope Type="DutyCycle" Length="1" Values="2"
	Song Name="Hello World" Length="1" LoopPoint="-1" PatternLength="16" BeatLength="4" NoteLength="7" Groove="8-7" GroovePaddingMode="Middle"
		Channel Type="Square1"
			Pattern Name="M001"
				Note Time="0" Value="C3" Duration="112" Instrument="Lead"
			PatternInstance Time="0" Pattern="M001"
		Channel Type="Square2"
		Channel Type="Triangle"
		Channel Type="Noise"
		Channel Type="DPCM"
```

`NoteLength` and `Groove` are both mandatory in the 4.5.0 loader. Note
`Time`/`Duration` count in subrows (1/`NoteLength` of a row): 16 rows at
`NoteLength` 7 is `Duration="112"`. `PatternLength`/`BeatLength`/`Length`
stay in rows. `PatternInstance` lines are children of each `Channel`, not
song-level. All verified against the pinned 4.5.0 build (loader source,
render probes, and a `famistudio-txt-export` round trip); the upstream docs
example predates these rules.
