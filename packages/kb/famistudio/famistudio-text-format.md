---
type: Reference
title: FamiStudio Text format — specification
description: The line-based FamiStudio text project format — grammar, object hierarchy, attributes, worked example, and version constraints. Primary output format for utstack-famitune.
tags: [famistudio, text-format, file-format, converter-target]
status: stable
generated: { by: muse-wonder/1.0, at: 2026-10-27T05:10:21Z }
sources:
  - id: famistudio-gitingest
    resource: /references/sources/gitingest-bleubleu-famistudio-8a5edab282632443.txt
    title: Gitingest of BleuBleu/FamiStudio (FamiStudio repo)
---

# Overview

The FamiStudio Text format is a textual representation of a FamiStudio
project, "designed to favor interoperability with other apps, tools and sound
engines" — it is the documented, human-writable way to generate a FamiStudio
project without the binary `.fms` format, and therefore the output format for
[utstack-famitune](/famitune/utstack-famitune-overview.md).[^famistudio-gitingest]

**Version lock (critical):** unlike `.fms`, this format is *not* forward or
backward compatible. FamiStudio only reads text files generated with the same
major.minor version (e.g. all 3.0.x files are mutually readable). The
`Project Version="…"` attribute must stamp the version of the FamiStudio build
that will import the file — pin a FamiStudio version (4.5.x line in the
ingested docs) in the converter and its tests. Export/import is mostly
lossless; exceptions: custom colors are randomized on re-import, and only the
final processed DPCM sample data is exported.

# Grammar

One object per line; attributes are `Name="Value"` pairs, always
double-quoted; a literal `"` inside a value is escaped by doubling it (`""`).
Indentation is purely cosmetic and encodes the nesting:[^famistudio-gitingest]

```
Object Attribute1="Value1" Attribute2="Value2"
```

Object nesting:

```
Project
├── DPCMSample
├── DPCMMapping          (project level; maps a piano note to a sample)
├── Instrument
│   └── Envelope
├── Arpeggio             (project level in current format)
└── Song
    ├── PatternCustomSettings
    ├── Channel
    │   └── Pattern
    │       └── Note
    └── PatternInstance
```

# Worked example (upstream, abridged only in whitespace)

```text
Project Version="2.0.0" TempoMode="FamiStudio" Name="FamiStudio Tutorial" Author="NesBleuBleu"
	DPCMSample Name="BassDrum" Data="aaaaaaaaaaaff09e9ff006ae7c1b98f0000300"
	DPCMMapping Note="C3" Sample="BassDrum" Pitch="15" Loop="False"
	Instrument Name="Lead"
		Envelope Type="Volume" Length="1" Values="12"
		Envelope Type="DutyCycle" Length="1" Values="2"
	Instrument Name="Lead2"
		Envelope Type="Volume" Length="12" Values="15,12,11,9,7,6,5,4,3,2,1,1"
	Song Name="Tutorial Song" Length="5" LoopPoint="1" PatternLength="16" BeatLength="4" NoteLength="7"
		PatternCustomSettings Time="0" Length="10" NoteLength="7" BeatLength="4"
		Channel Type="Square1"
			Pattern Name="Intro1"
				Note Time="0" Value="G3" Instrument="Lead"
				Note Time="63" Value="A#3" Instrument="Lead" SlideTarget="C4"
			Pattern Name="Melody1"
				Note Time="0" Value="C4" Instrument="Lead2" Volume="15"
		PatternInstance Time="0" Pattern="Intro1"
		PatternInstance Time="1" Pattern="Melody1"
```

Note the `Version="2.0.0"` above is from the upstream documentation example —
**do not copy it**; emit the pinned importer's version instead.
`Note Time`/`Duration` count in subrows (1/`NoteLength` of a row), not whole
rows and not frames: the exporter divides internal rows by `NoteLength` and
the loader stores the values raw (verified against the 4.5.0 loader source
and render probes). `PatternLength`/`BeatLength`/`PatternCustomSettings
Length` stay in rows (the loader multiplies them by `NoteLength`).
`NoteLength` (frames per note, on `Song`/`PatternCustomSettings`) converts
rows to frames. See [tempo, frames and grooves](/famistudio/tempo-frames-and-grooves.md).

# Object reference (converter-relevant subset)

Full attribute tables are in the upstream export documentation;[^famistudio-gitingest]
the objects a converter must emit/read are:

## Project

