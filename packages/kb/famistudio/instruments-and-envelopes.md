---
type: Reference
title: FamiStudio instruments and envelopes
description: How FamiStudio instruments and their envelopes shape NES timbre, and the minimal instrument set a MusicXML converter should generate.
tags: [famistudio, instruments, envelopes, timbre]
status: stable
generated: { by: muse-wonder/1.0, at: 2026-10-27T05:10:21Z }
sources:
  - id: famistudio-gitingest
    resource: /references/sources/gitingest-bleubleu-famistudio-8a5edab282632443.txt
    title: Gitingest of BleuBleu/FamiStudio (FamiStudio repo)
---

# Overview

In FamiStudio, a note's timbre comes from its **instrument**. Instruments have
envelopes — per-frame parameter sequences that run while a note plays — plus
optional arpeggios. A MusicXML converter knows pitches and durations but no
NES timbre, so it must *synthesize* a small, sane instrument set. This concept
summarizes the model; which instruments to generate is decided in the
[mapping spec](/famitune/musicxml-to-famistudio-mapping.md).[^famistudio-gitingest]

# Envelope model

An envelope is a sequence of values (length 0–255) advanced one step per frame,
with an optional loop point; a volume envelope may also have a release point
(where the value heads after note release). In the
[text format](/famistudio/famistudio-text-format.md):

```text
Instrument Name="Lead"
	Envelope Type="Volume" Length="1" Values="12"
	Envelope Type="DutyCycle" Length="1" Values="2"
```

| Envelope `Type` | Effect (values) |
|---|---|
| `Volume` | Loudness over the note (0–15 scale in practice) |
| `DutyCycle` | Square-wave duty (0–3 on stock squares; timbre brightness) |
| `Pitch` | Pitch offset per frame; `Relative="True"` accumulates (slides/drops), absolute by default (vibrato shapes) |
| `Arpeggio` | Semitone offsets cycling chord tones from one channel |
| `FDSWave` / `FDSMod` / `N163Wave` | Expansion-only wavetable shapes |

Notes can also reference a standalone **Arpeggio** object (name, length, loop,
values -64..63) for chord-tone cycling — the classic way to fake polyphony on
one NES channel, and a future option for MusicXML chords.

Practical notes:

- Deleting an instrument deletes its notes; names must be unique, and imported
  songs match instruments **by name** — generated names must be stable.
- Expansion channels need expansion instruments (except MMC5 squares, which
  reuse stock square instruments).
- Per-note `Volume` (0–15) multiplies with the volume envelope; per-note
  `DutyCycle`, vibrato, fine pitch and slide attributes can override/add
  expression per note (see [note model](/famistudio/nes-channels-and-notes.md)).

# Minimal generated instrument set (starting point)

For a first converter, three flat instruments cover the stock melodic channels
(all values are starting points to tune by ear, not upstream defaults):

| Instrument | For channels | Envelopes | Rationale |
|---|---|---|---|
| `Lead` | Square1 | Volume flat 15 (or short decay), DutyCycle 2 | Audible, neutral square lead (shape follows the upstream text-format example) |
| `Harmony` | Square2 | Volume flat 12, DutyCycle 1 | Slightly softer/darker second square so lines separate |
| `Bass` | Triangle | Volume flat 15 | Triangle is naturally bass-like; keep full volume |

Keep instruments *flat* (Length 1) until pitches/durations/tempo are verified
by listening — envelopes that decay can masquerade as duration bugs. Add decay,
vibrato or arpeggio instruments only as deliberate phase-2 expression work.

[^famistudio-gitingest]: Gitingest of BleuBleu/FamiStudio (FamiStudio repo)
