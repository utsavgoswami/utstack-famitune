// Pinned FamiStudio desktop build used to import converter output and render
// WAV/NSF files: 4.5.0, macOS build `FamiStudio450-MacOS.zip` from the
// BleuBleu/FamiStudio 4.5.0 release, run via a .NET 8 runtime.
//
// Version verified in two places. First, the KB reference docs (ingested
// from BleuBleu/FamiStudio): `packages/kb/famistudio/famistudio-overview.md`
// states the current release line in the ingested docs is 4.5.0, and
// `packages/kb/famistudio/export-and-playback.md` documents the headless CLI
// (`FamiStudio <input> <command> <output>`). Second, against the real
// binary: `FamiStudio -help` on this build lists `wav-export`,
// `nsf-export`, and `famistudio-txt-export`, and it imports the emitter
// golden file and renders all four fixture WAVs (see the converter README
// ladder). Invoke it via `FAMISTUDIO_BIN` or a `FamiStudio` on `PATH`
// (a shim execing `dotnet FamiStudio.dll` works).
export const FAMISTUDIO_VERSION = '4.5.0';

// CLI commands the pinned build must advertise via `FamiStudio -help`.
// The render stage (Increment 4) uses `wav-export` and `nsf-export`; the
// golden-export step (task 1.4) uses `famistudio-txt-export`.
export const FAMISTUDIO_REQUIRED_COMMANDS = [
  'wav-export',
  'nsf-export',
  'famistudio-txt-export',
] as const;
