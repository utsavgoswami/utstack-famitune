import { describe, expect, it } from 'vitest';
import { parseScore } from '../parse/parse.js';
import { quantizePiece, selectGrid } from './quantize.js';

describe('selectGrid', () => {
  it('defaults to 16th notes without events', () => {
    expect(selectGrid([])).toBe(4);
  });

  it('uses 4 rows per quarter for quarter notes', () => {
    expect(selectGrid([1, 2])).toBe(4);
  });

  it('refines to the shortest duration down to a 64th', () => {
    expect(selectGrid([1, 0.5])).toBe(8);
    expect(selectGrid([0.25])).toBe(16);
    expect(selectGrid([1 / 32])).toBe(16);
  });
});

describe('quantizePiece', () => {
  it('rounds short durations to at least 1 row', () => {
    const { piece } = (() => {
      const parsed = parseScore(
        `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0">` +
          `<part-list><score-part id="P1"><part-name>M</part-name></score-part></part-list>` +
          `<part id="P1"><measure number="1"><attributes><divisions>16</divisions></attributes>` +
          `<note><pitch><step>C</step><octave>4</octave></pitch><duration>16</duration></note>` +
          `<note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration></note>` +
          `</measure></part></score-partwise>`,
      );
      return { piece: quantizePiece(parsed.events, parsed.tempoMap, parsed.measures) };
    })();
    expect(piece.rowsPerQuarter).toBe(16);
    expect(piece.notes.map((n) => n.durationRows)).toEqual([16, 1]);
  });

  it('drops rests and keeps onsets cumulative without drift', () => {
    const parsed = parseScore(
      `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0">` +
        `<part-list><score-part id="P1"><part-name>M</part-name></score-part></part-list>` +
        `<part id="P1"><measure number="1"><attributes><divisions>3</divisions></attributes>` +
        `<note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration></note>` +
        `<note><pitch><step>D</step><octave>4</octave></pitch><duration>2</duration></note>` +
        `<note><rest/><duration>2</duration></note>` +
        `<note><pitch><step>E</step><octave>4</octave></pitch><duration>2</duration></note>` +
        `</measure></part></score-partwise>`,
    );
    const piece = quantizePiece(parsed.events, parsed.tempoMap, parsed.measures);
    expect(piece.notes.map((n) => n.onsetRow)).toEqual([0, 4, 12]);
    expect(piece.maxOnsetErrorRows).toBe(0);
  });
});
