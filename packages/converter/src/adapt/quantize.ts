import type { MeasureInfo, MusicEvent, StreamId } from '../parse/parse.js';
import { bpmAt, type TempoMap } from '../parse/tempo.js';

/** NTSC frames per second in FamiStudio's emulation constants. */
export const NTSC_FPS = 60.0988;

export interface QuantizedNote {
  stream: StreamId;
  measureOrdinal: number;
  /** Absolute onset in rows from the start of the piece. */
  onsetRow: number;
  durationRows: number;
  /** Sounding MIDI pitch rounded to the nearest semitone. */
  midi: number;
  onsetErrorRows: number;
}

export interface QuantizedPiece {
  notes: QuantizedNote[];
  rowsPerQuarter: number;
  maxOnsetErrorRows: number;
  maxOnsetErrorFrames: number;
  microtoneRoundings: number;
}

/** Ideal NES frames per row before groove realization (mapping spec section 2). */
export function idealFramesPerRow(bpm: number, rowsPerQuarter: number): number {
  return (60 / bpm) * NTSC_FPS / rowsPerQuarter;
}

/**
 * Row-grid selection (mapping spec section 2, rule 3): default row is a 16th
 * note (4 rows per quarter), or the shortest event duration in the piece when
 * shorter, down to a 64th (16 rows per quarter). Rests count: a short rest
 * shifts the following onset off a coarse grid.
 */
export function selectGrid(durationsQuarters: number[]): number {
  if (durationsQuarters.length === 0) return 4;
  const shortest = Math.min(...durationsQuarters);
  if (!(shortest > 0)) return 4;
  return Math.min(16, Math.max(4, Math.ceil(4 / shortest)));
}

function measureAt(measures: MeasureInfo[], onsetQuarters: number): number {
  let ordinal = 0;
  for (const m of measures) {
    if (m.startQuarters <= onsetQuarters + 1e-9) ordinal = m.ordinal;
    else break;
  }
  return ordinal;
}

/**
 * Quantize events to rows (mapping spec section 2, rule 5): absolute row
 * positions round cumulatively so per-note rounding cannot drift; a duration
 * rounds to at least 1 row. Rests emit nothing — the previous note's
 * duration already ends it, and silence is the absence of notes.
 */
export function quantizePiece(events: MusicEvent[], tempoMap: TempoMap, measures: MeasureInfo[]): QuantizedPiece {
  const rowsPerQuarter = selectGrid(events.map((e) => e.durationQuarters));
  const notes: QuantizedNote[] = [];
  let maxOnsetErrorRows = 0;
  let maxOnsetErrorFrames = 0;
  let microtoneRoundings = 0;
  for (const event of events) {
    if (event.kind !== 'note') continue;
    const measureOrdinal = measureAt(measures, event.onsetQuarters);
    const exactRow = event.onsetQuarters * rowsPerQuarter;
    const onsetRow = Math.round(exactRow);
    const endRow = Math.round((event.onsetQuarters + event.durationQuarters) * rowsPerQuarter);
    const durationRows = Math.max(1, endRow - onsetRow);
    const onsetErrorRows = Math.abs(exactRow - onsetRow);
    const roundedMidi = Math.round(event.midi);
    if (roundedMidi !== event.midi) microtoneRoundings++;
    const errorFrames = onsetErrorRows * idealFramesPerRow(bpmAt(tempoMap, measureOrdinal), rowsPerQuarter);
    maxOnsetErrorRows = Math.max(maxOnsetErrorRows, onsetErrorRows);
    maxOnsetErrorFrames = Math.max(maxOnsetErrorFrames, errorFrames);
    notes.push({
      stream: { ...event.stream },
      measureOrdinal,
      onsetRow,
      durationRows,
      midi: roundedMidi,
      onsetErrorRows,
    });
  }
  return { notes, rowsPerQuarter, maxOnsetErrorRows, maxOnsetErrorFrames, microtoneRoundings };
}
