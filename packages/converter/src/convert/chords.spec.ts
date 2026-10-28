import { describe, expect, it } from 'vitest';
import type { StreamId } from '../parse/parse.js';
import { reduceChords } from './chords.js';
import type { StreamPattern } from './patterns.js';

const stream: StreamId = { part: 'P1', staff: 1, voice: '1' };
const pattern = (rows: Array<{ row: number; midi: number }>): StreamPattern => ({
  stream: { ...stream },
  measureOrdinal: 0,
  name: 'M001',
  startRow: 0,
  lengthRows: 16,
  rowsPerBeat: 4,
  notes: rows.map((n) => ({ row: n.row, durationRows: 4, midi: n.midi })),
});

describe('reduceChords', () => {
  it('keeps the highest pitch of a three-note chord', () => {
    const { patterns, kept, dropped } = reduceChords([
      pattern([
        { row: 0, midi: 60 },
        { row: 0, midi: 64 },
        { row: 0, midi: 67 },
        { row: 4, midi: 69 },
      ]),
    ]);
    expect(patterns[0].notes.map((n) => n.midi)).toEqual([67, 69]);
    expect(kept).toBe(1);
    expect(dropped).toBe(2);
  });

  it('leaves single-pitch onsets uncounted', () => {
    const { patterns, kept, dropped } = reduceChords([pattern([{ row: 0, midi: 60 }])]);
    expect(patterns[0].notes).toHaveLength(1);
    expect(kept).toBe(0);
    expect(dropped).toBe(0);
  });
});
