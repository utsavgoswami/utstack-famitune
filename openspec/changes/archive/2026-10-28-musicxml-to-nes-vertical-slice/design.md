# Design: MusicXML to NES vertical slice

## Context

See proposal.md for the reason for this change. Three constraints shape the
approach:

- The OKF bundle in `packages/kb/` is the normative reference. The input profile
  sets the MusicXML subset. The input profile is
  `packages/kb/musicxml/converter-input-profile.md`. The mapping spec sets the
  conversion rules. The mapping spec is
  `packages/kb/famitune/musicxml-to-famistudio-mapping.md`. This design
  implements those 2 documents. This design does not redefine those documents.
- The workspace is an Nx and TypeScript monorepo. The workspace uses Vitest
  5.0.5. The existing packages are `strings`, `async`, `colors`, and `utils`.
  Those packages are demo libraries. The converter is a new package. The
  converter is not an extension of the demo libraries.
- FamiStudio Text accepts only files from the same FamiStudio major and minor
  version. The bundle holds a FamiStudio gitingest. That gitingest omits the
  core Project, Song, and Channel serializer classes. The emitter must copy the
  shape of a real export from the pinned build. The emitter must not copy the
  shape of the documentation example.

## Goals / Non-Goals

**Goals:**

- Give one pipeline with 3 testable stages. The stages are parse, convert, and
  emit. Add one thin render stage. The render stage calls the FamiStudio binary.
- Make each stage testable without FamiStudio. Only render tests need the
  FamiStudio binary.
- Keep each increment near 500 app-code lines. See tasks.md for the budget rule.

**Non-Goals:**

- `.mxl` input. This change excludes `.mxl` input.
- Expansion audio. This change excludes expansion audio.
- Noise and DPCM percussion mapping. This change excludes that mapping.
- Dynamics. This change excludes dynamics.
- Sound-engine ASM export. This change excludes that export.
- A GUI or a web player. Persons listen through rendered WAV and NSF files.
- Exact byte output for one named MusicXML exporter. The input profile defines
  the supported input instead.

## Decisions

### D1: One new package, staged modules

Create `packages/converter` with the name `@famitune/converter`. The package
holds 5 parts. The `parse/` part converts MusicXML to events. The `convert/`
part converts events to a FamiStudio song model. Conversion includes
quantization, allocation, reduction, and the report. The `emit/` part converts
the model to FamiStudio Text. The `render/` part wraps the FamiStudio CLI and
checks WAV output. A CLI entry calls the 4 parts.

Alternative 1: split parse and convert into separate Nx packages. Rejected.
Two packages add boundary cost before the slice proves the approach.
Alternative 2: put one script under `tools/`. Rejected. The converter is the
product. The converter is not tooling.

### D2: Intermediate event model is the contract between stages

An event carries 4 data items. Item 1 is stream identity. Stream identity names
the part, staff, and voice. Item 2 is the absolute onset in quarter notes. Item
3 is the duration in quarter notes. Item 4 is the MIDI pitch. The parse stage
never uses NES frames. The convert stage never reads XML. Parser tests use
musical units and exact onsets. Converter tests use rows and frames and exact
quantization. The parse stage merges ties before conversion. The parse stage
also applies transposition before conversion.

### D3: Tests use Gherkin via @amiceli/vitest-cucumber

Write automated tests as `.feature` files. Each feature scenario restates one
OpenSpec scenario from `specs/musicxml-to-famistudio-conversion/spec.md`. Step
definitions bind each scenario to code. Step definitions use `loadFeature` and
`describeFeature` from `@amiceli/vitest-cucumber`. The library is a dev
dependency. The library requires Vitest 2.0.0 or later. The workspace has
Vitest 5.0.5. The library fails a test run in 2 cases. Case 1: a scenario in a
feature file has no matching step definition. Case 2: a step in a scenario has
no matching step definition. That failure keeps the natural-language layer and
the executable tests in agreement. Both layers use Given, When, and Then
steps.

