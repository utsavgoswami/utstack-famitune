---
type: Reference
title: FamiStudio export and playback — WAV, NSF, ROM, CLI
description: How to get sound out of a FamiStudio project — export formats, headless command-line rendering, and the sound engine — for converter verification loops.
tags: [famistudio, export, nsf, wav, cli, playback]
status: stable
generated: { by: muse-wonder/1.0, at: 2026-10-27T05:10:21Z }
sources:
  - id: famistudio-gitingest
    resource: /references/sources/gitingest-bleubleu-famistudio-8a5edab282632443.txt
    title: Gitingest of BleuBleu/FamiStudio (FamiStudio repo)
---

# Overview

A generated [FamiStudio Text](/famistudio/famistudio-text-format.md) file is
not itself playable — it must be imported by FamiStudio and rendered. This
concept lists the rendering paths, with emphasis on the **headless CLI loop**
a converter uses for automated and by-ear verification (see the
[vertical slice plan](/famitune/vertical-slice-plan.md)).[^famistudio-gitingest]

# Export formats

| Export | Output | Use in this project |
|---|---|---|
| WAV / MP3 / OGG | Rendered audio (44.1 kHz recommended for fidelity; loop count or duration selectable; per-channel files optional) | **Primary listen-check**: fast, no emulator needed |
| NSF / NSFe | NES Sound Format program (PAL/NTSC/Dual; ~28 KB max song size minus DPCM) | "Real NES music" artifact; playable in NSF players/emulators |
| NES ROM / FDS disk | Cartridge image (mapper depends on expansion; stock = MMC3, iNES 004) | Hardware/emulator bragging rights; end of the full pipeline |
| FamiStudio Text | `.txt` project (version-locked) | The converter's own output; round-trip import validates the emitter |
| FamiTracker Text | `.txt` tracker interchange | Interop check; lossy for slides/envelopes — not a primary target |
| MIDI | `.mid` (FamiStudio-tempo songs only) | Reverse check: pitches/rhythms roughly comparable to the MusicXML source |
| VGM | Chip-write log (NES APU + selected expansions) | Niche; skip initially |
| Sound-engine ASM | Assembly song data for the FamiStudio/FamiTone2 engine (CA65/NESASM/ASM6/SDAS) | Embedding music in a homebrew game; post-slice stretch goal |

# Headless CLI (desktop builds)

FamiStudio's desktop CLI imports any supported format and exports any other:
[^famistudio-gitingest]

```bash
FamiStudio <input> <command> <output> [-options]
```

Commands include `wav-export`, `mp3-export`, `ogg-export`, `nsf-export`,
`rom-export`, `fds-export`, `famitracker-txt-export`, `famistudio-txt-export`,
`famistudio-asm-export`, `famitone2-asm-export` (plus SFX variants). Shared
option: `-export-songs:<indices>` (zero-based, comma-separated, default all).
Useful WAV options: `-wav-export-rate:44100` (default), `-wav-export-loop:<n>`,
`-wav-export-duration:<sec>`, `-wav-export-channels:<hex mask>`,
`-wav-export-separate-channels`. NSF: `-nsf-export-mode:ntsc|pal`.

The converter verification loop is therefore:

```bash
# converter emits out.txt (FamiStudio Text, pinned version), then:
FamiStudio out.txt wav-export out.wav
FamiStudio out.txt nsf-export out.nsf -nsf-export-mode:ntsc
```

Caveats: text import is desktop-only and version-locked (see
[text format](/famistudio/famistudio-text-format.md)); confirm the exact CLI
binary name/flags with `FamiStudio -help` on the pinned build, since the docs
show `FamiStudio.exe`-style invocations.

# Sound engine (why NSF/ROM output is "real NES music")

NSF/ROM exports embed the FamiStudio sound engine (a heavily modified
FamiTone2): it supports the stock four melodic/noise channels (+ DPCM), the
full 96-note range, instruments with duty/volume/pitch/arpeggio envelopes,
looping, and one optional expansion chip. Games drive it with
`famistudio_init` / `famistudio_music_play` / `famistudio_update` (once per
frame, ideally from NMI). For this project the engine matters mainly as the
guarantee that a song which sounds right in a WAV render is the same data an
NES would play from the NSF/ROM.[^famistudio-gitingest]

[^famistudio-gitingest]: Gitingest of BleuBleu/FamiStudio (FamiStudio repo)
