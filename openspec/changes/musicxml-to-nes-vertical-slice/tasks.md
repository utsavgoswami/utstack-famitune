# Tasks: MusicXML to NES vertical slice

Budget rule: each numbered group targets about 500 lines of app-code diff.
Tests do not count against that budget. `.feature` files do not count. Fixtures
do not count. OpenSpec files and OKF files do not count. Split a group before
you write more code when the group exceeds about 650 app lines. Renumber the
groups after a split.

## 1. Increment 1 — Scaffold, toolchain pin, parser core (~450 app lines, ~2 hrs)

- [x] 1.1 Scaffold `packages/converter` (`@famitune/converter`) with Nx and Vitest targets. Follow the conventions of the existing packages. Verify: `npx nx show project @famitune/converter` lists build, test, and lint targets.
- [x] 1.2 Install `@amiceli/vitest-cucumber` as a dev dependency of the converter package. Verify: a trivial feature file and step definition pass under `npx nx test @famitune/converter`.
- [x] 1.3 Pin the FamiStudio build. Record the exact version in one config constant. Add a comment that states where you verified the version. Verify: `FamiStudio -help` on that build lists `wav-export`, `nsf-export`, and `famistudio-txt-export`.
- [x] 1.4 Export a trivial one-song project with the pinned build. Use `famistudio-txt-export` for the export. Save the file as the emitter golden file under `packages/converter/fixtures/`. Verify: the `Project Version` in the file matches the pinned constant. Verify: a comment next to the golden file records the `PatternInstance` shape.
- [x] 1.5 Implement the event model and the MusicXML parser core. Accept partwise input only. Give single-part pitch, duration, and rest events. Compute absolute onsets from `divisions` and the time counter. Apply transposition. Give a hard error for non-MusicXML input, malformed XML, and timewise input. Verify: `features/parse.feature` scenarios match the Hello World scenario and the timewise-rejection scenario in the spec.
- [x] 1.6 Add the Hello World fixture under `fixtures/`. The fixture holds a `C4` whole note in 4/4. Verify: the parse feature asserts MIDI pitch 60, onset 0, and duration 4 quarter notes.

## 2. Increment 2 — Streams, ties, chords-as-events, completeness logging (~450 app lines, ~2 hrs)

- [x] 2.1 Split parts into streams by staff and voice. Use `<backup>` and `<forward>` cursor movement. Use `<chord/>` simultaneity. Verify: parse features cover a two-stream measure. Verify: parse features cover one chord onset with three pitches.
- [x] 2.2 Merge tie chains into single events. Sum the durations in each chain. Verify: the tied-notes-merge scenario from the spec passes as a feature.
- [x] 2.3 Build the tempo map from `<sound tempo>` and `<metronome>` markings. Use the documented default when a score marks no tempo. Verify: features cover a marked tempo. Verify: features cover a missing-tempo warning.
- [x] 2.4 Add the conversion-report skeleton. Add unhandled-construct logging. Log each construct outside the input profile by name. Examples are grace notes, unpitched percussion, fractional pitch values, and repeats. Never skip a construct silently. Verify: the unhandled-construct scenario from the spec passes. Verify: parser tests assert zero silent drops on all fixtures.

## 3. Increment 3 — Converter and FamiStudio Text emitter (~500 app lines, ~2–3 hrs)

- [x] 3.1 Implement row-grid selection. Implement cumulative onset and duration quantization. Track the maximum quantization error. Verify: convert features assert onsets land on expected rows. Verify: the report states the error in frames.
- [x] 3.2 Implement tempo realization to `NoteLength` and `Groove`. Include `GroovePaddingMode`. Put requested BPM and actual BPM in the report. Verify: the marked-tempo scenario from the spec passes. The realized BPM stays within 1 BPM of 120.
- [x] 3.3 Implement measure-to-pattern chunking. Implement `PatternCustomSettings` overrides for pickup measures, odd measures, and pattern-start tempo changes. Verify: convert features cover a two-measure melody. Verify: convert features cover a pickup measure.
- [x] 3.4 Implement stream-to-channel allocation. Make the allocation deterministic. Order streams by pitch and assign Square 1, Square 2, and Triangle. Drop overflow streams and report each drop. Verify: the two-stream scenario and the overflow scenario from the spec pass.
- [x] 3.5 Implement chord reduction. Keep the highest pitch, per the mapping spec. Put kept counts and dropped counts in the report. Verify: the three-note-chord scenario from the spec passes.
- [x] 3.6 Generate the 3 flat starter instruments. The instruments are Lead, Harmony, and Bass. Emit FamiStudio Text in the Increment 1 golden shape. Stamp the pinned version into the file. Verify: emit features compare output against golden files. Verify: the determinism scenario from the spec passes. Two runs give byte-identical output.

## 4. Increment 4 — CLI and render/listen verification (~400 app lines, ~1.5 hrs)

- [x] 4.1 Add the CLI entry. Input: one MusicXML path. Output: FamiStudio Text and a conversion report. On rejected input, exit with a non-zero code and an error that names the location. Verify: CLI feature scenarios cover success, rejection, and report output.
- [x] 4.2 Add the render wrapper around the pinned FamiStudio CLI. The wrapper uses `wav-export` and `nsf-export`. Keep FamiStudio-specific knowledge out of parse and convert. Verify: a converted fixture produces a non-empty `.wav` file and a non-empty `.nsf` file.
- [x] 4.3 Add WAV verification as tag-gated render features. The verification compares the pitch in each segment against the expected pitch. The verification compares each onset against a limit of 1 NES frame. The features skip without error when FamiStudio is absent. Verify: the Hello World render scenario from the spec passes on a machine with FamiStudio installed.
- [x] 4.4 Run the fixture ladder end to end. The ladder is Hello World, chromatic scale, rests and tie melody, and two-stream excerpt. Listen to each WAV file and each NSF file against the source score. Record the listening verdict per fixture in the converter package README. Verify: all non-render tests pass with `npx nx test @famitune/converter`. Verify: fixtures 1 to 4 show zero undeclared losses in the reports.
