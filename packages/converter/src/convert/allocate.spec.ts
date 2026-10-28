import { describe, expect, it } from 'vitest';
import type { MusicEvent, StreamId } from '../parse/parse.js';
import type { Stream } from '../parse/streams.js';
import { allocateStreams } from './allocate.js';

const id = (voice: string, part = 'P1'): StreamId => ({ part, staff: 1, voice });
const note = (stream: StreamId, midi: number): MusicEvent => ({
  kind: 'note',
  stream,
  onsetQuarters: 0,
  durationQuarters: 1,
  midi,
  tieStart: false,
  tieStop: false,
});
const streamOf = (voice: string, midis: number[]): Stream => {
  const streamId = id(voice);
  return { id: streamId, events: midis.map((midi) => note(streamId, midi)) };
};

describe('allocateStreams', () => {
  it('gives a lone stream to Square 1 with the Lead instrument', () => {
    const { assigned, dropped } = allocateStreams([streamOf('1', [60])], () => []);
    expect(assigned).toHaveLength(1);
    expect(assigned[0].channel).toBe('Square1');
    expect(assigned[0].instrument).toBe('Lead');
    expect(dropped).toEqual([]);
  });

  it('assigns deterministically regardless of input order', () => {
    const streams = [streamOf('2', [48]), streamOf('1', [72]), streamOf('3', [55])];
    const first = allocateStreams(streams, () => []);
    const second = allocateStreams([...streams].reverse(), () => []);
    const channelsOf = (allocation: ReturnType<typeof allocateStreams>): string[] =>
      allocation.assigned.map((a) => `${a.stream.voice}:${a.channel}`);
    expect(channelsOf(first)).toEqual(['1:Square1', '3:Square2', '2:Triangle']);
    expect(channelsOf(second)).toEqual(channelsOf(first));
  });

  it('ranks a rest-only stream below pitched streams', () => {
    const restId = id('2');
    const streams: Stream[] = [
      { id: restId, events: [{ kind: 'rest', stream: restId, onsetQuarters: 0, durationQuarters: 4 }] },
      streamOf('1', [60]),
    ];
    const { assigned } = allocateStreams(streams, () => []);
    expect(assigned.find((a) => a.stream.voice === '1')?.channel).toBe('Square1');
    expect(assigned.find((a) => a.stream.voice === '2')?.channel).toBe('Triangle');
  });
});
