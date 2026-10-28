---
type: Reference
title: FamiStudio — overview
description: What FamiStudio is, its project model (songs, patterns, channels, instruments), its file formats, and coverage gaps in the ingested source.
tags: [famistudio, nes, tracker, project-model]
status: stable
generated: { by: muse-wonder/1.0, at: 2026-10-27T05:10:21Z }
sources:
  - id: famistudio-gitingest
    resource: /references/sources/gitingest-bleubleu-famistudio-8a5edab282632443.txt
    title: Gitingest of BleuBleu/FamiStudio (FamiStudio repo)
  - id: famistudio-upstream
    resource: https://github.com/BleuBleu/FamiStudio
    title: BleuBleu/FamiStudio — NES music editor
---

# Overview

FamiStudio is a music editor for the NES/Famicom: a tracker-style application
(piano roll + sequencer) for composing songs that play on the NES audio
hardware (2A03/2A07 APU) and optional cartridge expansion chips. It ships with
a sound engine (derived from FamiTone2 by Shiru) used by its NSF/ROM exporters
and available for homebrew games.[^famistudio-gitingest]

For [utstack-famitune](/famitune/utstack-famitune-overview.md), FamiStudio is
the **target toolchain**: the converter emits FamiStudio's text format, and
FamiStudio (GUI or CLI) renders it to WAV/NSF/ROM for listening. Current
release line in the ingested docs: **4.5.0**.

# Project model

A FamiStudio project contains songs, instruments, DPCM samples, and
arpeggios:[^famistudio-gitingest]

```
Project
├── Instrument[]        timbres; attributes modulated by Envelopes
│   └── Envelope[]      volume / pitch / arpeggio / duty-cycle (etc.) over time
├── DPCMSample[]        sampled drums/sounds for the DPCM channel
├── Arpeggio[]          note sequences referenced by notes
└── Song[]
    ├── Channel[]       one per NES/expansion voice (Square1, Triangle, …)
    │   └── Pattern[]   short reusable note blocks per channel
    │       └── Note[]  pitch + time + duration + instrument + effects
    └── PatternInstance[]  sequencer: which pattern plays at which song position, per channel
```

Key properties of the model for a converter:

- **Monophonic channels.** Each NES channel plays one note at a time; any
  MusicXML polyphony must be split across channels or reduced. See
  [NES channels and notes](/famistudio/nes-channels-and-notes.md).
- **Patterns, then a sequencer.** Notes live in patterns; the song is a grid
  of pattern instances over time (song `Length` = number of pattern columns,
  `LoopPoint` = column where looping resumes, `-1` = no loop). A natural
  converter chunking is one MusicXML measure → one pattern.
- **Frame-based time.** The NES advances music once per video frame
  (~60.0988 fps NTSC, ~50.007 fps PAL). All note lengths ultimately resolve to
  frame counts via tempo settings — see
  [tempo, frames and grooves](/famistudio/tempo-frames-and-grooves.md).
- **Two tempo modes.** *FamiStudio tempo* (BPM → frames-per-note with grooves;
  tempo changes only at pattern starts) and *FamiTracker tempo* (speed/tempo
  counters, tracker-style effects). New generated projects should use
  FamiStudio tempo.

# File formats

| Format | Kind | Notes |
|---|---|---|
| `.fms` | Native project | Binary: `FMS!` magic + version + compressed serialization (`ProjectFile.cs`). Human-unfriendly; do not generate |
| **FamiStudio Text** (`.txt`) | Text project | One object per line (`Object Attr="Value"`), designed for interoperability with other apps/tools. **Converter target** — see [text format](/famistudio/famistudio-text-format.md) |
| FamiTracker Text / `.ftm` | Import/export | Tracker interchange; importing is lossy for slides/envelopes. Import reference only |
| NSF/NSFe, NES ROM, FDS | Playable output | What actually runs on emulators/hardware — see [export and playback](/famistudio/export-and-playback.md) |
| WAV/MP3/OGG, MIDI, VGM | Audio/interchange output | WAV is the fastest listen-check; MIDI export exists (FamiStudio-tempo songs) |

Also supported as *inputs*: FamiTracker text/binary, MIDI files (notes, time
signature, tempo; polyphony must be pre-flattened per channel), NSF, VGM —
useful precedents: FamiStudio's own MIDI import faces the same
polyphony-to-monophonic-channels problem as a MusicXML converter.

# Source coverage and gaps

Distilled from the FamiStudio gitingest:[^famistudio-gitingest]

- **Complete and relied on:** user docs (`Docs/docs/*.md` — basics, song/tempo,
  instruments, expansion, export, import, command line, sound engine), the
  text-format specification embedded in the export docs, `Note.cs` /
  `Pattern.cs` note model, `TempoUtils.cs` groove/BPM math, CLI exporter
  strings, NSF/sound-engine docs.
- **Missing from the gitingest (do not assume):** the core `Project` / `Song` /
  `Channel` / text-serializer C# classes were not included in the dump, and the
  `.fms` binary layout is only visible through `ProjectFile.cs` framing. Any
  claim about those internals must be re-verified against the upstream repo
  before code depends on it.
- Demo songs (`.fms`, e.g. `Tetris (Tutorial Song).fms`) and `UnitTests/`
  NSF reference files are present as filenames; their binary contents are not
  readable reference for the text format.

[^famistudio-gitingest]: Gitingest of BleuBleu/FamiStudio (FamiStudio repo)
[^famistudio-upstream]: BleuBleu/FamiStudio — NES music editor
