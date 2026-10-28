---
type: Reference
title: MusicXML — overview
description: What MusicXML is, its two score layouts, current version, and what the upstream w3c-cg/musicxml repo contains.
tags: [musicxml, sheet-music, interchange]
status: stable
generated: { by: muse-wonder/1.0, at: 2026-10-27T05:10:21Z }
sources:
  - id: musicxml-gitingest
    resource: /references/sources/gitingest-w3c-cg-musicxml-8a5edab282632443.txt
    title: Gitingest of w3c-cg/musicxml (MusicXML standard repo)
  - id: musicxml-upstream
    resource: https://github.com/w3c-cg/musicxml
    title: w3c-cg/musicxml — MusicXML specification (W3C Music Notation Community Group)
---

# Overview

MusicXML is an XML-based interchange format for sheet music (musical notation),
maintained by the W3C Music Notation Community Group.[^musicxml-upstream] It
represents both how music *looks* (notation: stems, beams, clefs, layout) and
how it *sounds* (pitch, duration, ties, tempo suggestions) — the sounding subset
is designed to be sufficient to generate a MIDI file, and is the subset a
converter to another sound format should consume. See
[notes, pitch and duration](/musicxml/notes-pitch-and-duration.md) and the
[converter input profile](/musicxml/converter-input-profile.md).

This project ([utstack-famitune](/famitune/utstack-famitune-overview.md)) reads
MusicXML as its input format and converts the sounding content to NES music via
[FamiStudio](/famistudio/famistudio-overview.md).

# The two score layouts

MusicXML has two root layouts because a score is a lattice (parts × measures),
not a hierarchy:[^musicxml-gitingest]

| Root element | Primary axis | Shape |
|---|---|---|
| `<score-partwise>` | part (player/instrument) | `score-partwise > part > measure > music data` |
| `<score-timewise>` | measure | `score-timewise > measure > part > music data` |

- In practice, most MusicXML applications use `<score-partwise>`. If all else
  is equal, it is the format of choice.
- The repo ships XSLT stylesheets (`parttime.xsl`, `timepart.xsl`) to convert
  between the two layouts, so a reader can normalize to partwise.
- Both layouts share the same score header (only `<part-list>` is required)
  and the same music-data elements (`note`, `backup`, `forward`, `direction`,
  `attributes`, `harmony`, `barline`, …). See
  [score structure](/musicxml/score-structure.md).

# Versions and files

- Current version in the repo: **MusicXML 4.1** (files declare
  `version="4.1"`; validated with XSD schemas — DTDs are no longer updated as
  of 4.1).[^musicxml-gitingest]
- Plain files are XML text (commonly `.musicxml` / `.xml`); `.mxl` is a ZIP
  container holding the score plus metadata. See the compressed-files handling
  in [score structure](/musicxml/score-structure.md).
- There is also an *opus* layer (`<opus>` links multiple movement files) and a
  container format for `.mxl`; neither is needed for single-song conversion.

# What the upstream repo contains

Distilled from the gitingest:[^musicxml-gitingest]

| Area | Contents | Relevance to this project |
|---|---|---|
| `schema/` | XSD/DTD/mod schema sources (`score.mod`, `common.mod`, `attributes.mod`, …), catalog | Normative element definitions; validation of test inputs |
| `docs/src/pages/tutorial/` | Tutorials: hello-world, structure, MIDI-compatible part, notation basics, percussion, tablature, chord symbols, compressed `.mxl`, code generation | **Primary reading** for converter semantics |
| `docs/src/data/examples/` | Hundreds of small per-element examples plus full tutorial scores (e.g. `tutorial-hello-world.musicxml`, `tutorial-apres-un-reve.musicxml`, `tutorial-chopin-prelude.musicxml`) | Test fixtures, from one note to real scores |
| `tests/` | Schema/schematron validation harness and sample files | How upstream validates; not needed by the converter |
| `docs/` site code | Astro documentation site | Ignore for conversion work |

[^musicxml-gitingest]: Gitingest of w3c-cg/musicxml (MusicXML standard repo)
[^musicxml-upstream]: w3c-cg/musicxml — MusicXML specification (W3C Music Notation Community Group)
