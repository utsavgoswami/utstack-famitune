# Tasks

## 1. Stage terminology rename (no behavior change)

- [x] 1.1 Rename `src/convert/` to `src/adapt/`: `convert.ts` → `adapt.ts`, `convertPiece` → `adaptPiece`, `ConvertedPiece` → `AdaptedPiece`, `projectFromConverted` → `projectFromAdapted`, `features/convert.feature` → `features/adapt.feature`, and update `src/index.ts` and all imports. Keep umbrella names (`famitune-convert`, `convertScoreToText`, `ConversionReport`). Verify: grep finds no `convertPiece`, `ConvertedPiece`, or `src/convert` references outside the archived vertical-slice change.
- [x] 1.2 Rename `src/emit/` to `src/write/`: `emitFamiStudioText` → `writeFamiStudioText`, `EmittedSong` → `WrittenSong`, `features/emit.feature` → `features/write.feature`, and update imports and the golden-file README's emitter references. Verify: grep finds no `emitFamiStudioText` or `src/emit` references in `packages/converter`.
- [x] 1.3 Rename `src/render/` to `src/export/` (identifiers only, no new exports yet): `renderOutputs` → `exportOutputs`, `RenderPaths` → `ExportPaths`, `RenderError` → `ExportError`, `features/render.feature` → `features/export.feature` with tag `@export`, and rename the git-ignored `renders/` directory to `exports/` including its `.gitignore`. Verify: grep finds no `renderOutputs`, `RenderError`, or `@render` in `packages/converter`.
- [x] 1.4 Update stage vocabulary in `packages/converter/README.md` (stage list), stage doc comments, and the render-stage wording in `LEARNINGS.md`, leaving the completed OpenSpec change untouched. Verify: README pipeline reads parse → adapt → write → export and no package doc describes a "render stage".
- [x] 1.5 Run the rename regression gate: `npx nx run @famitune/converter:test`, `:typecheck`, and `:lint` all pass, including the byte-identical golden FamiStudio Text test. Verify: test output shows zero failures after the pure rename.

## 2. ROM export in the export stage

- [x] 2.1 Check the pinned FamiStudio 4.5.0 `rom-export` options (`DOTNET_ROOT=$HOME/.dotnet FamiStudio -help` plus `packages/kb/famistudio/export-and-playback.md`) for a TV-system option comparable to `-nsf-export-mode:ntsc`. Verify: the chosen `rom-export` argument list is recorded in the export stage comment, with the help/KB evidence noted.
- [x] 2.2 Extend `exportOutputs` with a third sequential `rom-export` call, add `nesPath` to `ExportPaths`, include the ROM in the exists-and-non-empty artifact check, and add `rom-export` to `FAMISTUDIO_REQUIRED_COMMANDS` in `src/config.ts`. Verify: the export unit tests assert the exact three-call sequence (`wav-export`, `nsf-export` NTSC, `rom-export`) and returned paths.
- [x] 2.3 Cover ROM export failure in the export unit tests: an executor failing on `rom-export` and a silent executor producing no ROM both raise `ExportError` naming `rom-export`. Verify: `npx nx run @famitune/converter:test` passes with the new cases.

## 3. NES ROM validation

- [x] 3.1 Implement `verifyNesFile(path)` in `src/export/verify.ts` returning `VerifyResult`: reject files under 16 bytes, bad `NES\x1A` magic, PRG bank count of zero, and NES 2.0 headers; otherwise require actual size to equal 16 + optional 512-byte trainer + PRG×16384 + CHR×8192 (no hardcoded 40,976 or mapper). Verify: a hand-built 2-PRG/1-CHR header with a 40,976-byte file passes.
- [x] 3.2 Add synthetic-header unit tests for `verifyNesFile`: valid, valid with trainer, CHR count zero, bad magic, under 16 bytes, size mismatch (truncated), PRG count zero, and NES 2.0 indicator. Verify: `npx nx run @famitune/converter:test` passes with all cases.
- [x] 3.3 Add a gated `@export` feature scenario: the pinned build exports a NES ROM from Hello World text and `verifyNesFile` passes on it; the scenario skips without error when FamiStudio is unavailable. Verify: with `DOTNET_ROOT=$HOME/.dotnet`, `npx nx run @famitune/converter:test` runs the scenario green.

## 4. CLI `--export` flag

- [x] 4.1 Add `--export` to the CLI: update the usage string, write the `.txt` and report first, then (only with the flag) preflight FamiStudio availability, run `exportOutputs`, validate the ROM with `verifyNesFile`, and print `Wrote` lines for the WAV, NSF, and NES files. Preflight failure, `ExportError`, and ROM validation failure print an error naming the problem on stderr and return exit code 1; without the flag the CLI never touches FamiStudio. Verify: manual runs with and without the flag on `fixtures/hello-world.musicxml` produce exactly the specified file sets.
- [x] 4.2 Add an optional injected export seam to `run()` (availability check plus export function, defaulting to the real stage) so CLI tests need no FamiStudio binary, and add CLI feature scenarios: stubbed export success produces all five files and exit 0; unavailable FamiStudio returns exit 1 with the text and report still written; a stubbed invalid ROM returns exit 1 naming validation. Verify: `npx nx run @famitune/converter:test` passes with the new CLI scenarios.

## 5. Ladder, real-score smoke, and docs

- [x] 5.1 Regenerate the four fixture outputs under `exports/` using the built CLI with `--export` (with `DOTNET_ROOT=$HOME/.dotnet`): each fixture directory holds `.txt`, `.report.txt`, `.wav`, `.nsf`, and a header-valid `.nes`. Verify: every fixture ROM passes `verifyNesFile` and the automated WAV checks in the test suite still pass.
- [x] 5.2 Run the real-score smoke: unzip `~/Downloads/violin-concerto-in-b-minor-op35-oskar-rieding.mxl` to a temp `.musicxml`, convert with `--export`, and confirm the report shows 355 Square 1 notes with all three playable files produced and the ROM valid. Verify: command exits 0 and the outputs exist in the temp/exports location (nothing committed).
- [x] 5.3 Update `packages/converter/README.md` (pipeline diagram, toolchain verification list, ladder instructions and table now covering WAV+NSF+NES) and `LEARNINGS.md` (supersede the manual `rom-export` entry with the automated behavior; record the task 2.1 TV-system finding). Verify: docs contain no instructions to run `rom-export` by hand.
- [x] 5.4 Run the full verification gate: `npx nx run @famitune/converter:test`, `:typecheck`, and `:lint` pass, and `openspec validate add-cli-export-and-rename-stages` passes. Verify: all three Nx targets and the OpenSpec validation report success.

## Workflow follow-up

- Archive the change after review requirements are satisfied.
- Consider syncing the `musicxml-to-famistudio-conversion` capability into main specs at archive time, since no main spec exists yet.
