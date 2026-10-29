# `@famitune/converter`

MusicXML in, FamiStudio Text out: the first complete path from a score to
NES music. FamiStudio (pinned 4.5.0, see `src/config.ts`) exports the text
to WAV, NSF, and NES ROM for listening checks.

## FamiStudio toolchain setup

The converter needs the pinned FamiStudio 4.5.0 desktop CLI for exports:

1. Download `FamiStudio450-MacOS.zip` from the BleuBleu/FamiStudio 4.5.0
   release and unpack it (e.g. `~/opt/famistudio-4.5.0`).
2. Install a .NET 8 runtime (`dotnet --list-runtimes` must show
   `Microsoft.NETCore.App 8.x`).
3. Put a `FamiStudio` executable on `PATH` that execs
   `dotnet FamiStudio.dll` from the bundle, or point `FAMISTUDIO_BIN` at
   one. The export wrapper and tag-gated features resolve the binary via
   explicit path → `FAMISTUDIO_BIN` → `PATH`.

Verify with `FamiStudio -help`: it lists `wav-export`, `nsf-export`,
`rom-export`, and `famistudio-txt-export`. When several .NET runtimes are
installed, the shim may pick the wrong one: if `-help` complains about a
missing .NET 8 runtime while `~/.dotnet` holds one, run with
`DOTNET_ROOT=$HOME/.dotnet PATH=$HOME/.dotnet:$PATH`.

## Pipeline

```
MusicXML → parse → adapt → write → FamiStudio Text → (FamiStudio CLI) → WAV + NSF + NES
              events → rows → patterns → channels → text
```

- `src/parse/`: MusicXML to absolute-onset events, streams, ties, tempo map.
  Never uses NES frames.
- `src/adapt/`: events to row grid, grooves, patterns, channels, chord
  reduction. Never reads XML.
- `src/write/`: song model to FamiStudio Text stamped with the pinned version.
- `src/export/`: FamiStudio CLI wrapper (WAV, NSF, NES ROM) plus WAV
  pitch/onset verification and NES ROM validation.
- `src/cli/`: `famitune-convert <input.musicxml> [--out-dir <dir>] [--export]`
  writes `<name>.txt` and `<name>.report.txt`, and with `--export` also
  `<name>.wav`, `<name>.nsf`, and `<name>.nes`.

## Commands

```bash
npx nx test @famitune/converter            # all non-export tests (export skips without FamiStudio)
npx nx test @famitune/converter -- --run   # same, explicit single run
node dist/cli/cli.js fixtures/hello-world.musicxml --out-dir out
node dist/cli/cli.js fixtures/hello-world.musicxml --out-dir out --export  # also WAV, NSF, NES (needs FamiStudio)
```

Gherkin features live in `features/` with step definitions in
`src/<stage>/<stage>.feature.spec.ts`. Export scenarios carry the `@export`
tag: they run the full WAV check when the pinned FamiStudio binary is
present (`FAMISTUDIO_BIN` or `FamiStudio` on `PATH`) and skip without error
otherwise.

## Fixture ladder

| # | Fixture | Conversion verdict | Export verdict (4.5.0) | Listening verdict |
|---|---|---|---|---|
| 1 | `hello-world.musicxml` (C4 whole note, 4/4) | Clean: 1 note on Square 1, byte-identical to `golden-hello-world.txt`, zero losses | WAV+NSF+NES export; automated check passes (C4, onset, 2 s duration; ROM valid) | Pass — human listening |
| 2 | `chromatic-scale.musicxml` (C4–C5 up and down, ♩=120) | Clean: 25 notes, sharps up / flats down respelled pitch-exact (respellings noted in the report), zero losses | WAV+NSF+NES export; all 25 segment pitches and onsets pass automatically; ROM valid | Pass — human listening |
| 3 | `rests-and-tie.musicxml` (rests, dots, tie across barline) | Clean: tie merges to one 3-quarter D, rest gaps exact, zero losses | WAV+NSF+NES export; all 4 segments pass automatically; ROM valid | Pass — human listening |
| 4 | `two-stream-excerpt.musicxml` (melody + bass, 3-note chord) | One declared loss: chord keeps the highest pitch (2 dropped, reported); melody on Square 1, bass on Triangle; nothing else lost | WAV+NSF+NES export; Square 1 (4 notes) and Triangle (2 notes) each pass automatically; ROM valid | Pass — human listening |

Export all four with `famitune-convert --export`.
The `exports/` directory (git-ignored) holds per-fixture `.txt`, `.report.txt`,
`.wav`, `.nsf`, and `.nes` output ready for listening.
Automated audio verification (`src/export/verify.ts`) checks every segment
pitch (no octave tolerance: an octave mismatch is a real bug) and every
onset against one NES frame. `verifyNesFile` checks the ROM's iNES header
(magic plus header-declared bank sizes reconciled against file size).
Play each NSF in an NSF player or emulator as
the real-NES check; the verdicts in the table above record the result.

Enharmonic respelling (flats to sharps) is exact in pitch and is noted in
the report (`Enharmonic respellings: N`). To reproduce the ladder on a
machine with the pinned build: run `famitune-convert --export` on each
fixture, listen against the source score, and confirm
the verdicts above.
