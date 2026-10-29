# Design

## Context

See proposal.md for motivation. Current state, verified in code:

- `src/cli/cli.ts` writes only `<name>.txt` and `<name>.report.txt`; it never imports the render stage. Exit codes are 0 (success), 1 (rejected/unreadable input), 2 (missing arguments).
- `src/render/render.ts` wraps the FamiStudio CLI for `wav-export` and `nsf-export` only, returning `RenderPaths { wavPath, nsfPath }`. Its only production-adjacent caller is a gated feature test. It already defends against FamiStudio's exit-0-on-failure behavior by stat-ing outputs.
- `src/render/verify.ts` holds WAV verification (`VerifyResult { passed, details }`); no ROM check exists. All five manually produced `.nes` files share an identical legacy iNES header (magic `NES\x1A`, 2 PRG banks, 1 CHR bank, no trainer, 40,976 bytes total).
- The stage names `convert`, `emit`, and `render` are each overloaded or imprecise (see proposal). No code outside `packages/converter` consumes `convertPiece`, `ConvertedPiece`, `emitFamiStudioText`, or `renderOutputs`.

## Goals / Non-Goals

**Goals:**

- One opt-in CLI command produces the three playable files with verified success.
- Pipeline stage names become parse → adapt → write → export, applied wholesale in one migration.
- No behavior change to plain conversion: emitted FamiStudio Text stays byte-identical.

**Non-Goals:**

- `.mxl` input support (still unzip first; separate concern).
- Emulator/boot verification of the ROM (header validation only).
- New arrangement behavior. `arrange` is reserved as a future submodule name inside adapt (e.g. arpeggiation); this change adds no musical decisions.
- Package rename, CLI rename, or changes to the completed `musicxml-to-nes-vertical-slice` artifacts (historical record).

## Decisions

### D1: Rename stages wholesale, keep umbrella "convert"

| Current | New | Renamed identifiers |
|---|---|---|
| `src/convert/` | `src/adapt/` | `convert.ts` → `adapt.ts`, `convertPiece` → `adaptPiece`, `ConvertedPiece` → `AdaptedPiece`, `projectFromConverted` → `projectFromAdapted`, `features/convert.feature` → `adapt.feature` |
| `src/emit/` | `src/write/` | `emitFamiStudioText` → `writeFamiStudioText`, `EmittedSong` → `WrittenSong`, `features/emit.feature` → `write.feature` |
| `src/render/` | `src/export/` | `renderOutputs` → `exportOutputs`, `RenderPaths` → `ExportPaths`, `RenderError` → `ExportError`, `@render` tag → `@export`, `renders/` → `exports/` |

Kept deliberately: package `@famitune/converter`, binary `famitune-convert`, `convertScoreToText` (umbrella convenience that runs adapt + write), `ConversionReport`/`ConversionResult` (the report also carries write-stage data). "Adapt" is chosen over "arrange" because it is the superset: the stage mostly fits timing/tempo/channels technically, with arrangement-style decisions (allocation, chord reduction) inside it. Blind find-and-replace is unsafe here — umbrella uses of "convert" (CLI scenarios, report comments) stay.

Alternatives considered: renaming only new code (rejected — splits one stage across two names); "serialize" for stage 3 (rejected — jargon outlier among plain verbs parse/adapt/write/export).

### D2: Extend the export stage with a third sequential export

`exportOutputs` runs `wav-export`, then `nsf-export -nsf-export-mode:ntsc`, then
`rom-export -rom-export-mode:ntsc` (the mode flag is explicit rather than the
project-mode default: `-help` lists `-rom-export-mode:ntsc|pal|dual`, and NTSC
matches the converter's frame model, mirroring the NSF export — verified
against the pinned 4.5.0 `-help` during implementation), extending the existing kind union and the non-empty artifact check to all three outputs. Sequential order preserves deterministic error attribution; parallel execution was rejected (heavier processes, muddier failures). `FAMISTUDIO_REQUIRED_COMMANDS` in `src/config.ts` gains `rom-export`.

Before finalizing arguments, implementation re-checks the pinned build's `-help`/KB for any ROM TV-system option (the NSF export needed an explicit NTSC flag; the manual ROM export used none and the resulting file was never checked for playback system).

