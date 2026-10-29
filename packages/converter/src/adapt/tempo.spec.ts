import { describe, expect, it } from 'vitest';
import { realizeTempo } from './tempo.js';

describe('realizeTempo', () => {
  it('realizes 120 BPM at 16th grid as groove 8-7', () => {
    const tempo = realizeTempo(120, 4, 4);
    expect(tempo.noteLength).toBeUndefined();
    expect(tempo.groove).toBe('8-7');
    expect(tempo.groovePaddingMode).toBe('Middle');
    expect(tempo.requestedBpm).toBe(120);
    expect(Math.abs(tempo.actualBpm - 120)).toBeLessThan(1);
  });

  it('uses a flat NoteLength when the ideal is near-integer', () => {
    const flat = realizeTempo(150, 4, 4);
    expect(flat.noteLength).toBe(6);
    expect(flat.groove).toBeUndefined();
    const exact = realizeTempo((60 * 60.0988) / (7 * 4), 4, 4);
    expect(exact.noteLength).toBe(7);
    expect(exact.actualBpm).toBeCloseTo(exact.requestedBpm, 9);
  });

  it('orders groove values largest first', () => {
    expect(realizeTempo(142, 4, 4).groove).toBe('7-6-6');
  });
});
