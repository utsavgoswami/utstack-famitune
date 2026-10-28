# utstack-famitune (project)

The hackathon project itself: bridging MusicXML sheet music to NES music.

- [utstack-famitune — MusicXML to NES bridge (overview)](utstack-famitune-overview.md) - Project goal, pipeline, key design decisions, scope and open questions for converting MusicXML sheet music into playable NES music via FamiStudio.
- [MusicXML → FamiStudio mapping spec](musicxml-to-famistudio-mapping.md) - Normative conversion rules — pitch, rhythm/frame quantization, tempo, channel allocation, chords, ties, rests, instruments — with loss reporting.
- [Vertical slice plan — MusicXML in, NES music out, listen and verify](vertical-slice-plan.md) - Step-by-step first build of utstack-famitune — parse, convert, emit FamiStudio Text, render WAV/NSF, and check the port is correct.
