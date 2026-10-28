/** Quarter-note BPM when a score marks no tempo (mapping spec section 2). */
export const DEFAULT_TEMPO_BPM = 120;

export type TempoSource = 'sound' | 'metronome';

export interface TempoMark {
  /** Zero-based measure ordinal (encounter order within the part). */
  measureOrdinal: number;
  /** Quarter notes per minute. */
  bpm: number;
  source: TempoSource;
}

export interface TempoMap {
  marks: TempoMark[];
  defaultBpm: number;
  /** True when the score marks no tempo and the default applies. */
  usedDefault: boolean;
}

/** Raw mark as collected by the parser, before cross-part resolution. */
export interface RawTempoMark extends TempoMark {
  partIndex: number;
}

const BEAT_UNIT_QUARTERS: Record<string, number> = {
  whole: 4,
  half: 2,
  quarter: 1,
  eighth: 0.5,
  '16th': 0.25,
  '32nd': 0.125,
  '64th': 0.0625,
};

/** Convert a metronome beat unit (with dot count) to quarter-note length. */
export function beatUnitQuarters(unit: string, dots: number): number | undefined {
  const base = BEAT_UNIT_QUARTERS[unit];
  if (base === undefined) return undefined;
  let quarters = base;
  let dot = base / 2;
  for (let i = 0; i < dots; i++) {
    quarters += dot;
    dot /= 2;
  }
  return quarters;
}

/**
 * Resolve raw marks into one map. Marks share measure ordinals across parts
 * (measure N in each part is the same time), so each ordinal keeps one mark:
 * `<sound tempo>` beats `<metronome>`, an earlier part beats a later one,
 * and a later direction in the same part and source wins.
 */
export function buildTempoMap(raw: RawTempoMark[]): TempoMap {
  const rank = (source: TempoSource): number => (source === 'sound' ? 0 : 1);
  const byOrdinal = new Map<number, RawTempoMark>();
  for (const mark of raw) {
    const current = byOrdinal.get(mark.measureOrdinal);
    if (!current) {
      byOrdinal.set(mark.measureOrdinal, mark);
    } else if (
      rank(mark.source) < rank(current.source) ||
      (rank(mark.source) === rank(current.source) && mark.partIndex === current.partIndex)
    ) {
      byOrdinal.set(mark.measureOrdinal, mark);
    }
  }
  const marks: TempoMark[] = [...byOrdinal.values()]
    .sort((a, b) => a.measureOrdinal - b.measureOrdinal)
    .map(({ measureOrdinal, bpm, source }) => ({ measureOrdinal, bpm, source }));
  return { marks, defaultBpm: DEFAULT_TEMPO_BPM, usedDefault: marks.length === 0 };
}

/** Tempo in effect at a measure: the last mark at or before it, else the default. */
export function bpmAt(map: TempoMap, measureOrdinal: number): number {
  let bpm = map.defaultBpm;
  for (const mark of map.marks) {
    if (mark.measureOrdinal <= measureOrdinal) bpm = mark.bpm;
    else break;
  }
  return bpm;
}
