# Proposal: MusicXML to NES vertical slice

## Why

utstack-famitune has reference knowledge. The OKF bundle sits in `packages/kb/`.
The project has no converter code. No tool in the project takes a MusicXML file
and gives NES music. This change builds the first complete path. The path takes
MusicXML in. The path gives FamiStudio Text out. FamiStudio then renders WAV and
NSF files for listening checks.

## What Changes

- Add one new package. The package is `packages/converter`. The package name is
  `@famitune/converter`. The package holds 4 stages. The stages are parse,
  convert, emit, and render.
- Implement only the MusicXML subset in the input profile. The input profile is
  `packages/kb/musicxml/converter-input-profile.md`. Implement the conversion
  rules in the mapping spec. The mapping spec is
  `packages/kb/famitune/musicxml-to-famistudio-mapping.md`. The rules cover
  partwise `.musicxml` input. The rules cover pitch, duration, and the time
  counter. The rules cover ties, streams, and tempo frames and grooves. The
  rules cover monophonic channel allocation and chord reduction. The rules
  cover generated instruments. A conversion report records every loss. The
  report also records every construct that the converter does not handle. The
  converter never drops music silently.
- Add one CLI entry. The CLI takes a `.musicxml` file. The CLI gives FamiStudio
  Text. The CLI can also render WAV and NSF files. Rendering uses one pinned
  FamiStudio desktop build.
- Add automated tests with `@amiceli/vitest-cucumber`. Tests use Gherkin
  `.feature` files and step definitions on Vitest. Each OpenSpec scenario gets
  one test with the same name. Plain Vitest unit tests stay allowed for small
  numeric cases.
- Deliver the work in 4 increments. Each increment targets about 500 lines of
  app-code diff. Tests do not count toward that budget. Fixtures do not count.
  Spec files and OpenSpec files do not count.
  1. Scaffold and parser core. Scope: single-part events and the Hello World
     fixture.
  2. Streams and completeness. Scope: voices, staves, ties, chords as events,
     tempo map, unhandled-construct log, and report skeleton.
  3. Converter and FamiStudio Text emitter. Scope: quantization, allocation,
     and the full report.
  4. CLI and render loop. Scope: FamiStudio WAV and NSF wrapper, and the WAV
     check.

This change breaks no existing behavior. It modifies no existing package.

## Capabilities

### New Capabilities

- `musicxml-to-famistudio-conversion`: Convert a MusicXML score into NES music
  that a person can play and hear. The capability covers 4 actions. It parses
  the supported MusicXML subset. It converts events to NES channels and
  patterns. It reports every loss in text. It emits FamiStudio Text and renders
  WAV and NSF output for checks.

### Modified Capabilities

- None. The project has no existing specs. The `openspec/specs/` directory is
  empty.

## Impact

- New code sits in `packages/converter/`. The package holds the library, the
  CLI, and the `features/` Gherkin tests.
- One new dev dependency: `@amiceli/vitest-cucumber`. The library requires
  Vitest 2.0.0 or later. The workspace uses Vitest 5.0.5. The implementation
  installs the library in Increment 1. Planning does not install the library.
- One external tool: a pinned FamiStudio desktop build from the 4.5.x line. The
  tool is not an npm dependency. FamiStudio imports the text and renders WAV and
  NSF files. The implementation records the exact version. The emitter stamps
  that version into every text file.
- This change executes the plan in `packages/kb/famitune/vertical-slice-plan.md`.
  The OKF mapping spec stays the normative reference for conversion rules.
