import type { MusicEvent } from './parse.js';
import { streamKey } from './streams.js';

/**
 * Merge tie chains into single events with summed durations.
 * Two same-stream notes merge only when they are adjacent in the stream,
 * share a MIDI pitch, and link explicitly: the earlier note carries
 * `<tie type="start">` and the later note carries `<tie type="stop">`.
 * Anything else (rests between, pitch change, orphan stop) stays separate
 * so no music is ever fused or dropped silently.
 */
export function mergeTies(events: MusicEvent[]): MusicEvent[] {
  const merged: MusicEvent[] = [];
  const lastIndexByStream = new Map<string, number>();
  for (const event of events) {
    const key = streamKey(event.stream);
    const prevIndex = lastIndexByStream.get(key);
    if (event.kind === 'note' && event.tieStop && prevIndex !== undefined) {
      const prev = merged[prevIndex];
      if (prev.kind === 'note' && prev.tieStart && prev.midi === event.midi) {
        merged[prevIndex] = {
          ...prev,
          durationQuarters: prev.durationQuarters + event.durationQuarters,
          tieStop: event.tieStop,
        };
        continue;
      }
    }
    merged.push(event);
    lastIndexByStream.set(key, merged.length - 1);
  }
  return merged;
}
