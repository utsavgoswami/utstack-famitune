import { idealFramesPerRow, NTSC_FPS } from './quantize.js';

export interface RealizedTempo {
  requestedBpm: number;
  actualBpm: number;
  /** Rows per beat (FamiStudio `BeatLength`). */
  beatLength: number;
  /**
   * Base frames per row (`NoteLength`), always emitted: the flat value, or
   * the groove average rounded down. The 4.5.0 text loader requires it.
   */
  noteLengthBase: number;
  /** Flat frames per row when the ideal is near-integer (`NoteLength`). */
  noteLength?: number;
  /** Frame-count cycle when no integer fits (`Groove`, e.g. `8-7`). */
  groove?: string;
  groovePaddingMode: 'Middle';
}

/** Flat `NoteLength` wins when rounding costs at most 0.5% of tempo. */
const FLAT_TOLERANCE = 0.005;

/**
 * Realize a requested BPM as FamiStudio tempo settings (mapping spec section
 * 2, rule 4; math from `TempoUtils.ComputeBpmForGroove`): a flat `NoteLength`
 * 1–18 when the ideal frames-per-row is near-integer, else the nearest
 * groove of one or two frame values differing by at most 1 with cycle ≤ 8.
 * Groove values sort descending (largest first).
 */
export function realizeTempo(requestedBpm: number, rowsPerQuarter: number, beatLength: number): RealizedTempo {
  const base = { requestedBpm, beatLength, groovePaddingMode: 'Middle' } as const;
  const ideal = idealFramesPerRow(requestedBpm, rowsPerQuarter);
  const nearest = Math.round(ideal);
  if (nearest >= 1 && nearest <= 18 && Math.abs(ideal - nearest) / ideal <= FLAT_TOLERANCE) {
    return { ...base, actualBpm: (NTSC_FPS * 60) / (nearest * beatLength), noteLengthBase: nearest, noteLength: nearest };
  }
  if (ideal < 1 || ideal > 18) {
    const clamped = Math.min(18, Math.max(1, nearest));
    return { ...base, actualBpm: (NTSC_FPS * 60) / (clamped * beatLength), noteLengthBase: clamped, noteLength: clamped };
  }
  const floor = Math.floor(ideal);
  let best = { cycle: 1, high: 1, error: Math.abs(ideal - (floor + 1)) };
  for (let cycle = 1; cycle <= 8; cycle++) {
    for (let high = 0; high <= cycle; high++) {
      const error = Math.abs(ideal - (floor + high / cycle));
      if (error < best.error - 1e-12 || (Math.abs(error - best.error) <= 1e-12 && cycle < best.cycle)) {
        best = { cycle, high, error };
      }
    }
  }
  const values = [...Array<string>(best.high).fill(String(floor + 1)), ...Array<string>(best.cycle - best.high).fill(String(floor))];
  const average = floor + best.high / best.cycle;
  return {
    ...base,
    actualBpm: (NTSC_FPS * 60) / (average * beatLength),
    noteLengthBase: floor,
    groove: values.join('-'),
  };
}

/** One-line tempo setting for reports (`NoteLength 7` or `Groove "8-7"`). */
export function tempoSettingLabel(tempo: RealizedTempo): string {
  if (tempo.noteLength !== undefined) return `NoteLength ${tempo.noteLength}`;
  return `Groove "${tempo.groove ?? ''}"`;
}
