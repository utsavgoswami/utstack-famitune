# FamiStudio

Target toolchain for utstack-famitune — the NES-music side of the bridge.

- [FamiStudio — overview](famistudio-overview.md) - What FamiStudio is, its project model (songs, patterns, channels, instruments), its file formats, and coverage gaps in the ingested source.
- [FamiStudio Text format — specification](famistudio-text-format.md) - The line-based FamiStudio text project format — grammar, object hierarchy, attributes, worked example, and version constraints. Primary output format for utstack-famitune.
- [NES channels and the FamiStudio note model](nes-channels-and-notes.md) - The five stock NES channels, expansion channels, pitch range C0–B7, monophony, and note/effect limits a converter must respect.
- [FamiStudio tempo — frames, BPM and grooves](tempo-frames-and-grooves.md) - How FamiStudio tempo mode turns BPM into NES frame counts — NoteLength, grooves, groove padding — and the FamiTracker tempo alternative.
- [FamiStudio instruments and envelopes](instruments-and-envelopes.md) - How FamiStudio instruments and their envelopes shape NES timbre, and the minimal instrument set a MusicXML converter should generate.
- [FamiStudio export and playback — WAV, NSF, ROM, CLI](export-and-playback.md) - How to get sound out of a FamiStudio project — export formats, headless command-line rendering, and the sound engine — for converter verification loops.
