# Proposal

## Why

The converter CLI stops at FamiStudio Text: a person must run FamiStudio three more times by hand to get playable files, and the NES ROM step is not automated at all. The violin concerto conversion proved this manual chain works but is error-prone — FamiStudio can fail silently, and a broken runtime looks identical to a missing binary.

## What Changes

- Add an opt-in `--export` flag to `famitune-convert`. With the flag, after writing the FamiStudio Text and conversion report, the CLI exports a WAV file, an NSF file, and a NES ROM. Without the flag, behavior is unchanged and FamiStudio is never invoked.
- Extend the export stage to run `rom-export` alongside `wav-export` and `nsf-export`, returning all three paths and confirming every output exists and is non-empty.
- Add NES ROM validation: parse the iNES header (magic plus header-declared bank sizes reconciled against actual file size). `--export` fails with a non-zero exit when FamiStudio is missing or broken, when any export produces no output, or when the ROM is invalid. The `.txt` and report remain on disk in that case.
- Rename the pipeline stages to plain-language verbs: convert stage to adapt, emit stage to write, render stage to export. **BREAKING** for library consumers: stage directories, exported function/type names, the `@render` test tag, and the `renders/` output directory are renamed. The CLI, package name, and umbrella conversion names (`famitune-convert`, `convertScoreToText`, `ConversionReport`) do not change.
- Update the converter README and `LEARNINGS.md` to the new pipeline vocabulary and the three-file export.

## Capabilities

### New Capabilities

- `musicxml-to-famistudio-conversion`: Opt-in CLI export of playable NES files (WAV, NSF, NES ROM) from converted FamiStudio Text, with ROM validation and loud failure when export cannot complete.

### Modified Capabilities

- None. The existing conversion capability has no synced main spec yet; this change adds requirements under the established capability path used by the completed vertical-slice change.

## Impact

- Code: `packages/converter/src/cli/`, the adapt/write/export stage directories (renamed from convert/emit/render), stage tests and Gherkin features, `src/index.ts` exports, `src/config.ts` comments.
- Behavior: plain conversion is unchanged (byte-identical FamiStudio Text). `--export` requires the pinned FamiStudio 4.5.0 CLI (via `FAMISTUDIO_BIN` or `PATH`, with a working .NET 8 runtime); no new npm dependencies.
- Docs: `packages/converter/README.md` pipeline and ladder instructions, `LEARNINGS.md` toolchain entries.
