import type { StreamPattern } from './patterns.js';

export interface ArticulationResult {
  patterns: StreamPattern[];
  /** Notes shortened by 1 subrow so the next same-pitch note is audible. */
  articulated: number;
  /** Repeated notes left at full length because 1 subrow is the whole note. */
  skipped: number;
}

/**
 * Shorten the first note of a repeated pair by 1 subrow.
 * A pair is two notes on one channel with the same pitch and no time
 * between them. The second note starts at the exact row that the first
 * note ends. Notes in the next pattern count, so a pair across a barline
 * gets the same rule. Tied notes are one note before this rule runs, so
 * this rule never splits a tie. A note keeps at least 1 subrow.
 * `baseForPattern` gives the subrows in one row for a pattern. The write
 * stage uses the same base, so the skip check and the written duration
 * use the same unit.
 */
export function articulatePatterns(
  patterns: StreamPattern[],
  baseForPattern: (pattern: StreamPattern) => number,
): ArticulationResult {
  const out = patterns.map((pattern) => ({ ...pattern, notes: pattern.notes.map((note) => ({ ...note })) }));
  const ordered = [...out].sort((a, b) => a.measureOrdinal - b.measureOrdinal);
  const entries: Array<{ pattern: StreamPattern; row: number; end: number; midi: number; noteIndex: number }> = [];
  for (const pattern of ordered) {
    const byRow = pattern.notes.map((note, noteIndex) => ({ note, noteIndex })).sort((a, b) => a.note.row - b.note.row);
    for (const { note, noteIndex } of byRow) {
      entries.push({
        pattern,
        row: pattern.startRow + note.row,
        end: pattern.startRow + note.row + note.durationRows,
        midi: note.midi,
        noteIndex,
      });
    }
  }
  let articulated = 0;
  let skipped = 0;
  for (let i = 0; i + 1 < entries.length; i++) {
    const current = entries[i];
    const next = entries[i + 1];
    if (next.midi !== current.midi || next.row !== current.end) continue;
    const note = current.pattern.notes[current.noteIndex];
    const totalSubrows = note.durationRows * baseForPattern(current.pattern);
    if (totalSubrows - 1 < 1) {
      skipped++;
      continue;
    }
    note.gapSubrows = 1;
    articulated++;
  }
  return { patterns: out, articulated, skipped };
}