| Attribute | Mandatory | Meaning |
|---|---|---|
| `Version` | Yes | Exporting FamiStudio version (see version lock) |
| `TempoMode` | No | `FamiStudio` (default for generated files) or `FamiTracker` |
| `Expansion` | No | Expansion audio: `VRC6`, `VRC7`, `FDS`, `MMC5`, `N163`, `S5B`, … Omit for stock NES |
| `Name`, `Author`, `Copyright` | No | Metadata (also used by NSF export) |

## Instrument / Envelope / Arpeggio

| Object | Key attributes |
|---|---|
| `Instrument` | `Name` (mandatory). Expansion instruments add typed params (e.g. `Vrc7Patch`, `N163WaveSize`) — omit for stock NES |
| `Envelope` (child of Instrument) | `Type` (`Volume`, `Arpeggio`, `Pitch`, `DutyCycle`, `FDSWave`, `FDSMod`, `N163Wave`), `Length` 0–255, `Values` comma-separated (-64..63), optional `Loop`, `Release` (volume only), `Relative` (pitch only) |
| `Arpeggio` | `Name`, `Length`, `Loop`, `Values` comma-separated (-64..63) |

A minimal playable instrument is a single volume envelope, e.g.
`Envelope Type="Volume" Length="1" Values="15"` (see
[instruments and envelopes](/famistudio/instruments-and-envelopes.md)).

## Song

| Attribute | Mandatory | Meaning |
|---|---|---|
| `Name` | Yes | Song name |
| `Length` | Yes | Song length **in pattern columns** (number of `PatternInstance` positions) |
| `LoopPoint` | Yes | Column index to loop to; `-1` disables looping |
| `PatternLength` | Yes | Notes (rows) per pattern |
| `BeatLength` | Yes | Notes per beat (visual/BPM reference; recommended 4) |
| `NoteLength` | FamiStudio tempo | Frames per note (with `Groove`, defines BPM) |
| `Groove` | FamiStudio tempo | Frame-count sequence per note for exact BPMs (e.g. `7-6-6`) |
| `GroovePaddingMode` | FamiStudio tempo | Where injected pad frames go: `Beginning`, `Middle`, `End` |
| `FamiTrackerTempo` / `FamiTrackerSpeed` | FamiTracker tempo | Tracker tempo/speed counters |

`PatternCustomSettings` (child of Song): `Time` (pattern column it applies to)
+ overrides for `Length`, `NoteLength`, `BeatLength`, `Groove`,
`GroovePaddingMode` — how a converter expresses pickup measures, per-measure
tempo changes, and odd measure lengths.

## Channel / Pattern / PatternInstance

- `Channel Type="…"` — `Square1`, `Square2`, `Triangle`, `Noise`, `DPCM` for
  the stock NES (plus expansion types such as `VRC6Square1`, `N163Wave1`…).
  See [NES channels and notes](/famistudio/nes-channels-and-notes.md).
- `Pattern Name="…"` (child of Channel) — a reusable block; notes inside are
  channel-local.
- `PatternInstance Time="…" Pattern="…"` (child of Song) — places a pattern at
  a song column. **Caveat for generators:** the upstream example shows
  `PatternInstance` lines at Song level without a channel qualifier, while
  patterns are defined per channel — verify against a real export from the
  pinned FamiStudio version how instances bind to channels before finalizing
  an emitter (round-trip test in the
  [vertical slice plan](/famitune/vertical-slice-plan.md)).

## Note

| Attribute | Meaning |
|---|---|
| `Time` | **Mandatory.** Subrow (1/`NoteLength` of a row) inside the pattern where the note starts |
| `Value` | Pitch name `C0`–`B7` (sharp spelling, e.g. `A#3`); `"Stop"` for an orphan stop note; omitted for non-musical (effect-only/stop) notes |
| `Duration` | Length in subrows (musical notes) |
| `Instrument` | Instrument name (musical notes) |
| `Volume` | 0–15 |
| `Attack` | `True`/`False` — whether the note re-triggers the instrument envelope |
| `SlideTarget` | Pitch name — slide (portamento) target, C0–B7 |
| `Arpeggio` | Arpeggio name |
| `VolumeSlide`, `VibratoSpeed` (0–12), `VibratoDepth` (0–15), `Speed`, `FinePitch` (-128..127), `DutyCycle`, `NoteDelay`, `CutDelay`, `FdsModSpeed/Depth` | Effect attributes; omit in a first converter except as the mapping spec requires |

Internal model cross-check (`Note.cs`): musical note values are bytes
1–96 (C0–B7; C4 = `0x31`), 0 = stop, with duration/release in rows and the
effect set above.[^famistudio-gitingest]

[^famistudio-gitingest]: Gitingest of BleuBleu/FamiStudio (FamiStudio repo)