### D3: ROM validation lives in verify, wired into the CLI (option C)

Add `verifyNesFile(path): VerifyResult` in `src/export/verify.ts` beside `verifyWavFile`, returning the established `{ passed, details }` shape instead of throwing. Rules, exactly:

- length ≥ 16 and bytes 0–3 equal `NES\x1A`;
- PRG bank count (byte 4) ≥ 1 (CHR count may be 0 — CHR RAM is legal);
- expected size = 16 + (trainer flag, byte 6 bit 2 ? 512 : 0) + PRG×16384 + CHR×8192, and actual size equals it. No hardcoded 40,976 or mapper value, so larger future ROMs pass;
- a NES 2.0 indicator (byte 7 bits 2–3 = `10`) fails as unsupported rather than being mis-measured — the pinned 4.5.0 exporter emits legacy headers on all observed files.

The export stage itself stays existence-only (mirroring NSF); the CLI calls `verifyNesFile` after a successful export and treats `passed: false` as export failure. Alternatives: test-only assertion (rejected — CLI success would mean less); validating inside `exportOutputs` (rejected — breaks the produce/verify layering and forces every stub executor to fabricate headers).

### D4: `--export` is an explicit request with loud failure

- `famitune-convert <input> [--out-dir <dir>] [--export]`. The flag is boolean; argument scanning already tolerates dash-prefixed flags when finding the input.
- Flow: convert and write `.txt` + report first (so they survive export failure), print the report, then — only with `--export` — check FamiStudio availability, run the three exports, validate the ROM, and print `Wrote` lines for all three files.
- Preflight: if `isFamiStudioAvailable()` is false, exit 1 before exporting with an error that names the likely causes (binary not found via `FAMISTUDIO_BIN`/`PATH`, or runtime unrunnable — check .NET 8 / `DOTNET_ROOT`), because a missing binary and the known `DOTNET_ROOT` trap are indistinguishable from here.
- `ExportError` and ROM validation failure are caught and reported on stderr with exit 1 (the existing rejected-input code); the process never reports success after a failed export. Unexpected errors still throw.
- Testability: `run()` gains an optional injected export seam (availability check + export function) defaulting to the real stage, so CLI feature tests exercise success/failure without a FamiStudio binary. The stub exporter in tests writes a header-valid ROM so the real `verifyNesFile` runs.

### D5: Tests mirror the existing ladder

- Unit: export-stage stub asserts the exact three-call sequence and paths; failure-in-`rom-export` and silent-missing-ROM cases name the ROM. `verifyNesFile` gets synthetic-header cases: valid, valid-with-trainer, CHR=0, bad magic, <16 bytes, size mismatch, PRG=0, NES 2.0 indicator.
- Feature: CLI scenarios for flag success (stubbed export) and unavailable-FamiStudio failure; the gated `@export` feature keeps the WAV pitch scenario and adds a real ROM export scenario asserting validation passes.
- The byte-identical golden and all pre-existing scenarios must pass unchanged after renames — that is the regression proof for the terminology work.

## Risks / Trade-offs

- [Rename churn breaks an import] → Changes are confined to one package; run test, typecheck, and lint together (LEARNINGS rule) plus a workspace-wide grep for old identifiers.
- [`rom-export` has an unverified TV-system default] → D2's help/KB check precedes wiring arguments; findings recorded in LEARNINGS if a flag is needed.
- [Header-valid but unbootable ROM passes] → Accepted scope: header validation catches truncation/corruption, the observed silent-failure family. Boot checks need an emulator harness (future work).
- [Two vocabularies in docs during transition] → README, LEARNINGS, and feature files update in the same change; archived OpenSpec artifacts are not rewritten.

## Migration Plan

Single PR: renames first (pure move, tests green), then export behavior, then CLI flag, then docs. Library consumers inside the repo update in the same PR; the package is 0.0.1 with no external consumers found. Rollback is a plain revert; the `exports/` directory is git-ignored and regenerable, so no data migration exists.

## Open Questions

None blocking. The ROM TV-system check (D2) is an implementation-time verification against the pinned binary, not a design unknown.
