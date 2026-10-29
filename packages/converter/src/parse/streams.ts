import type { MusicEvent, StreamId } from './parse.js';

/** One monophonic line extracted from a part: all events sharing a stream identity. */
export interface Stream {
  id: StreamId;
  events: MusicEvent[];
}

/** Stable key for a stream identity (part, staff, voice). */
export function streamKey(id: StreamId): string {
  return `${id.part}\n${id.staff}\n${id.voice}`;
}

function compareVoice(a: string, b: string): number {
  const na = Number(a);
  const nb = Number(b);
  if (Number.isInteger(na) && Number.isInteger(nb)) return na - nb;
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Group events into streams by (part, staff, voice).
 * Streams sort deterministically: part in first-seen order, then staff,
 * then voice. Chord tones at one onset stay together in one stream;
 * chord reduction happens later as an adapt policy, not here.
 */
export function splitIntoStreams(events: MusicEvent[]): Stream[] {
  const partOrder = new Map<string, number>();
  const groups = new Map<string, Stream>();
  for (const event of events) {
    const id = event.stream;
    if (!partOrder.has(id.part)) partOrder.set(id.part, partOrder.size);
    const key = streamKey(id);
    const existing = groups.get(key);
    if (existing) {
      existing.events.push(event);
    } else {
      groups.set(key, { id: { ...id }, events: [event] });
    }
  }
  return [...groups.values()].sort((a, b) => {
    const partDelta = (partOrder.get(a.id.part) ?? 0) - (partOrder.get(b.id.part) ?? 0);
    if (partDelta !== 0) return partDelta;
    if (a.id.staff !== b.id.staff) return a.id.staff - b.id.staff;
    return compareVoice(a.id.voice, b.id.voice);
  });
}
