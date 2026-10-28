# @famitune/web

Purpose: illustrate utstack-famitune concepts in the browser before (and
while) the converter is implemented. First page: a term glossary at
`src/app/app.tsx` — sheet-music terms (note, measure, staff, voice, part),
each with a real MusicXML example rendered by `MusicXmlScore`
(`src/app/music-xml-score.tsx`, OpenSheetMusicDisplay; example documents in
`src/app/examples.ts`), followed by the converter terms (stream, channel).

This app is internal concept tooling, not a product surface. It has no
OpenSpec change; keep this README as its only planning doc. Promote it to an
OpenSpec change if it ever becomes user-facing (public docs, converter UI,
in-browser playback).

Second page: a listening bench at `src/app/listening.tsx`, linked from the
glossary. One card per fixture ladder score (MusicXML fixtures plus rendered
WAV/NSF from `packages/converter/` imported as `?raw`/`?url` assets): the
score via the shared `MusicXmlScore` component, an audio player, an NSF
download, listen-for criteria, and a pass/fail verdict saved to
localStorage with a copy-verdicts button for pasting results back.

## Run

```bash
npx nx serve web
```

## Add a page

1. Add the content as a component under `src/app/`.
2. Link it from `src/app/app.tsx`.
3. To render a `.musicxml` file, pass its text to the existing
   `MusicXmlScore` component. (OpenSheetMusicDisplay was chosen over Verovio
   for these small examples: pure JS, no WASM asset wiring. Revisit if a
   page needs Verovio-grade rendering fidelity.)

## Verify visually (screenshot)

Playwright is a root dev dependency. It drives the installed Google Chrome
(`channel: 'chrome'`), so no browser download is needed: serve the app
(`make view`), load `http://localhost:4200` in a Playwright script, call
`page.screenshot({ fullPage: true })`, and inspect the PNG.
