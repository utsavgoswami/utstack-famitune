# MusicXML

Input format for utstack-famitune — the sheet-music side of the bridge.

- [MusicXML — overview](musicxml-overview.md) - What MusicXML is, its two score layouts, current version, and what the upstream w3c-cg/musicxml repo contains.
- [MusicXML score structure (partwise)](score-structure.md) - The score-partwise hierarchy — header, part-list, part, measure, attributes — with the minimal Hello World score.
- [MusicXML notes — pitch, duration, chords, voices](notes-pitch-and-duration.md) - Sounding semantics of the note element — step/alter/octave to MIDI pitch, duration/divisions timing, rests, ties, chords, and the backup/forward time counter.
- [MusicXML converter input profile](converter-input-profile.md) - The MusicXML subset utstack-famitune consumes — supported, approximated, and ignored constructs, with error/warning behavior.
- [MusicXML development practice (Karim Ratib interview)](musicxml-development-practice.md) - Practical MusicXML development guidance from spec editor Karim Ratib — precise subset scope, logging unhandled constructs, XSD validation, sample-file testing, and tooling.
