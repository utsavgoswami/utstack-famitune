---
type: Reference
title: MusicXML score structure (partwise)
description: The score-partwise hierarchy — header, part-list, part, measure, attributes — with the minimal Hello World score.
tags: [musicxml, score-structure, partwise]
status: stable
generated: { by: muse-wonder/1.0, at: 2026-10-27T05:10:21Z }
sources:
  - id: musicxml-gitingest
    resource: /references/sources/gitingest-w3c-cg-musicxml-8a5edab282632443.txt
    title: Gitingest of w3c-cg/musicxml (MusicXML standard repo)
---

# Overview

A `<score-partwise>` document is: score header, then one `<part>` per entry in
the header's `<part-list>`, each part holding `<measure>` elements, each measure
holding music data ([overview](/musicxml/musicxml-overview.md)). Element order
inside containers is constrained by the schema (e.g. inside `<note>`, `<pitch>`
precedes `<duration>`), so parsers can rely on document order.[^musicxml-gitingest]

# Minimal score (Hello World)

One measure, one whole note on middle C, 4/4:[^musicxml-gitingest]

```xml
<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.1">
  <part-list>
    <score-part id="P1">
      <part-name>Music</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key>
          <fifths>0</fifths>
        </key>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
        <clef>
          <sign>G</sign>
          <line>2</line>
        </clef>
      </attributes>
      <note>
        <pitch>
          <step>C</step>
          <octave>4</octave>
        </pitch>
        <duration>4</duration>
        <type>whole</type>
      </note>
    </measure>
  </part>
</score-partwise>
```

This is the recommended first test fixture for
[utstack-famitune](/famitune/vertical-slice-plan.md): one part, one measure, one
pitched note. (`<divisions>1</divisions>` = 1 division per quarter note, so
`<duration>4</duration>` = 4 quarter notes = a whole note.)

# Score header

| Element | Required | Converter relevance |
|---|---|---|
| `<part-list>` with `<score-part id>` + `<part-name>` | **Yes** — the only required header element | Defines the parts; `<part id="…">` in the body must match a `score-part` id (ids often `P1`, `P2`, …) |
| `<work>` / `<movement-title>` | No | Song title metadata (map to FamiStudio project/song name) |
| `<identification>` (`<creator type="composer">`, `<rights>`, `<encoding>`) | No | Author/copyright metadata |
| `<defaults>`, `<credit>` | No | Page layout/notation appearance — ignore for sound conversion |

# Measure content (music data)

Elements that can appear inside a measure, in document order. Sound-relevant
ones are marked ●; the rest are notation/appearance or metadata that a sound
converter may ignore (see the
[input profile](/musicxml/converter-input-profile.md)):[^musicxml-gitingest]

| Element | Sound | Meaning |
|---|---|---|
| `<attributes>` | ● | `<divisions>`, `<key>`, `<time>`, `<transpose>`, clefs/staves. Usually at measure start; can appear mid-measure |
| `<note>` | ● | A pitched note, rest (`<rest/>`), or chord tone (`<chord/>`). See [notes, pitch and duration](/musicxml/notes-pitch-and-duration.md) |
| `<backup>` / `<forward>` | ● | Move the musical time counter back/forward (voices, staves, layers) |
| `<direction>` | ● | Tempo/dynamics/expression marks; may carry `<sound tempo="…">` / `<sound dynamics="…">` |
| `<barline>` | ● | Repeats and endings (`<repeat>`, `<ending>`) when present; absent in regular measures |
| `<harmony>`, `<figured-bass>` | ○ | Chord symbols / figured bass (analysis, not sounding notes) |
| `<print>`, `<sound>` (standalone), `<listening>`, `<grouping>`, `<link>`, `<bookmark>` | ○ | Layout or playback hints; `<sound>` attributes can still carry tempo — check the input profile |

# Attributes that set interpretation state

State that persists until changed, typically set in the first measure:

- **`<divisions>`** — divisions per quarter note; the denominator for every
  `<duration>`. May change mid-part (broadest compatibility: one value per part,
  at the start).
- **`<key><fifths>`** — key signature as circle-of-fifths count (negative =
  flats, positive = sharps); `<mode>` major/minor. Display/context only:
  sounding pitch always carries its own `<alter>`.
- **`<time><beats>` / `<beat-type>`** — time signature numerator/denominator.
  Drives measure length (and therefore pattern length when chunking).
- **`<transpose><chromatic>`** — semitones to add to written pitch to get
  sounding pitch for transposing instruments (`<diatonic>`/`<octave-change>`
  refine notation/doubling). A converter targeting sound must apply it.
- **`<clef>`, `<staves>`, `<staff>`** — notation layout; `<staves>2</staves>`
  (e.g. piano grand staff) signals one part spanning two staves, which matters
  when splitting a part into monophonic streams.

# Compressed `.mxl` files

`.mxl` is a ZIP archive: read `META-INF/container.xml`, follow its `<rootfile>`
to the score file, and parse that as above. The upstream tutorial on compressed
files covers the container details.[^musicxml-gitingest] Plain `.musicxml`
needs no container handling.

[^musicxml-gitingest]: Gitingest of w3c-cg/musicxml (MusicXML standard repo)
