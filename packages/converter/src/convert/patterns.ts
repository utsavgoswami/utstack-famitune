import type { MeasureInfo, StreamId } from '../parse/parse.js';
import { bpmAt, type TempoMap } from '../parse/tempo.js';
import { realizeTempo, type RealizedTempo } from './tempo.js';
import type { QuantizedNote } from './quantize.js';

export interface PatternNote {
  /** Row relative to the pattern start. */
  row: number;
  durationRows: number;
  midi: number;
}

export interface StreamPattern {
  stream: StreamId;
  measureOrdinal: number;
  /** Pattern name (`M001`, `M002`, …) unique within the stream. */
  name: string;
  /** Absolute start row from the piece start. */
  startRow: number;
  /** Nominal length in rows from the time signature. */
  lengthRows: number;
  /** Rows per beat in this measure (time-signature aware). */
  rowsPerBeat: number;
  /** Actual length when it differs (pickup, odd, or overfull measures). */
  customLengthRows?: number;
  /** Tempo setting when the BPM changes at this pattern (song tempo covers measure 0). */
  tempo?: RealizedTempo;
  notes: PatternNote[];
}

/** Nominal pattern length in rows from the time signature. */
export function nominalPatternRows(beats: number, beatType: number, rowsPerQuarter: number): number {
  return Math.round(beats * rowsPerQuarter * (4 / beatType));
}

function patternName(ordinal: number): string {
  return `M${String(ordinal + 1).padStart(3, '0')}`;
}

/**
 * Chunk one stream's quantized notes into per-measure patterns (mapping spec
 * section 3): one pattern per channel per measure. Short, odd, or overfull
 * measures get a `PatternCustomSettings Length` override; tempo changes at a
 * measure get new `NoteLength`/`Groove` settings (FamiStudio tempo can only
 * change at pattern starts). Notes keep faithful durations and never spill
 * handling beyond their pattern: well-formed measures align exactly.
 */
export function chunkStream(
  stream: StreamId,
  notes: QuantizedNote[],
  measures: MeasureInfo[],
  endQuarters: number,
  rowsPerQuarter: number,
  tempoMap: TempoMap,
): StreamPattern[] {
  const starts = measures.map((m) => Math.round(m.startQuarters * rowsPerQuarter));
  const endRow = Math.round(endQuarters * rowsPerQuarter);
  return measures.map((measure, i) => {
    const startRow = starts[i];
    const nextStart = i + 1 < starts.length ? starts[i + 1] : endRow;
    const actualRows = nextStart - startRow;
    const lengthRows = nominalPatternRows(measure.beats, measure.beatType, rowsPerQuarter);
    const rowsPerBeat = rowsPerQuarter * (4 / measure.beatType);
    const inPattern = notes.filter((n) => n.onsetRow >= startRow && n.onsetRow < nextStart);
    const bpm = bpmAt(tempoMap, measure.ordinal);
    const pattern: StreamPattern = {
      stream: { ...stream },
      measureOrdinal: measure.ordinal,
      name: patternName(measure.ordinal),
      startRow,
      lengthRows,
      rowsPerBeat,
      notes: inPattern.map((n) => ({ row: n.onsetRow - startRow, durationRows: n.durationRows, midi: n.midi })),
    };
    if (actualRows !== lengthRows) pattern.customLengthRows = actualRows;
    if (i > 0 && bpm !== bpmAt(tempoMap, measures[i - 1].ordinal)) {
      pattern.tempo = realizeTempo(bpm, rowsPerQuarter, rowsPerBeat);
    }
    return pattern;
  });
}
