---
type: Project Brief
title: utstack-famitune — MusicXML to NES bridge (overview)
description: Project goal, pipeline, key design decisions, scope and open questions for converting MusicXML sheet music into playable NES music via FamiStudio.
tags: [famitune, project, musicxml, nes, famistudio]
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

# Goal

**utstack-famitune** bridges sheet music and the NES: given a MusicXML file
(notes, measures, pitches, durations, tempo), automatically convert it into
the equivalent NES music so the same piece can be listened to as a chiptune —
correctly ported, not merely transcoded note-by-note.

Reference knowledge:

- Input side: [MusicXML overview](/musicxml/musicxml-overview.md) ·
  [score structure](/musicxml/score-structure.md) ·
  [notes, pitch and duration](/musicxml/notes-pitch-and-duration.md) ·
  [converter input profile](/musicxml/converter-input-profile.md)
- Output side: [FamiStudio overview](/famistudio/famistudio-overview.md) ·
  [FamiStudio Text format](/famistudio/famistudio-text-format.md) ·
  [NES channels and notes](/famistudio/nes-channels-and-notes.md) ·
  [tempo, frames and grooves](/famistudio/tempo-frames-and-grooves.md)

# Pipeline

```
MusicXML (.musicxml / .mxl)
  │  parse: parts → streams (staff/voice) → absolute-time note events
  ▼
Intermediate events (pitch as MIDI number, onset/duration in quarter notes, tempo map)
  │  convert: quantize to NES frames, allocate streams to monophonic channels,
  │           reduce chords, generate instruments  ← mapping spec
  ▼
FamiStudio Text (.txt, pinned FamiStudio version)
  │  render (FamiStudio CLI, headless)
  ├──► WAV ──► listen / automated pitch-and-onset check
  └──► NSF / NES ROM ──► emulator / hardware playback
```

The conversion rules live in the
[mapping spec](/famitune/musicxml-to-famistudio-mapping.md); the first
buildable/testable cut is the
[vertical slice plan](/famitune/vertical-slice-plan.md).

# Key decisions (draft — validate in the slice)

| Decision | Choice | Why |
|---|---|---|
| Output format | **FamiStudio Text**, not binary `.fms` | Text is the documented interoperability format ("designed to favor interoperability with other apps, tools and sound engines"); `.fms` is a versioned binary serialization. Cost: text import is version-locked, so pin a FamiStudio build |
| Playback proof | **WAV render first, NSF/ROM second** | WAV via CLI is the fastest listen-check; NSF/ROM prove real NES playback via the FamiStudio sound engine |
| Expansion audio | **None (stock 5 channels) initially** | Stock NES plays everywhere; expansions add channels/instrument complexity later |
| Tempo mode | **FamiStudio tempo** (BPM → frames/grooves) | Direct BPM semantics; FamiTracker speed/tempo counters are an import dialect, awkward to generate |
| Polyphony | **Allocate streams to channels; reduce overflow with warnings** | NES channels are monophonic; silent note loss would make ports sound wrong without explanation |

# Scope

**In (eventually):** pitched melodic parts, rests, ties, chords, multiple
parts/voices/staves, tempo markings and changes, time signatures, repeats,
dynamics-as-volume, `.mxl` input.

**Out (for now):** notation appearance (layout, beaming, lyrics display),
percussion/DPCM drum mapping, microtonal exactness, ornaments/grace-note
realization, expansion chips, sound-engine ASM embedding. The binding list is
the [input profile](/musicxml/converter-input-profile.md).

# Open questions

1. **PatternInstance channel binding** in generated text files — resolve by
   round-tripping a real export from the pinned FamiStudio before finalizing
   the emitter (noted in the [text format](/famistudio/famistudio-text-format.md)).
2. **Channel allocation defaults** — is "lowest stream → Triangle" right for
   typical scores, or should allocation be pitch-range driven per measure?
3. **Chord reduction default** — keep-highest vs keep-lowest vs arpeggio
   instrument; needs listening tests on real scores.
4. **FamiStudio version pin** — which 4.5.x build is available on the
   hackathon machines/CI, and does its CLI run headless there?
