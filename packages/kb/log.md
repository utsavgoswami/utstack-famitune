# Update Log

## 2026-10-28

- **Vertical slice complete**: implemented OpenSpec change `musicxml-to-nes-vertical-slice` (20/20 tasks, all increments) — see the converter package. Human listening verdicts: all four fixtures pass.
- **Corrections**: fixed the octave rule and text time units in the [mapping spec](/famitune/musicxml-to-famistudio-mapping.md), [notes, pitch and duration](/musicxml/notes-pitch-and-duration.md), and [text format](/famistudio/famistudio-text-format.md) — all verified against the pinned FamiStudio 4.5.0 build.
- **Learnings**: mistakes and fixes from the build now live in [LEARNINGS.md](../../LEARNINGS.md) at the repo root.

## 2026-10-27

- **Creation**: Scaffolded the Famitune Knowledgebase bundle with `okf_init.py` — see [getting started](getting-started.md).
- **Creation**: Ingested the first document, the Meta Global AI Developer Hackathon participant guide — [Meta Global AI Developer Hackathon — Participant Guide](/hackathon/meta-global-ai-developer-hackathon.md).
- **Creation**: Ingested two gitingest source dumps (kept verbatim in [references](/references/index.md)) and distilled them into concept sets: [MusicXML](/musicxml/index.md) from w3c-cg/musicxml, and [FamiStudio](/famistudio/index.md) from BleuBleu/FamiStudio.
- **Creation**: Added the utstack-famitune project concepts — [overview](/famitune/utstack-famitune-overview.md), [MusicXML → FamiStudio mapping spec](/famitune/musicxml-to-famistudio-mapping.md), and [vertical slice plan](/famitune/vertical-slice-plan.md).
