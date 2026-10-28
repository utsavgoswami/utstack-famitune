import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FAMISTUDIO_VERSION } from './config.js';
import { convertScoreToText } from './emit/emit.js';
import { parseScore } from './parse/parse.js';

/**
 * Fixture ladder end-to-end (conversion half): every fixture converts with
 * zero undeclared losses. The chord reduction in fixture 4 is declared —
 * the spec scenario expects it — so only it may drop chord tones.
 */
const LADDER = [
  { file: 'hello-world.musicxml', title: 'Hello World', chordDrops: 0, notes: 1 },
  { file: 'chromatic-scale.musicxml', title: 'Chromatic Scale', chordDrops: 0, notes: 25 },
  { file: 'rests-and-tie.musicxml', title: 'Rests and Tie Melody', chordDrops: 0, notes: 4 },
  { file: 'two-stream-excerpt.musicxml', title: 'Two-Stream Excerpt', chordDrops: 2, notes: 6 },
];

describe('fixture ladder', () => {
  for (const { file, title, chordDrops, notes } of LADDER) {
    it(`${file} converts with zero undeclared losses`, () => {
      const xml = readFileSync(join(import.meta.dirname, `../fixtures/${file}`), 'utf8');
      const parsed = parseScore(xml);
      expect(parsed.unhandled).toEqual([]);
      const { text, report } = convertScoreToText(title, parsed);
      expect(text).toContain(`Project Version="${FAMISTUDIO_VERSION}"`);
      expect(report.droppedStreams).toEqual([]);
      expect(report.octaveShiftedNotes).toBe(0);
      expect(report.microtoneRoundings).toBe(0);
      expect(report.chordTonesDropped).toBe(chordDrops);
      const sounded = report.notesPerChannel.reduce((n, c) => n + c.notes, 0);
      expect(sounded).toBe(notes);
    });
  }

  it('allocates the two-stream excerpt to Square 1 and Triangle', () => {
    const xml = readFileSync(join(import.meta.dirname, '../fixtures/two-stream-excerpt.musicxml'), 'utf8');
    const { report } = convertScoreToText('Two-Stream Excerpt', parseScore(xml));
    expect(report.notesPerChannel.find((c) => c.channel === 'Square1')?.notes).toBe(4);
    expect(report.notesPerChannel.find((c) => c.channel === 'Triangle')?.notes).toBe(2);
  });
});
