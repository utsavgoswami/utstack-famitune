# Learnings

Running log of mistakes, surprises, and fixes from building the
MusicXML-to-NES vertical slice. Read before touching the converter, the
FamiStudio toolchain, or the KB music docs. Each entry: problem, evidence,
rule.

## FamiStudio 4.5.0 toolchain

- Octave labels run one above scientific pitch notation. Render probes prove
  FamiStudio `C3` sounds middle C (261.6 Hz) and `A3` sounds concert A
  (440.5 Hz). The emitter writes the sharp spelling of sounding-MIDI-minus-12.
  Never trust a doc octave example; render a known note and measure it.
- Note `Time`/`Duration` count in subrows (1/`NoteLength` of a row), not rows.
  `PatternLength`/`BeatLength`/`PatternCustomSettings Length` stay in rows.
  Verified in the loader source (`FamistudioTextFile.cs`: exporter divides by
  `NoteLength`, loader stores `Time`/`Duration` raw) plus render probes.
- The text loader requires `NoteLength` AND `Groove` on the song and on every
  `PatternCustomSettings` (`KeyNotFound` otherwise). Flat tempos carry a
  single-value groove, as real exports do.
- `PatternInstance` lines are children of each `Channel`, not song-level as
  the upstream docs example suggests. Binding is by containment; names may
  repeat across channels.
- FamiStudio exits 0 even when an export fails. The render wrapper stats its
  outputs and throws on missing/empty files; never trust the exit code.
- All-max flat volume envelopes vanish on import/export round trip. Benign:
  max volume is identity, and ladder renders sustain full durations.

## Converter implementation

- `fast-xml-parser` needs `preserveOrder: true`: grouped parsing loses the
  `<backup>`/`<forward>` interleave the time cursor depends on. Shape notes:
  empty elements parse as `{ tag: [] }`, attributes sit under `:@`, the
  DOCTYPE is consumed silently, the XML declaration appears as a `?xml` entry.
- Vitest (esbuild) does not typecheck. A green suite once hid two type
  errors. Always run test, typecheck, and lint together.
- Groove search must tie-break toward smaller cycles, or output wobbles
  between equivalents (`8-7` vs `7-8`). A determinism test locks the choice.
- Pitch stays scientific MIDI through parse and convert. The −12 shift into
  FamiStudio naming happens exactly once, at emit (`midiToName`).
- OSMD draws tie arcs only from `<notations><tied>`, not from sound-level
  `<tie>`. Fixtures carry both, like real notation exporters.

## Verification discipline

- Never add tolerance to make a failing check pass without understanding the
  cause. Octave-tolerant pitch matching once masked a real +1-octave emitter
  bug. Strict guardrails catch real bugs; loosen only for a proven mechanism,
  documented next to the code.
- Calibrate pitch analysis on known tones first. Narrow-pulse squares can
  read an octave up under autocorrelation; a synth-tone test tells analyzer
  flaw apart from product bug.
- Energy-based onset detection fails on legato (no dip to find). Hold the
  scored onset in that case instead of reporting the window edge, which
  produced phantom ±4-frame errors.
- Without the binary or hardware, verify with stubs and synthesis, not by
  skipping: a fake exec asserts CLI arg shapes; generated sine/square WAVs
  exercise the pitch/onset checker end to end.

## Process

- Mark OpenSpec tasks complete only when the specified behavior is fully
  implemented. Task 4.4 stayed open through renders and automated checks
  until human listening happened. Environment-blocked steps go in code
  comments and the README as pending, never as done.
- Nx: run `nx sync` after adding packages (root `tsconfig.json` references).
  Scaffold new packages by mirroring the simplest existing one.
- Budget rule: group 3 landed near 640 app lines against a ~500 target.
  Track per-group counts as you go and split before ~650, not after.
- Keep normative docs honest. When probes contradict the KB or the OpenSpec
  spec, fix the docs with evidence cited (octave rule, subrow units). Leave
  score-side statements alone (MusicXML octave 4 is middle C, correctly).
