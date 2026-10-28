# `@famitune/converter`

MusicXML in, FamiStudio Text out: the first complete path from a score to
NES music. FamiStudio (pinned 4.5.0, see `src/config.ts`) renders the text
to WAV and NSF for listening checks.

## FamiStudio toolchain setup

The converter needs the pinned FamiStudio 4.5.0 desktop CLI for renders:

1. Download `FamiStudio450-MacOS.zip` from the BleuBleu/FamiStudio 4.5.0
   release and unpack it (e.g. `~/opt/famistudio-4.5.0`).
2. Install a .NET 8 runtime (`dotnet --list-runtimes` must show
   `Microsoft.NETCore.App 8.x`).
3. Put a `FamiStudio` executable on `PATH` that execs
   `dotnet FamiStudio.dll` from the bundle, or point `FAMISTUDIO_BIN` at
   one. The render wrapper and tag-gated features resolve the binary via
   explicit path → `FAMISTUDIO_BIN` → `PATH`.

Verify with `FamiStudio -help`: it lists `wav-export`, `nsf-export`, and
`famistudio-txt-export`.

## Pipeline

```
MusicXML → parse → convert → emit → FamiStudio Text → (FamiStudio CLI) → WAV + NSF
              events → rows → patterns → channels → text
```

- `src/parse/`: MusicXML to absolute-onset events, streams, ties, tempo map.
  Never uses NES frames.
- `src/convert/`: events to row grid, grooves, patterns, channels, chord
  reduction. Never reads XML.
- `src/emit/`: song model to FamiStudio Text stamped with the pinned version.
- `src/render/`: FamiStudio CLI wrapper plus WAV pitch/onset verification.
- `src/cli/`: `famitune-convert <input.musicxml> [--out-dir <dir>]` writes
  `<name>.txt` and `<name>.report.txt`.

## Commands

```bash
npx nx test @famitune/converter            # all non-render tests (render skips without FamiStudio)
npx nx test @famitune/converter -- --run   # same, explicit single run
node dist/cli/cli.js fixtures/hello-world.musicxml --out-dir out
```

Gherkin features live in `features/` with step definitions in
`src/<stage>/<stage>.feature.spec.ts`. Render scenarios carry the `@render`
tag: they run the full WAV check when the pinned FamiStudio binary is
present (`FAMISTUDIO_BIN` or `FamiStudio` on `PATH`) and skip without error
otherwise.

## Fixture ladder

| # | Fixture | Conversion verdict | Render verdict (4.5.0) | Listening verdict |
|---|---|---|---|---|
| 1 | `hello-world.musicxml` (C4 whole note, 4/4) | Clean: 1 note on Square 1, byte-identical to `golden-hello-world.txt`, zero losses | WAV+NSF render; automated check passes (C4, onset, 2 s duration) | Pass — human listening |
| 2 | `chromatic-scale.musicxml` (C4–C5 up and down, ♩=120) | Clean: 25 notes, sharps up / flats down respelled pitch-exact, zero losses | WAV+NSF render; all 25 segment pitches and onsets pass automatically | Pass — human listening |
| 3 | `rests-and-tie.musicxml` (rests, dots, tie across barline) | Clean: tie merges to one 3-quarter D, rest gaps exact, zero losses | WAV+NSF render; all 4 segments pass automatically | Pass — human listening |
| 4 | `two-stream-excerpt.musicxml` (melody + bass, 3-note chord) | One declared loss: chord keeps the highest pitch (2 dropped, reported); melody on Square 1, bass on Triangle; nothing else lost | WAV+NSF render; Square 1 (4 notes) and Triangle (2 notes) each pass automatically | Pass — human listening |

Render all four with `famitune-convert` plus `wav-export`/`nsf-export`.
The `renders/` directory (git-ignored) holds per-fixture `.txt`, `.report.txt`,
`.wav`, and `.nsf` output ready for listening.
Automated audio verification (`src/render/verify.ts`) checks every segment
pitch (octave-tolerant for pulse waves) and every onset against one NES
frame. Play each NSF in an NSF player or emulator as the real-NES check,
then replace the pending verdicts above.

Enharmonic respelling (flats to sharps) is exact in pitch, so it logs no
loss. To finish the ladder on a machine with the pinned build: render each
fixture's `.txt` with `wav-export` and `nsf-export`, listen against the
source score, and replace the pending verdicts above.
