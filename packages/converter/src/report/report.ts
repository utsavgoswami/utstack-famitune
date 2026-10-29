/**
 * Conversion report skeleton: loss reporting is a data product,
 * not console output. The adapt stage returns `{ text, report }`; the CLI
 * prints and optionally writes it. Parse fills the parse-side fields
 * (unhandled constructs, missing-tempo warning); adapt adds the
 * adapt-side counts (channel notes, drops, reductions, tempo, error).
 */

export interface UnhandledConstruct {
  /** Element or construct name outside the input profile (e.g. `grace-note`). */
  construct: string;
  part: string;
  measure: string;
}

export interface ConversionReport {
  unhandled: UnhandledConstruct[];
  /** True when the score marks no tempo and conversion used the default. */
  missingTempoWarning: boolean;  /** Rows per quarter note chosen by grid selection (0 when not converted). */
  rowsPerQuarter: number;
  /** Maximum absolute-onset quantization error, in NES frames. */
  maxOnsetErrorFrames: number;
  /** Fractional MIDI pitches rounded to the nearest semitone. */
  microtoneRoundings: number;
  /** Notes whose written spelling differs from sharp-only output (pitch-exact). */
  enharmonicRespellings: number;
  /** Requested tempo in quarter-note BPM (0 when not converted). */
  requestedBpm: number;
  /** Realized tempo in BPM after frame/groove approximation. */
  actualBpm: number;
  /** Realized tempo setting (`NoteLength 7` or `Groove "8-7"`). */
  tempoSetting: string;
  /** Overflow streams dropped for lack of melodic channels. */
  droppedStreams: Array<{ stream: string; noteCount: number }>;
  /** Chord onsets reduced to one pitch. */
  chordTonesKept: number;
  /** Chord tones removed by reduction. */
  chordTonesDropped: number;
  /** Repeated same-pitch notes shortened by 1 subrow so the next note is audible. */
  articulatedRepeats: number;
  /** Repeated same-pitch notes left at full length because 1 subrow is the whole note. */
  articulationSkips: number;
  /** Notes moved by octaves into the NES pitch range. */
  octaveShiftedNotes: number;
  /** Converted note counts per channel. */
  notesPerChannel: Array<{ channel: string; notes: number }>;
}

export function emptyReport(): ConversionReport {
  return {
    unhandled: [],
    missingTempoWarning: false,
    rowsPerQuarter: 0,
    maxOnsetErrorFrames: 0,
    microtoneRoundings: 0,
    enharmonicRespellings: 0,
    requestedBpm: 0,
    actualBpm: 0,
    tempoSetting: '',
    droppedStreams: [],
    chordTonesKept: 0,
    chordTonesDropped: 0,
    articulatedRepeats: 0,
    articulationSkips: 0,
    octaveShiftedNotes: 0,
    notesPerChannel: [],
  };
}

/** Build the parse-side report from a parsed score. */
export function createReport(input: {
  unhandled: UnhandledConstruct[];
  tempoUsedDefault: boolean;
  enharmonicRespellings?: number;
}): ConversionReport {
  return {
    unhandled: input.unhandled.map((u) => ({ ...u })),
    missingTempoWarning: input.tempoUsedDefault,
    rowsPerQuarter: 0,
    maxOnsetErrorFrames: 0,
    microtoneRoundings: 0,
    enharmonicRespellings: input.enharmonicRespellings ?? 0,
    requestedBpm: 0,
    actualBpm: 0,
    tempoSetting: '',
    droppedStreams: [],
    chordTonesKept: 0,
    chordTonesDropped: 0,
    articulatedRepeats: 0,
    articulationSkips: 0,
    octaveShiftedNotes: 0,
    notesPerChannel: [],
  };
}

/** Human-readable rendering for CLI output and report files. */
export function formatReport(report: ConversionReport): string {
  const lines = ['Conversion report'];
  lines.push(
    report.missingTempoWarning
      ? '- Tempo: no tempo marking; used the default (see missing-tempo warning)'
      : '- Tempo: score markings used',
  );
  if (report.unhandled.length === 0) {
    lines.push('- Unhandled constructs: none');
  } else {
    lines.push(`- Unhandled constructs (${report.unhandled.length}):`);
    for (const u of report.unhandled) {
      lines.push(`  - ${u.construct} (part "${u.part}", measure "${u.measure}")`);
    }
  }
  if (report.rowsPerQuarter > 0) {
    lines.push(`- Grid: ${report.rowsPerQuarter} rows per quarter note`);
    lines.push(`- Max onset quantization error: ${report.maxOnsetErrorFrames.toFixed(2)} frames`);
    lines.push(`- Microtone roundings: ${report.microtoneRoundings}`);
    if (report.enharmonicRespellings > 0) {
      lines.push(
        `- Enharmonic respellings: ${report.enharmonicRespellings} (flats to sharps, pitch-exact)`,
      );
    }
  }
  if (report.tempoSetting !== '') {
    lines.push(
      `- Tempo: requested ${report.requestedBpm} BPM, actual ${report.actualBpm.toFixed(2)} BPM (${report.tempoSetting}, padding Middle)`,
    );
  }
  if (report.droppedStreams.length === 0) {
    lines.push('- Dropped streams: none');
  } else {
    lines.push(`- Dropped streams (${report.droppedStreams.length}):`);
    for (const dropped of report.droppedStreams) {
      lines.push(`  - ${dropped.stream} (${dropped.noteCount} notes)`);
    }
  }
  if (report.chordTonesKept + report.chordTonesDropped > 0) {
    lines.push(`- Chord tones: kept ${report.chordTonesKept}, dropped ${report.chordTonesDropped}`);
  }
  if (report.articulatedRepeats > 0) {
    lines.push(`- Repeated notes shortened by 1 subrow: ${report.articulatedRepeats}`);
  }
  if (report.articulationSkips > 0) {
    lines.push(`- Repeated notes too short to shorten: ${report.articulationSkips}`);
  }
  if (report.octaveShiftedNotes > 0) {
    lines.push(`- Octave-shifted pitches: ${report.octaveShiftedNotes}`);
  }
  if (report.notesPerChannel.length > 0) {
    const counts = report.notesPerChannel.map((c) => `${c.channel} ${c.notes}`).join(', ');
    lines.push(`- Notes per channel: ${counts}`);
  }
  return lines.join('\n');
}
