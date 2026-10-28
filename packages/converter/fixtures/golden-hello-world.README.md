# Golden file: `golden-hello-world.txt`

Provisional emitter golden shape for the Hello World song (one C4 whole note,
4/4, 16th-note grid, groove `8-7` at default ♩=120). Follows the worked
micro-example in
`packages/kb/famitune/musicxml-to-famistudio-mapping.md` with
`Project Version` stamped from the pinned constant `FAMISTUDIO_VERSION` in
`packages/converter/src/config.ts` (currently `4.5.0`), extended with the
three flat starter instruments (`Lead`, `Harmony`, `Bass`) from
`packages/kb/famistudio/instruments-and-envelopes.md` and one line per stock
channel. The emitter (`packages/converter/src/emit/emit.ts`) reproduces this
file byte-for-byte from `fixtures/hello-world.musicxml` (see
`features/emit.feature`).

## `PatternInstance` shape (confirmed against a real export)

A real 4.5.0 export (`famistudio-txt-export` of a demo `.fms`) shows
`PatternInstance Time="…" Pattern="…"` lines as children of each `Channel`
block, after its `Pattern` blocks — not at song level as the upstream docs
example suggests. Pattern names repeat across channels; binding is by
containment. The emitter follows the real shape.

The same round trip showed the 4.5.0 text loader requires `NoteLength` AND
`Groove` on the song (it throws without either), so the emitter always
stamps both — flat tempos carry a single-value groove, exactly as real
exports do (`NoteLength="7" Groove="7"`). `Color` attributes are omitted;
the importer randomizes colors anyway.

## Note `Time`/`Duration` are subrows, not rows

Loader source (`FamistudioTextFile.cs`) plus render probes prove it: the
4.5.0 text format counts note `Time`/`Duration` in SUBROWS (1/NoteLength of
a row) — the exporter divides internal rows by NoteLength and the loader
stores the values raw — while `PatternLength`/`BeatLength`/`Length` stay in
rows (loader multiplies by NoteLength). The row-based docs are wrong here.
The emitter multiplies row counts by the pattern's NoteLength base
(`Duration="112"` above is 16 rows at NoteLength 7); render probes confirm
exact durations.
