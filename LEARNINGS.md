# Learnings

Running log of mistakes, surprises, and fixes from building the
MusicXML-to-NES vertical slice. Read before touching the converter, the
FamiStudio toolchain, or the KB music docs. Each entry: problem, evidence,
rule.

## FamiStudio 4.5.0 toolchain

- `dotnet` on PATH can be the wrong runtime even when .NET 8 exists.
  `FamiStudio -help` failed with "You must install or update .NET" asking
  for `Microsoft.NETCore.App 8.x` while `dotnet --list-runtimes` showed only
  7.0.0 — but `~/.dotnet/shared/Microsoft.NETCore.App/` held 8.0.33. The
  `FamiStudio` shim (`~/.local/bin/FamiStudio`) prefers `$DOTNET_ROOT/dotnet`
  and falls back to PATH `dotnet` (brew 7.0.100 here). Rule: always run
  exports with `DOTNET_ROOT=$HOME/.dotnet PATH=$HOME/.dotnet:$PATH`; never
  declare the toolchain broken until both runtimes are checked.
- `famitune-convert --export` runs all three exports (`wav-export`,
  `nsf-export -nsf-export-mode:ntsc`, `rom-export -rom-export-mode:ntsc`)
  and validates the ROM header; the manual `rom-export` step is gone. The
  ROM mode flag is explicit rather than the project-mode default: `-help`
  lists `-rom-export-mode:ntsc|pal|dual`, and NTSC matches the converter's
  frame model, mirroring the NSF export. Rule: when FamiStudio offers a
  target-machine option, pass it explicitly instead of relying on defaults.
- Octave labels run one above scientific pitch notation. Render probes prove
  FamiStudio `C3` sounds middle C (261.6 Hz) and `A3` sounds concert A
  (440.5 Hz). The writer writes the sharp spelling of sounding-MIDI-minus-12.
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
- FamiStudio exits 0 even when an export fails. The export wrapper stats its
  outputs and throws on missing/empty files; never trust the exit code.
- All-max flat volume envelopes vanish on import/export round trip. Benign:
  max volume is identity, and ladder renders sustain full durations.

## Converter implementation

- The CLI (`src/cli/cli.ts`) reads the input path as UTF-8 text: it does not
  unpack `.mxl`. Passing a `.mxl` zip fails/rejects. Real-world scores
  (e.g. MuseScore `violin-concerto-...mxl`) are zips with
  `META-INF/container.xml` pointing at `score.xml` (or a named `.xml`).
  Rule: unzip first (`zipfile.ZipFile(...).read(rootfile)`) into a
  `.musicxml` file, then run `famitune-convert`; consider `.mxl` support in
  the CLI if this recurs.
- `fast-xml-parser` needs `preserveOrder: true`: grouped parsing loses the
  `<backup>`/`<forward>` interleave the time cursor depends on. Shape notes:
  empty elements parse as `{ tag: [] }`, attributes sit under `:@`, the
  DOCTYPE is consumed silently, the XML declaration appears as a `?xml` entry.
- Vitest (esbuild) does not typecheck. A green suite once hid two type
  errors. Always run test, typecheck, and lint together.
- Groove search must tie-break toward smaller cycles, or output wobbles
  between equivalents (`8-7` vs `7-8`). A determinism test locks the choice.
- Pitch stays scientific MIDI through parse and adapt. The −12 shift into
  FamiStudio naming happens exactly once, at write (`midiToName`).
- OSMD draws tie arcs only from `<notations><tied>`, not from sound-level
  `<tie>`. Fixtures carry both, like real notation exporters.

## Verification discipline

- Never add tolerance to make a failing check pass without understanding the
  cause. Octave-tolerant pitch matching once masked a real +1-octave writer
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
