---
type: Reference
title: NES channels and the FamiStudio note model
description: The five stock NES channels, expansion channels, pitch range C0–B7, monophony, and note/effect limits a converter must respect.
tags: [nes, apu, channels, notes, famistudio]
status: stable
generated: { by: muse-wonder/1.0, at: 2026-10-27T05:10:21Z }
sources:
  - id: famistudio-gitingest
    resource: /references/sources/gitingest-bleubleu-famistudio-8a5edab282632443.txt
    title: Gitingest of BleuBleu/FamiStudio (FamiStudio repo)
---

# Overview

The NES sound hardware (2A03/2A07 APU) gives a song **five monophonic
channels**. FamiStudio models exactly these, plus optional cartridge expansion
channels. A MusicXML converter's central constraint lives here: sheet-music
polyphony must be allocated onto a handful of one-note-at-a-time voices. See
the allocation policy in the
[mapping spec](/famitune/musicxml-to-famistudio-mapping.md).

# Stock channels (no expansion)

| FamiStudio `Channel Type` | Hardware voice | Character | Converter use |
|---|---|---|---|
| `Square1` | Pulse/square 1 | Lead-capable, duty-cycle timbres | Melody (default first melodic stream) |
| `Square2` | Pulse/square 2 | Same as Square1 | Harmony / second stream |
| `Triangle` | Triangle | Fixed-volume bass-ish voice (no duty cycle) | Lowest stream / bass line |
| `Noise` | Noise | Percussion/noise, no pitched melody | Drums only — no pitched MusicXML mapping in v1 |
| `DPCM` | Delta-PCM samples | Plays mapped samples (`DPCMSample` + `DPCMMapping`, notes C1–D6) | Sampled drums — out of scope for pitched conversion in v1 |

# Expansion channels (opt-in, changes the instrument)

Enabling an expansion in `Project Expansion="…"` adds channels and requires
matching expansion instruments:[^famistudio-gitingest]

| Expansion | Added channels |
|---|---|
| VRC6 | `VRC6Square1`, `VRC6Square2`, `VRC6Saw` |
| VRC7 | `VRC7FM1`–`VRC7FM6` (FM synthesis) |
| FDS | `FDS` (wavetable + modulation) |
| MMC5 | `MMC5Square1`, `MMC5Square2` (+ `MMC5DPCM`) |
| N163 | `N163Wave1`–`N163Wave8` (wavetable) |
| S5B | `S5BSquare1`–`S5BSquare3` |
| EPSM | Square/FM/rhythm sets (modern add-on hardware) |

Stock-NES output (no expansion) is the correct default for a first converter:
it plays everywhere, and expansions can be added later as extra channel
capacity. Multiple expansions are supported by FamiStudio but never shipped
in a real NES game.

# Note model

From `Note.cs` and the text-format spec:[^famistudio-gitingest]

- **Pitch:** full 96-note range **C0–B7** (internal values 1–96, C4 = 0x31 =
  49; value 0 = stop note, `0xff` = empty/invalid). Names use sharps only:
  `C, C#, D, D#, E, F, F#, G, G#, A, A#, B` × octaves 0–7. The sound engine
  supports the full 96 notes on the melodic channels.
- **Monophony:** one sounding pitch per channel at a time. A new note cuts the
  previous one unless it is a slide/continuation; `Attack="False"` and
  `SlideTarget` express legato/portamento.
- **Timing:** a note has a start row (`Time`), a `Duration` in rows, and an
  optional release point; rows convert to NES frames through the song's tempo
  settings ([tempo, frames and grooves](/famistudio/tempo-frames-and-grooves.md)).
  Pattern length max is 2048 rows (`Pattern.MaxLength`).
- **Volume:** per-note `Volume` 0–15 (plus an instrument volume envelope).
  Triangle has no hardware volume control beyond on/off in the raw APU, but
  FamiStudio still models volume through its engine — do not hand-tune this;
  rely on FamiStudio's rendering.
- **Effects on notes (selected):** `VolumeSlide`, `VibratoSpeed` 0–12 /
  `VibratoDepth` 0–15, `FinePitch` -128..127, `DutyCycle` (0–3 on stock
  squares), `NoteDelay`/`CutDelay` in frames, `SlideTarget` (slide notes),
  `Arpeggio` reference. A pitch-only converter needs none of these except
  where the [mapping spec](/famitune/musicxml-to-famistudio-mapping.md) says
  so.
- **Stop/release:** an orphan stop note is `Value="Stop"` in text; shortened
  notes are expressed by `Duration` (and `CutDelay` for frame-level cuts in
  FamiTracker tempo mode).

# Hard limits to validate on emit

1. Every melodic `Value` within C0–B7 (after any octave shift/clamp).
2. At most one overlapping pitched note per channel (durations may abut, not
   overlap).
3. `Volume` 0–15, `VibratoSpeed` 0–12, `VibratoDepth` 0–15, `FinePitch`
   -128..127 when used.
4. Notes only on channels that exist in the project (no expansion channel
   without the matching `Expansion` and instrument types).

[^famistudio-gitingest]: Gitingest of BleuBleu/FamiStudio (FamiStudio repo)
