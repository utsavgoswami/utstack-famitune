import { describe, expect, it } from 'vitest';
import { parseScore } from '../parse/parse.js';
import { mergeTies } from '../parse/ties.js';
import { quantizePiece } from './quantize.js';
import { chunkStream, nominalPatternRows } from './patterns.js';

const SCORE = (body: string): string =>
  `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0">` +
  `<part-list><score-part id="P1"><part-name>M</part-name></score-part></part-list>` +
  `<part id="P1">${body}</part></score-partwise>`;

const ATTRS = `<attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>`;
const WHOLE = (step: string): string =>
  `<note><pitch><step>${step}</step><octave>4</octave></pitch><duration>4</duration></note>`;

function chunked(body: string) {
  const parsed = parseScore(SCORE(body));
  const piece = quantizePiece(mergeTies(parsed.events), parsed.tempoMap, parsed.measures);
  const stream = { part: 'P1', staff: 1, voice: '1' };
  return {
    parsed,
    patterns: chunkStream(stream, piece.notes, parsed.measures, parsed.endQuarters, piece.rowsPerQuarter, parsed.tempoMap),
  };
}

describe('chunkStream', () => {
  it('chunks a two-measure melody into two full patterns', () => {
    const { patterns } = chunked(
      `<measure number="1">${ATTRS}${WHOLE('C')}</measure><measure number="2">${WHOLE('D')}</measure>`,
    );
    expect(patterns.map((p) => p.name)).toEqual(['M001', 'M002']);
    expect(patterns.map((p) => p.lengthRows)).toEqual([16, 16]);
    expect(patterns.map((p) => p.customLengthRows)).toEqual([undefined, undefined]);
    expect(patterns[0].notes).toEqual([{ row: 0, durationRows: 16, midi: 60 }]);
    expect(patterns[1].notes).toEqual([{ row: 0, durationRows: 16, midi: 62 }]);
    expect(patterns[0].tempo).toBeUndefined();
  });

  it('overrides the length of a pickup measure', () => {
    const { patterns } = chunked(
      `<measure number="1">${ATTRS}` +
        `<note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration></note>` +
        `<note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration></note></measure>` +
        `<measure number="2">${WHOLE('E')}</measure>`,
    );
    expect(patterns[0].lengthRows).toBe(16);
    expect(patterns[0].customLengthRows).toBe(8);
    expect(patterns[0].notes.map((n) => n.row)).toEqual([0, 4]);
    expect(patterns[1].customLengthRows).toBeUndefined();
  });

  it('attaches new tempo settings at a pattern-start tempo change', () => {
    const { patterns } = chunked(
      `<measure number="1">${ATTRS}<sound tempo="90"/>${WHOLE('C')}</measure>` +
        `<measure number="2"><sound tempo="140"/>${WHOLE('D')}</measure>`,
    );
    expect(patterns[0].tempo).toBeUndefined();
    expect(patterns[1].tempo?.requestedBpm).toBe(140);
    expect(patterns[1].tempo?.groove ?? patterns[1].tempo?.noteLength).toBeDefined();
  });

  it('derives nominal lengths from the time signature', () => {
    expect(nominalPatternRows(4, 4, 4)).toBe(16);
    expect(nominalPatternRows(3, 4, 4)).toBe(12);
    expect(nominalPatternRows(6, 8, 4)).toBe(12);
  });
});
