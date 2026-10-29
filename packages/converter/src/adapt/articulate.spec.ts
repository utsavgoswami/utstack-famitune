import { describe, expect, it } from 'vitest';
import { parseScore } from '../parse/parse.js';
import { adaptPiece } from './adapt.js';
import { articulatePatterns } from './articulate.js';
import type { PatternNote, StreamPattern } from './patterns.js';

const STREAM = { part: 'P1', staff: 1, voice: '1' };

function pattern(ordinal: number, startRow: number, notes: PatternNote[]): StreamPattern {
  return {
    stream: STREAM,
    measureOrdinal: ordinal,
    name: `M${String(ordinal + 1).padStart(3, '0')}`,
    startRow,
    lengthRows: 16,
    rowsPerBeat: 4,
    notes,
  };
}

const BASE_3 = (): number => 3;

describe('articulatePatterns', () => {
  it('shortens the first note of a same-pitch pair by 1 subrow', () => {
    const result = articulatePatterns(
      [pattern(0, 0, [
        { row: 0, durationRows: 8, midi: 71 },
        { row: 8, durationRows: 8, midi: 71 },
      ])],
      BASE_3,
    );
    expect(result.articulated).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.patterns[0].notes[0].gapSubrows).toBe(1);
    expect(result.patterns[0].notes[1].gapSubrows).toBeUndefined();
  });

  it('shortens a note when the pair crosses a pattern boundary', () => {
    const result = articulatePatterns(
      [
        pattern(0, 0, [{ row: 8, durationRows: 8, midi: 71 }]),
        pattern(1, 16, [{ row: 0, durationRows: 8, midi: 71 }]),
      ],
      BASE_3,
    );
    expect(result.articulated).toBe(1);
    expect(result.patterns[0].notes[0].gapSubrows).toBe(1);
  });

  it('keeps the full duration when the next pitch differs', () => {
    const result = articulatePatterns(
      [pattern(0, 0, [
        { row: 0, durationRows: 8, midi: 71 },
        { row: 8, durationRows: 8, midi: 72 },
      ])],
      BASE_3,
    );
    expect(result.articulated).toBe(0);
    expect(result.patterns[0].notes[0].gapSubrows).toBeUndefined();
  });

  it('keeps the full duration when a rest sits between the notes', () => {
    const result = articulatePatterns(
      [pattern(0, 0, [
        { row: 0, durationRows: 4, midi: 71 },
        { row: 8, durationRows: 8, midi: 71 },
      ])],
      BASE_3,
    );
    expect(result.articulated).toBe(0);
    expect(result.patterns[0].notes[0].gapSubrows).toBeUndefined();
  });

  it('counts a note that is too short to shorten', () => {
    const result = articulatePatterns(
      [pattern(0, 0, [
        { row: 0, durationRows: 1, midi: 71 },
        { row: 1, durationRows: 8, midi: 71 },
      ])],
      () => 1,
    );
    expect(result.articulated).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.patterns[0].notes[0].gapSubrows).toBeUndefined();
  });

  it('shortens a 1-row note when the pattern base gives more than 1 subrow', () => {
    const result = articulatePatterns(
      [pattern(0, 0, [
        { row: 0, durationRows: 1, midi: 71 },
        { row: 1, durationRows: 8, midi: 71 },
      ])],
      BASE_3,
    );
    expect(result.articulated).toBe(1);
    expect(result.patterns[0].notes[0].gapSubrows).toBe(1);
  });
});

const SCORE = (body: string): string =>
  `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0">` +
  `<part-list><score-part id="P1"><part-name>M</part-name></score-part></part-list>` +
  `<part id="P1">${body}</part></score-partwise>`;

const ATTRS = `<attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>`;
const NOTE = (step: string, duration: number, ties = ''): string =>
  `<note><pitch><step>${step}</step><octave>4</octave></pitch><duration>${duration}</duration>${ties}</note>`;

describe('articulation in adaptPiece', () => {
  it('counts the pair and marks the first note in the patterns', () => {
    const parsed = parseScore(SCORE(`<measure number="1">${ATTRS}${NOTE('B', 2)}${NOTE('B', 2)}</measure>`));
    const adapted = adaptPiece(parsed);
    expect(adapted.report.articulatedRepeats).toBe(1);
    expect(adapted.report.articulationSkips).toBe(0);
    const notes = adapted.allocation.assigned.flatMap((a) => a.patterns.flatMap((p) => p.notes));
    expect(notes.map((n) => n.gapSubrows)).toEqual([1, undefined]);
  });

  it('does not split a tied pair', () => {
    const parsed = parseScore(
      SCORE(
        `<measure number="1">${ATTRS}${NOTE('B', 2, '<tie type="start"/>')}</measure>` +
          `<measure number="2">${NOTE('B', 2, '<tie type="stop"/>')}</measure>`,
      ),
    );
    const adapted = adaptPiece(parsed);
    expect(adapted.report.articulatedRepeats).toBe(0);
    const notes = adapted.allocation.assigned.flatMap((a) => a.patterns.flatMap((p) => p.notes));
    expect(notes).toHaveLength(1);
    expect(notes[0].gapSubrows).toBeUndefined();
  });
});
