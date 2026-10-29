import type { ParsedScore } from '../parse/parse.js';
import { splitIntoStreams } from '../parse/streams.js';
import { streamKey } from '../parse/streams.js';
import { bpmAt } from '../parse/tempo.js';
import { mergeTies } from '../parse/ties.js';
import type { ConversionReport } from '../report/report.js';
import { chunkStream, type StreamPattern } from './patterns.js';
import { allocateStreams, streamLabel, type Allocation } from './allocate.js';
import { reduceChords } from './chords.js';
import { quantizePiece, type QuantizedNote, type QuantizedPiece } from './quantize.js';
import { realizeTempo, tempoSettingLabel, type RealizedTempo } from './tempo.js';

export interface AdaptedPiece {
  piece: QuantizedPiece;
  tempo: RealizedTempo;
  patterns: StreamPattern[];
  allocation: Allocation;
  report: ConversionReport;
}

/**
 * Adapt a parsed score to NES constraints.
 * Tie chains merge first (single sounding events), onsets and durations
 * quantize to the row grid, the opening tempo realizes to FamiStudio frame
 * settings, and each stream chunks into per-measure patterns. Later
 * increments extend this pipeline with channel allocation and chord
 * reduction.
 */
export function adaptPiece(parsed: ParsedScore): AdaptedPiece {
  const events = mergeTies(parsed.events);
  const piece = quantizePiece(events, parsed.tempoMap, parsed.measures);
  const requestedBpm = bpmAt(parsed.tempoMap, 0);
  const firstMeasure = parsed.measures[0];
  const beatLength = piece.rowsPerQuarter * (firstMeasure ? 4 / firstMeasure.beatType : 1);
  const tempo = realizeTempo(requestedBpm, piece.rowsPerQuarter, beatLength);
  const streams = splitIntoStreams(events);
  const quantizedByStream = new Map<string, QuantizedNote[]>();
  for (const note of piece.notes) {
    const key = streamKey(note.stream);
    const list = quantizedByStream.get(key);
    if (list) list.push(note);
    else quantizedByStream.set(key, [note]);
  }
  const patterns = streams.flatMap((stream) =>
    chunkStream(
      stream.id,
      quantizedByStream.get(streamKey(stream.id)) ?? [],
      parsed.measures,
      parsed.endQuarters,
      piece.rowsPerQuarter,
      parsed.tempoMap,
    ),
  );
  const patternsByStream = new Map<string, StreamPattern[]>();
  for (const pattern of patterns) {
    const key = streamKey(pattern.stream);
    const list = patternsByStream.get(key);
    if (list) list.push(pattern);
    else patternsByStream.set(key, [pattern]);
  }
  const allocation = allocateStreams(streams, (stream) => patternsByStream.get(streamKey(stream)) ?? []);
  let chordTonesKept = 0;
  let chordTonesDropped = 0;
  for (const assignment of allocation.assigned) {
    const reduced = reduceChords(assignment.patterns);
    assignment.patterns = reduced.patterns;
    chordTonesKept += reduced.kept;
    chordTonesDropped += reduced.dropped;
  }
  const report: ConversionReport = {
    unhandled: parsed.unhandled.map((u) => ({ ...u })),
    missingTempoWarning: parsed.tempoMap.usedDefault,
    rowsPerQuarter: piece.rowsPerQuarter,
    maxOnsetErrorFrames: piece.maxOnsetErrorFrames,
    microtoneRoundings: piece.microtoneRoundings,
    enharmonicRespellings: parsed.enharmonicRespellings,
    requestedBpm: tempo.requestedBpm,
    actualBpm: tempo.actualBpm,
    tempoSetting: tempoSettingLabel(tempo),
    droppedStreams: allocation.dropped.map((d) => ({ stream: streamLabel(d.stream), noteCount: d.noteCount })),
    chordTonesKept,
    chordTonesDropped,
    octaveShiftedNotes: 0,
    notesPerChannel: [],
  };
  return { piece, tempo, patterns, allocation, report };
}
