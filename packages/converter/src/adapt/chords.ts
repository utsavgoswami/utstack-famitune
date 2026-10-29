import type { PatternNote, StreamPattern } from './patterns.js';

export interface ChordReduction {
  patterns: StreamPattern[];
  /** Onsets with several pitches that kept one (the highest). */
  kept: number;
  /** Chord tones removed across all reduced onsets. */
  dropped: number;
}

/**
 * Reduce simultaneous pitches to one per channel (mapping spec section 5):
 * the highest pitch sounds (melody bias). Single-pitch onsets pass through
 * untouched and count as neither kept nor dropped chord tones.
 */
export function reduceChords(patterns: StreamPattern[]): ChordReduction {
  let kept = 0;
  let dropped = 0;
  const reduced = patterns.map((pattern) => {
    const byRow = new Map<number, PatternNote[]>();
    for (const note of pattern.notes) {
      const list = byRow.get(note.row);
      if (list) list.push(note);
      else byRow.set(note.row, [note]);
    }
    const notes: PatternNote[] = [];
    for (const rowNotes of byRow.values()) {
      if (rowNotes.length <= 1) {
        notes.push(...rowNotes);
        continue;
      }
      kept++;
      dropped += rowNotes.length - 1;
      const highest = rowNotes.reduce((a, b) => (b.midi > a.midi ? b : a));
      notes.push(highest);
    }
    notes.sort((a, b) => a.row - b.row);
    return { ...pattern, notes };
  });
  return { patterns: reduced, kept, dropped };
}