Rules for tests:

- Use one feature file per pipeline stage. The files are
  `features/parse.feature`, `features/convert.feature`,
  `features/emit.feature`, and `features/render.feature`. Render features carry
  a tag. The tag lets a test run skip render features when FamiStudio is
  absent.
- Put step definitions next to the code under test. Use the pattern
  `src/<stage>/<stage>.feature.spec.ts`. Do not use one global steps folder.
  This layout keeps the tests of one increment in the same review as the code
  of that increment.
- Give a feature scenario the same name as the OpenSpec scenario when one
  exists. A person can then find spec coverage with text search.
- Numeric tables can use plain Vitest unit tests or Gherkin Scenario Outlines.
  Examples are pitch spelling tables and groove choice tables. Both test forms
  run under the same `vitest` target. New behavior still starts as a feature
  scenario.

Alternative 1: plain Vitest only. Rejected by the requester. Specs and tests
would share words but not an executable link. Alternative 2: a jest-cucumber
style runner. Rejected. The workspace uses Vitest. This library works natively
with Vitest.

### D4: Emitter follows the pinned build's real export, not the docs example

Increment 1 starts with one export action. A person exports a trivial project
with the pinned FamiStudio build. That file is the golden shape for the
emitter. The golden shape includes the `PatternInstance` to channel binding.
The documentation example leaves that binding ambiguous. One config constant
holds the pinned version string. The emitter stamps that string into every
emitted file.

### D5: Loss reporting is a data product, not console output

The convert stage returns `{ text, report }`. The report holds counts. The
report holds one entry per loss item. Tests
assert on the report. The CLI prints the report and can write the report to a
file. This design makes the no-silent-loss requirement testable.

### D6: Render verification splits into two layers

Tests automate layer 1. WAV analysis checks the expected pitch in each segment.
WAV analysis checks each onset against a limit of 1 frame. Tagged feature
scenarios run this layer on machines that have FamiStudio. Layer 2 is manual.
A person listens to the WAV file and the NSF file for each fixture. CI without
FamiStudio runs every test except the render tag.

### D7: Monophonic v1, polyphony-ready event model

V1 converts monophonic streams only. Channel allocation reduces a chord inside
one stream to one pitch. Mapping spec section 5 defines the reduction rule.
The event model still retains every chord pitch at an onset. Reduction is a
policy in `convert/`. Reduction is not parser behavior. Future policies need no
parser change and no event-model change. Future policies include 3 options.
Option 1 splits chord tones across free melodic channels. Option 2 emits an
arpeggio instrument. Option 3 uses expansion-chip channels. This design keeps
violin double stops and piano chords representable from the first version. V1
does not yet sound every chord pitch.

## Risks / Trade-offs

- [Pinned FamiStudio cannot run headless on a machine] -> Tag-gate the render
  tests. Parse, convert, and emit stay fully testable without FamiStudio (D6).
- [Real export shape differs from the documentation shape] -> The golden-export
  step is the first task of Increment 1. That step comes before emitter code
  (D4).
- [Gherkin step reuse costs maintenance time] -> Keep steps stage-local and
  thin. Put assertions in helper functions. Steps call the helper functions
  (D3).
- [Frame quantization error on tuplets and fast passages] -> Quantize onsets
  cumulatively. Record the maximum error in the report. Use a finer grid when
  a piece needs a finer grid. Mapping spec section 2 defines the rule.

## Open Questions

- Which FamiStudio 4.5.x build sits on the hackathon machines? The first
  implementation task answers this question. Only the pinned constant depends
  on the answer.
- Chord reduction default: keep the highest pitch or keep the lowest pitch?
  The mapping spec states keep-highest. A listening check at fixture 4
  checks the default by ear. A change to this default touches one convert
  rule. A change to this default touches no spec text.
