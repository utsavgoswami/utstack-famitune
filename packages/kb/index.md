---
okf_version: '0.2'
---

# Famitune Knowledgebase

- [Getting started](getting-started.md) - Starting point for the Famitune Knowledgebase OKF bundle.
- [Project: utstack-famitune](famitune/) - The hackathon project: bridging MusicXML sheet music to NES music — overview, mapping spec, and vertical slice plan.
- [MusicXML](musicxml/) - Input format reference, distilled from the w3c-cg/musicxml standard repo.
- [FamiStudio](famistudio/) - Target toolchain reference: FamiStudio text format, NES channels, tempo/frames, instruments, and export/playback.
- [References](references/) - Raw source dumps (gitingests) the MusicXML and FamiStudio concepts were distilled from.
- [Hackathon](hackathon/) - Hackathon knowledge: official guides, deadlines, rules, judging, and prizes.

# Project

- [utstack-famitune — MusicXML to NES bridge (overview)](famitune/utstack-famitune-overview.md) - Project goal, pipeline, key design decisions, scope and open questions for converting MusicXML sheet music into playable NES music via FamiStudio.
- [MusicXML → FamiStudio mapping spec](famitune/musicxml-to-famistudio-mapping.md) - Normative conversion rules — pitch, rhythm/frame quantization, tempo, channel allocation, chords, ties, rests, instruments — with loss reporting.
- [Vertical slice plan — MusicXML in, NES music out, listen and verify](famitune/vertical-slice-plan.md) - Step-by-step first build of utstack-famitune — parse, convert, emit FamiStudio Text, render WAV/NSF, and check the port is correct.

# Hackathon

- [Meta Global AI Developer Hackathon — Participant Guide](hackathon/meta-global-ai-developer-hackathon.md) - Official participant guide for Meta's 10-day global AI Developer Hackathon (Oct 26 – Nov 16, 2026, remote): problem statements, schedule, rules, resources, submission, judging, and prizes.
