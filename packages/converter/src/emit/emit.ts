import { FAMISTUDIO_VERSION } from '../config.js';
import type { ChannelAssignment, MelodicChannel } from '../convert/allocate.js';
import type { RealizedTempo } from '../convert/tempo.js';
import { convertPiece, type ConvertedPiece } from '../convert/convert.js';
import type { ParsedScore } from '../parse/parse.js';
import type { ConversionReport } from '../report/report.js';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Lowest and highest MIDI pitches the NES range C0–B7 covers. */
const RANGE_MIN = 12;
const RANGE_MAX = 107;

export interface NamedPitch {
  name: string;
  /** True when the pitch moved by octaves to reach the NES range. */
  octaveShifted: boolean;
}

/**
 * MIDI pitch to FamiStudio note name with sharp spelling only
 * (sounding MIDI 63 → `D#3`, never `Eb3`). FamiStudio octave labels run one
 * octave above scientific pitch notation — render probes prove FamiStudio
 * "C3" sounds middle C (261.6 Hz) and "A3" sounds concert A (440.5 Hz) — so
 * the emitted name is the sharp spelling of the sounding MIDI pitch minus
 * 12. Out-of-range pitches move by octaves into C0–B7 (sounding MIDI
 * 24–119); an octave move always lands in range for integer MIDI.
 * Enharmonic respelling is exact in pitch, so it logs no loss.
 */
export function midiToName(midi: number): NamedPitch {
  let value = Math.round(midi) - 12;
  let octaveShifted = false;
  while (value < RANGE_MIN) {
    value += 12;
    octaveShifted = true;
  }
  while (value > RANGE_MAX) {
    value -= 12;
    octaveShifted = true;
  }
  return { name: `${NOTE_NAMES[value % 12]}${Math.floor(value / 12) - 1}`, octaveShifted };
}

const STARTER_INSTRUMENTS: Array<{ name: string; envelopes: Array<{ type: string; values: string }> }> = [
  { name: 'Lead', envelopes: [{ type: 'Volume', values: '15' }, { type: 'DutyCycle', values: '2' }] },
  { name: 'Harmony', envelopes: [{ type: 'Volume', values: '12' }, { type: 'DutyCycle', values: '1' }] },
  { name: 'Bass', envelopes: [{ type: 'Volume', values: '15' }] },
];

const ALL_CHANNELS: MelodicChannel[] = ['Square1', 'Square2', 'Triangle'];
const EXTRA_CHANNELS = ['Noise', 'DPCM'];

