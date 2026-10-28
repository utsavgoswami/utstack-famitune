---
type: Reference
title: MusicXML development practice (Karim Ratib interview)
description: Practical MusicXML development guidance from spec editor Karim Ratib — precise subset scope, logging unhandled constructs, XSD validation, sample-file testing, and tooling.
tags: [musicxml, practice, testing, validation, karim-ratib]
status: stable
generated: { by: muse-wonder/1.0, at: 2026-10-27T05:10:21Z }
sources:
  - id: ratib-interview
    resource: https://davidmatthew.ie/musicxml-tips-thoughts-karim-ratib/
    title: "MusicXML Tips and Thoughts: An Interview with Karim Ratib (David Matthew)"
---

# Overview

Karim Ratib, editor of the MusicXML specification, gives practical advice for
developers working with MusicXML.[^ratib-interview] It directly informs how
[utstack-famitune](/famitune/utstack-famitune-overview.md) scopes, tests, and
validates its converter.

# Core challenge

MusicXML captures three orthogonal concerns — logical notation, page layout,
and sounding (MIDI) information — across everything from jazz lead sheets to
orchestral scores. No software the interviewee has used, including commercial
tools, handles every valid construct; implicit behaviors arise from
combinations of elements and are often only documented in narrative text, if
at all.[^ratib-interview] Expecting full-spec coverage is therefore the wrong
goal; subset discipline is.

# Recommendations, mapped to this project

| Recommendation[^ratib-interview] | Where utstack-famitune applies it |
|---|---|
| Define a precise scope for import/export; a subset is legitimate | [Converter input profile](/musicxml/converter-input-profile.md) fixes the supported subset |
| On import, log unhandled cases instead of silently ignoring them | Mapping spec's conversion report; OpenSpec requirement "Every loss and unhandled construct is reported" |
| On export, validate generated files against the XSD schema | Analog for this project: validate generated FamiStudio Text by round-trip import/render with the pinned FamiStudio build |
| Use sample MusicXML files for unit tests | Fixture ladder in the [vertical slice plan](/famitune/vertical-slice-plan.md); upstream example files are fixture sources |
| Read and re-read the standard; clarify via community discussions | The distilled [MusicXML concepts](/musicxml/index.md) link back to the gitingest source for re-reading |

# Tools mentioned (reference, not adopted wholesale)

- `validate-with-xmllint` (Node wrapper over `xmllint`) — XSD validation of
  MusicXML being imported or generated.
- Saxon.js — XSLT transforms and XPath queries over XML; XPath assertions are
  called out as an effective unit-testing technique for transformations.
- jstoxml — building XML from plain JavaScript objects.
- XSLT itself for MusicXML transformation work (concise, functional style).
- LilyPond (via Frescobaldi) as the most dependable open-source visual
  renderer for verifying output; Verovio preferred over OpenSheetMusicDisplay
  among web renderers.[^ratib-interview]

Adoption decision for those tools belongs to the converter implementation
(plain XML parsing vs XSLT is an open implementation choice); the testing and
validation practices above are adopted regardless.

[^ratib-interview]: MusicXML Tips and Thoughts: An Interview with Karim Ratib (David Matthew)
