---
type: Reference
title: MusicXML converter input profile
description: The MusicXML subset utstack-famitune consumes — supported, approximated, and ignored constructs, with error/warning behavior.
tags: [musicxml, converter, input-profile, scope]
status: draft
generated: { by: muse-wonder/1.0, at: 2026-10-27T05:10:21Z }
sources:
  - id: musicxml-gitingest
    resource: /references/sources/gitingest-w3c-cg-musicxml-8a5edab282632443.txt
    title: Gitingest of w3c-cg/musicxml (MusicXML standard repo)
---

# Overview

MusicXML can express far more than the NES can play. This profile fixes what
the [utstack-famitune](/famitune/utstack-famitune-overview.md) converter reads
so conversion is deterministic and losses are reported, never silent. It
implements the sounding (MIDI-compatible) subset described in
[notes, pitch and duration](/musicxml/notes-pitch-and-duration.md); the
note-for-note mapping to FamiStudio is in the
[mapping spec](/famitune/musicxml-to-famistudio-mapping.md).

Status is `draft`: the profile is a build decision, not yet validated against
an implementation.

# Supported (must handle)

| Input | Behavior |
|---|---|
| `<score-partwise>` (plain `.musicxml`/`.xml`) | Primary input layout |
| `.mxl` (ZIP + `META-INF/container.xml` → rootfile) | Unzip in memory, then same as plain |
| Header `<part-list>`; `<work>`/`<movement-title>`; composer | Part identity; title/author metadata for the generated project |
| `<attributes>`: `<divisions>` (incl. mid-part changes), `<time>`, `<transpose><chromatic>` | Timing denominator; measure length; sounding-pitch correction |
| `<note>` with `<pitch>` (integer `<alter>`), `<duration>`, `<rest/>`, `<chord/>`, `<tie>`, `<voice>`, `<staff>` | Core events: pitched notes, rests, simultaneities, sustained ties, streams |
| `<backup>`, `<forward>` | Time-cursor moves; stream interleaving |
| Tempo from `<sound tempo>` or `<metronome>` direction | Song tempo; changes at measure boundaries |
| `<barline>` repeats (forward/backward, simple endings) | Unfold to linear measures *or* set a loop point — pick one per implementation and log it |

# Approximated (handle with a warning)

| Input | Approximation |
|---|---|
| Chords / polyphony beyond available NES channels | Reduce per the mapping spec's channel-allocation policy; count and report dropped notes |
| Pitches outside C0–B7 | Octave-shift into range where possible, else clamp; report every affected note |
| Non-integer `<alter>` (microtones) | Nearest semitone (+ FamiStudio fine pitch if used); report |
| Tuplets and fine rhythmic grids | Quantize absolute onsets to the frame grid with cumulative (error-diffused) rounding; report max onset error in frames |
| Dynamics (`<sound dynamics>`, `<pp/>`–`<ff/>`) | Map to FamiStudio volume 0–15 (phase 2; fixed volume in the first slice is acceptable if logged) |
| Tempo with no marking | Default ♩=120 and warn |
| Multiple tempo markings mid-piece | Apply at pattern (measure-group) boundaries; FamiStudio tempo can only change tempo at pattern starts |

# Ignored (notation/appearance — skip silently or count only)

`<type>`, `<dot/>` (duration already encodes dots), stems, beams, clefs as
graphics, `<accidental>` display marks, `<notations>` (except reading `<tie>`
from the sound-level `<tie>` element instead), lyrics, `<harmony>` chord
symbols, `<print>`/layout, `<credit>`, fingering, tablature specifics,
percussion `<unpitched>` parts (until a Noise/DPCM mapping exists), grace
notes, ornaments (`<trill-mark>` etc. beyond tie handling).[^musicxml-gitingest]

# Rejected (hard error, no output)

- Root is neither `<score-partwise>` nor `<score-timewise>` → "not a MusicXML
  score". `<score-timewise>` input: reject with a clear message in v1 (upstream
  ships a `timepart.xsl` conversion to partwise as a future option).
- Malformed XML, missing `<part-list>`, `<part id>` with no matching
  `<score-part>`, note `<duration>` ≤ 0 on a non-grace note, or `<divisions>`
  ≤ 0 → fail with the measure/part location in the message.

[^musicxml-gitingest]: Gitingest of w3c-cg/musicxml (MusicXML standard repo)
