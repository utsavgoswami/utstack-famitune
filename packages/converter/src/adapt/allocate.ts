import type { StreamId } from '../parse/parse.js';
import type { Stream } from '../parse/streams.js';
import type { StreamPattern } from './patterns.js';

export type MelodicChannel = 'Square1' | 'Square2' | 'Triangle';
export type StarterInstrument = 'Lead' | 'Harmony' | 'Bass';

export interface ChannelAssignment {
  channel: MelodicChannel;
  instrument: StarterInstrument;
  stream: StreamId;
  patterns: StreamPattern[];
}

export interface DroppedStream {
  stream: StreamId;
  noteCount: number;
}

export interface Allocation {
  assigned: ChannelAssignment[];
  dropped: DroppedStream[];
}

const CHANNEL_INSTRUMENT: Record<MelodicChannel, StarterInstrument> = {
  Square1: 'Lead',
  Square2: 'Harmony',
  Triangle: 'Bass',
};

function countNotes(stream: Stream): number {
  return stream.events.filter((e) => e.kind === 'note').length;
}

function medianPitch(stream: Stream): number {
  const pitches = stream.events.filter((e) => e.kind === 'note').map((e) => e.midi).sort((a, b) => a - b);
  if (pitches.length === 0) return Number.NEGATIVE_INFINITY;
  const mid = Math.floor(pitches.length / 2);
  return pitches.length % 2 === 1 ? pitches[mid] : (pitches[mid - 1] + pitches[mid]) / 2;
}

/**
 * Allocate streams to monophonic NES channels (mapping spec section 4).
 * Streams sort by median pitch, highest first (stable: part, staff, voice
 * order breaks ties, so identical input always gives the same assignment):
 * one stream takes Square 1; two streams take Square 1 and Triangle; three
 * or more take Square 1, Square 2, and Triangle for the highest, second,
 * and lowest streams, and every middle stream drops with a report entry.
 * A dropped stream never interleaves onto an occupied channel.
 */
export function allocateStreams(
  streams: Stream[],
  patternsByStream: (stream: StreamId) => StreamPattern[],
): Allocation {
  const ranked = streams.map((stream) => ({ stream, median: medianPitch(stream) }));
  ranked.sort((a, b) => b.median - a.median);
  const channelsFor = (count: number): MelodicChannel[] => {
    if (count <= 1) return ['Square1'];
    if (count === 2) return ['Square1', 'Triangle'];
    return ['Square1', 'Square2', 'Triangle'];
  };
  const assigned: ChannelAssignment[] = [];
  const dropped: DroppedStream[] = [];
  if (ranked.length >= 3) {
    const picks = [ranked[0], ranked[1], ranked[ranked.length - 1]];
    const channels = channelsFor(3);
    picks.forEach((pick, i) => {
      const channel = channels[i];
      assigned.push({
        channel,
        instrument: CHANNEL_INSTRUMENT[channel],
        stream: { ...pick.stream.id },
        patterns: patternsByStream(pick.stream.id),
      });
    });
    for (const middle of ranked.slice(2, ranked.length - 1)) {
      dropped.push({ stream: { ...middle.stream.id }, noteCount: countNotes(middle.stream) });
    }
  } else {
    ranked.forEach((pick, i) => {
      const channel = channelsFor(ranked.length)[i];
      assigned.push({
        channel,
        instrument: CHANNEL_INSTRUMENT[channel],
        stream: { ...pick.stream.id },
        patterns: patternsByStream(pick.stream.id),
      });
    });
  }
  return { assigned, dropped };
}

/** Human label for a stream identity in reports. */
export function streamLabel(id: StreamId): string {
  return `part "${id.part}", staff ${id.staff}, voice "${id.voice}"`;
}
