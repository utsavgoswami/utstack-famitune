---
type: Playbook
title: Vertical slice plan — MusicXML in, NES music out, listen and verify
description: Step-by-step first build of utstack-famitune — parse, convert, emit FamiStudio Text, render WAV/NSF, and check the port is correct.
tags: [famitune, vertical-slice, plan, testing, hackathon]
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

# Goal of the slice

Prove the whole bridge end-to-end on the smallest real inputs:

**MusicXML file → converter → FamiStudio Text → (FamiStudio CLI) → WAV + NSF →
listen and verify the NES version plays the same notes, rhythms and tempo.**

Governing docs: [project overview](/famitune/utstack-famitune-overview.md) ·
[input profile](/musicxml/converter-input-profile.md) ·
[mapping spec](/famitune/musicxml-to-famistudio-mapping.md) ·
[text format](/famistudio/famistudio-text-format.md) ·
[export and playback](/famistudio/export-and-playback.md).

# Steps

1. **Pin the toolchain.** Install one FamiStudio desktop build (4.5.x line);
   record its exact version — generated text must stamp that version or
   import fails. Confirm headless operation: `FamiStudio -help` lists
   `wav-export` / `nsf-export` / `famistudio-txt-export`, and a known-good
   demo project renders to WAV from the command line.
2. **Emitter round-trip (de-risk the output format first).** In FamiStudio,
   create/trivially obtain a one-song project, run
   `famistudio-txt-export`, and study the real file: channel list,
   `PatternInstance` shape and channel binding, required attributes. Adjust
   the [mapping spec's](/famitune/musicxml-to-famistudio-mapping.md) emitter
   rules to match the pinned build, then verify a hand-written minimal text
   file (the spec's Hello World example) imports and renders.
3. **Parser.** XML → events per the input profile: partwise only, `.musicxml`
   first (`.mxl` next), divisions/time-counter with `<chord/>`,
   `<backup>`/`<forward>`, ties merged, (staff, voice) streams, tempo map.
   Unit-test against the fixtures below with exact event assertions
   (pitch numbers, onsets in quarter notes).
4. **Converter.** Events → FamiStudio Text per the mapping spec: frame/groove
   realization, measure→pattern chunking, stream→channel allocation, chord
   reduction, generated instruments, conversion report.
5. **Render + listen loop.** For each fixture: convert, then
   `FamiStudio out.txt wav-export out.wav` and
   `FamiStudio out.txt nsf-export out.nsf -nsf-export-mode:ntsc`. Listen to
   the WAV; play the NSF in an emulator/player as the "real NES" check.
6. **Automated audio check (guardrail, not a substitute for listening).**
   Analyze the WAV: expected pitches present in order (e.g. dominant-frequency
   per note segment), onsets within 1 frame (~16.6 ms NTSC) of expected,
   total duration within 1 frame per measure of the score's length at the
   realized BPM. Fail the fixture on any dropped-note report entries that
   were not pre-declared as expected losses.

# Fixture ladder (in order)

| # | Fixture | Source | Proves |
|---|---|---|---|
| 1 | Hello World: one C4 whole note, 4/4 | Upstream tutorial `tutorial-hello-world.musicxml` (recreate from [score structure](/musicxml/score-structure.md) if needed) | Parser, emitter, render, one correct pitch/duration |
| 2 | Chromatic scale C4–C5 + descending, quarter notes, with a marked tempo | Hand-written | Pitch spelling (sharps), range, tempo/groove math |
| 3 | Short melody with rests, dots, a tie across a barline, two measures | Hand-written or excerpted | Time counter, tie merge, rest gaps, pattern chunking |
| 4 | Two-part piece (melody + bass), plus one chordal passage | Excerpt of upstream `tutorial-apres-un-reve.musicxml` (voice + piano) or similar | Stream splitting, Square/Triangle allocation, chord reduction + report |
| 5 | A complete short public-domain score | Upstream examples or external | End-to-end demo; conversion report reviewed by a human |

# Acceptance criteria

- Fixtures 1–4 convert with **zero undeclared losses** in the conversion
  report; fixture 5's losses are itemized and judged acceptable by listening.
- By ear: WAV and NSF play the same pitches, rhythm and tempo as the source
  score (compare against any reference playback of the MusicXML).
- Automated check (step 6) passes for fixtures 1–4.
- Re-running the converter is deterministic (byte-identical `.txt` for the
  same input + pinned version).

# Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Text-format version lock / CLI differences on hackathon machines | Import fails; no render | Step 1–2 pin and smoke-test before writing converter code; keep the pinned version string in one config place |
| `PatternInstance` channel binding differs from docs example | Patterns land on wrong channels | Step 2 round-trip against a real export is the source of truth, not the docs example |
| Frame quantization makes fast passages/tuplets slur | Rhythm sounds wrong | Cumulative onset quantization + max-error report; finer row grid when the piece needs it |
| Polyphonic piano scores overflow 3 melodic channels | Dropped music | Report-driven: slice proves the report is trustworthy; expansion channels are the follow-up |
| FamiStudio unavailable headless in CI | No automated render check | Keep parser/converter tests independent of FamiStudio; treat WAV analysis as a local/integration test |