function escapeAttr(value: string): string {
  return value.replace(/"/g, '""');
}

function tempoAttributes(tempo: RealizedTempo): string {
  // NoteLength and Groove are both mandatory in the 4.5.0 text loader;
  // flat tempos carry a single-value groove, as real exports do.
  const groove = tempo.groove ?? String(tempo.noteLengthBase);
  return `NoteLength="${tempo.noteLengthBase}" Groove="${groove}"`;
}

export interface SongProject {
  title: string;
  tempo: RealizedTempo;
  beatLength: number;
  patternLength: number;
  measureCount: number;
  assignments: ChannelAssignment[];
}

export interface EmittedSong {
  text: string;
  octaveShiftedNotes: number;
  notesPerChannel: Array<{ channel: string; notes: number }>;
}

/**
 * Render a song project as FamiStudio Text in the Increment 1 golden shape:
 * pinned `Project Version`, flat starter instruments, one pattern per
 * channel per measure with per-channel `PatternInstance` lines (as children
 * of each Channel, per a real 4.5.0 export), and `PatternCustomSettings`
 * for length overrides and pattern-start tempo changes. `NoteLength` always
 * rides along because the 4.5.0 text loader requires it.
 *
 * Time units (verified against the 4.5.0 loader source and render probes,
 * contradicting the row-based docs): note `Time`/`Duration` are in SUBROWS
 * (1/NoteLength of a row) and scale with the pattern's NoteLength, while
 * `PatternLength`/`BeatLength`/`PatternCustomSettings Length` stay in rows.
 * The emitter multiplies row counts by the pattern's NoteLength base.
 */
export function emitFamiStudioText(project: SongProject): EmittedSong {
  const lines: string[] = [];
  const title = escapeAttr(project.title);
  lines.push(`Project Version="${FAMISTUDIO_VERSION}" TempoMode="FamiStudio" Name="${title}"`);
  for (const instrument of STARTER_INSTRUMENTS) {
    lines.push(`\tInstrument Name="${instrument.name}"`);
    for (const envelope of instrument.envelopes) {
      lines.push(`\t\tEnvelope Type="${envelope.type}" Length="1" Values="${envelope.values}"`);
    }
  }
  lines.push(
    `\tSong Name="${title}" Length="${project.measureCount}" LoopPoint="-1" ` +
      `PatternLength="${project.patternLength}" BeatLength="${project.beatLength}" ` +
      `${tempoAttributes(project.tempo)} GroovePaddingMode="Middle"`,
  );
  const customs = new Map<number, string>();
  for (const assignment of project.assignments) {
    for (const pattern of assignment.patterns) {
      if (customs.has(pattern.measureOrdinal)) continue;
      if (pattern.customLengthRows === undefined && pattern.tempo === undefined) continue;
      // Customs always carry the full tempo (loader-mandatory), with Length
      // only when the actual measure differs from nominal.
      const tempo = pattern.tempo ?? project.tempo;
      const parts = [`Time="${pattern.measureOrdinal}"`];
      if (pattern.customLengthRows !== undefined) parts.push(`Length="${pattern.customLengthRows}"`);
      parts.push(...tempoAttributes(tempo).split(' '));
      parts.push(`BeatLength="${pattern.rowsPerBeat}"`, `GroovePaddingMode="Middle"`);
      customs.set(pattern.measureOrdinal, `\t\tPatternCustomSettings ${parts.join(' ')}`);
    }
  }
  for (const ordinal of [...customs.keys()].sort((a, b) => a - b)) {
    lines.push(customs.get(ordinal) as string);
  }
  const byChannel = new Map<string, ChannelAssignment>();
  for (const assignment of project.assignments) byChannel.set(assignment.channel, assignment);
  let octaveShiftedNotes = 0;
  const notesPerChannel: Array<{ channel: string; notes: number }> = [];
  for (const channel of [...ALL_CHANNELS, ...EXTRA_CHANNELS]) {
    lines.push(`\t\tChannel Type="${channel}"`);
    const assignment = byChannel.get(channel);
    if (!assignment) {
      notesPerChannel.push({ channel, notes: 0 });
      continue;
    }
    let channelNotes = 0;
    for (const pattern of assignment.patterns) {
      // Note rows scale to subrows with the pattern's own NoteLength base
      // (song tempo, or the pattern-start override when present).
      const base = pattern.tempo?.noteLengthBase ?? project.tempo.noteLengthBase;
      lines.push(`\t\t\tPattern Name="${pattern.name}"`);
      for (const note of pattern.notes) {
        const named = midiToName(note.midi);
        if (named.octaveShifted) octaveShiftedNotes++;
        channelNotes++;
        lines.push(
          `\t\t\t\tNote Time="${note.row * base}" Value="${named.name}" Duration="${note.durationRows * base}" Instrument="${assignment.instrument}"`,
        );
      }
    }
    // PatternInstance lines bind patterns to song columns per channel, as
    // children of the Channel (verified against a real 4.5.0 export).
    for (const pattern of assignment.patterns) {
      lines.push(`\t\t\tPatternInstance Time="${pattern.measureOrdinal}" Pattern="${pattern.name}"`);
    }
    notesPerChannel.push({ channel, notes: channelNotes });
  }
  return { text: `${lines.join('\n')}\n`, octaveShiftedNotes, notesPerChannel };
}

/**
 * Assemble the song project from a converted piece. The song-level pattern
 * length comes from the first pattern's nominal length; the song tempo is
 * the realized opening tempo.
 */
export function projectFromConverted(title: string, converted: ConvertedPiece, measureCount: number): SongProject {
  const firstPattern = converted.patterns[0];
  return {
    title,
    tempo: converted.tempo,
    beatLength: converted.tempo.beatLength,
    patternLength: firstPattern?.lengthRows ?? 16,
    measureCount,
    assignments: converted.allocation.assigned,
  };
}

export interface ConversionResult {
  text: string;
  report: ConversionReport;
}

/**
 * Full convert-and-emit pipeline for one score: parse product in, version
 * stamped FamiStudio Text plus conversion report out. Deterministic:
 * identical input gives byte-identical text.
 */
export function convertScoreToText(title: string, parsed: ParsedScore): ConversionResult {
  const converted = convertPiece(parsed);
  const emitted = emitFamiStudioText(projectFromConverted(title, converted, parsed.measures.length));
  const report: ConversionReport = {
    ...converted.report,
    octaveShiftedNotes: emitted.octaveShiftedNotes,
    notesPerChannel: emitted.notesPerChannel,
  };
  return { text: emitted.text, report };
}
