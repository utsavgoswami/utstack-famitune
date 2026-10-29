# Spec Delta

## Purpose

Convert a MusicXML score into NES music a person can play and hear, extending the conversion with opt-in export of playable WAV, NSF, and NES ROM files whose success is verified rather than assumed.

## ADDED Requirements

### Requirement: CLI export of playable files is opt-in
The CLI SHALL export playable files only when the user passes an export flag. With the flag, a successful run SHALL produce one WAV file, one NSF file, and one NES ROM alongside the FamiStudio Text and conversion report in the output directory. Without the flag, the CLI SHALL produce only the FamiStudio Text and conversion report and SHALL NOT invoke FamiStudio.

#### Scenario: Export flag produces three playable files
- **WHEN** the CLI converts a supported score with the export flag and FamiStudio is available
- **THEN** the output directory contains the FamiStudio Text, the conversion report, and non-empty WAV, NSF, and NES ROM files named for the converted song

#### Scenario: Conversion without the flag needs no FamiStudio
- **WHEN** the CLI converts a supported score without the export flag on a machine with no working FamiStudio
- **THEN** conversion succeeds and produces the FamiStudio Text and conversion report

### Requirement: Export failure under an explicit request is loud
When the user passes the export flag, the CLI SHALL NOT report success unless every export completes. A missing or unrunnable FamiStudio, a failed export command, or a missing or empty output file SHALL cause a non-zero exit with an error naming the failing export. The FamiStudio Text and conversion report SHALL remain on disk.

#### Scenario: FamiStudio unavailable with the export flag
- **WHEN** the CLI converts a supported score with the export flag but FamiStudio cannot run
- **THEN** the CLI exits non-zero, names the export problem, and the FamiStudio Text and conversion report are still present in the output directory

#### Scenario: Silent export failure is detected
- **WHEN** FamiStudio exits zero but produces no NES ROM
- **THEN** the CLI exits non-zero and names the NES ROM export as the failure

### Requirement: Exported NES ROM is structurally validated
Before reporting export success, the CLI SHALL validate the NES ROM as an iNES image: the file SHALL be at least 16 bytes, start with the iNES magic, declare at least one PRG ROM bank, and have a size equal to the header plus any trainer plus the declared PRG and CHR bank sizes. An invalid ROM SHALL cause a non-zero exit naming the validation problem.

#### Scenario: Well-formed ROM passes validation
- **WHEN** FamiStudio exports a ROM whose header declares 2 PRG banks and 1 CHR bank with no trainer and whose file size is 40,976 bytes
- **THEN** validation passes and the CLI reports export success

#### Scenario: Truncated ROM fails validation
- **WHEN** the exported ROM file is shorter than its header declares
- **THEN** the CLI exits non-zero and names the ROM validation failure
