import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  dominantFrequency,
  hasAudibleGap,
  midiToFrequency,
  readWavFile,
  verifyNes,
  verifyNesFile,
  verifyWav,
  type PcmAudio,
} from './verify.js';

const RATE = 44100;

function sine(midi: number, seconds: number, gapBefore = 0, square = false): Float64Array {
  const freq = midiToFrequency(midi);
  const gap = new Float64Array(Math.floor(gapBefore * RATE));
  const tone = new Float64Array(Math.floor(seconds * RATE));
  for (let i = 0; i < tone.length; i++) {
    const attack = Math.min(1, i / (0.005 * RATE));
    const wave = Math.sin((2 * Math.PI * freq * i) / RATE);
    tone[i] = (square ? Math.sign(wave) : wave) * attack * 0.8;
  }
  const out = new Float64Array(gap.length + tone.length);
  out.set(gap, 0);
  out.set(tone, gap.length);
  return out;
}

function concat(...parts: Float64Array[]): Float64Array {
  const out = new Float64Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

describe('dominantFrequency', () => {
  it('finds sine and square pitches', () => {
    const audio: PcmAudio = { samples: sine(60, 0.5), sampleRate: RATE };
    expect(dominantFrequency(audio.samples, RATE)).toBeCloseTo(261.63, 0);
    const square: PcmAudio = { samples: sine(64, 0.5, 0, true), sampleRate: RATE };
    const found = dominantFrequency(square.samples, RATE) ?? 0;
    expect(Math.abs(found - 329.63) / 329.63).toBeLessThan(0.03);
  });
});

describe('verifyWav', () => {
  it('passes two notes with a rest gap', () => {
    const samples = concat(sine(60, 0.4), new Float64Array(Math.floor(0.1 * RATE)), sine(64, 0.4));
    const result = verifyWav(
      { samples, sampleRate: RATE },
      [
        { midi: 60, onsetSeconds: 0, durationSeconds: 0.4 },
        { midi: 64, onsetSeconds: 0.5, durationSeconds: 0.4 },
      ],
    );
    expect(result.passed).toBe(true);
  });

  it('fails a wrong pitch', () => {
    const samples = sine(60, 0.4);
    const result = verifyWav({ samples, sampleRate: RATE }, [{ midi: 62, onsetSeconds: 0, durationSeconds: 0.4 }]);
    expect(result.passed).toBe(false);
    expect(result.details.join(' ')).toMatch(/Hz/);
  });

  it('fails an onset beyond one NES frame', () => {
    const samples = sine(60, 0.4, 0.025);
    const result = verifyWav({ samples, sampleRate: RATE }, [{ midi: 60, onsetSeconds: 0, durationSeconds: 0.4 }]);
    expect(result.passed).toBe(false);
    expect(result.details.join(' ')).toMatch(/onset/);
  });

  it('checks the total duration within a frame per segment', () => {
    const samples = sine(60, 0.4);
    const ok = verifyWav(
      { samples, sampleRate: RATE },
      [{ midi: 60, onsetSeconds: 0, durationSeconds: 0.4 }],
      1 / 60.0988,
      0.4,
    );
    expect(ok.passed).toBe(true);
    const bad = verifyWav(
      { samples, sampleRate: RATE },
      [{ midi: 60, onsetSeconds: 0, durationSeconds: 0.4 }],
      1 / 60.0988,
      0.5,
    );
    expect(bad.passed).toBe(false);
  });
});

describe('hasAudibleGap', () => {
  it('finds a gap before a repeated note with the same pitch', () => {
    const samples = concat(sine(71, 0.5), new Float64Array(Math.floor(0.02 * RATE)), sine(71, 0.5));
    expect(hasAudibleGap({ samples, sampleRate: RATE }, 0.52)).toBe(true);
  });

  it('finds no gap in one long note', () => {
    const samples = sine(71, 1.0);
    expect(hasAudibleGap({ samples, sampleRate: RATE }, 0.5)).toBe(false);
  });
});

describe('readWavFile', () => {
  it('reads 16-bit mono PCM', () => {
    const tone = sine(60, 0.1);
    const data = Buffer.alloc(tone.length * 2);
    for (let i = 0; i < tone.length; i++) data.writeInt16LE(Math.round(tone[i] * 32767), i * 2);
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + data.length, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(1, 22);
    header.writeUInt32LE(RATE, 24);
    header.writeUInt32LE(RATE * 2, 28);
    header.writeUInt16LE(2, 32);
    header.writeUInt16LE(16, 34);
    header.write('data', 36);
    header.writeUInt32LE(data.length, 40);
    const path = join(mkdtempSync(join(tmpdir(), 'famitune-wav-')), 'tone.wav');
    writeFileSync(path, Buffer.concat([header, data]));
    const audio = readWavFile(path);
    expect(audio.sampleRate).toBe(RATE);
    expect(audio.samples.length).toBe(tone.length);
    expect(dominantFrequency(audio.samples, RATE)).toBeCloseTo(261.63, 0);
  });
});

describe('verifyNes', () => {
  function rom(prg: number, chr: number, trainer: boolean, nes2 = false): Buffer {
    const size = 16 + (trainer ? 512 : 0) + prg * 16384 + chr * 8192;
    const bytes = Buffer.alloc(size);
    bytes.write('NES\x1A', 0, 'ascii');
    bytes[4] = prg;
    bytes[5] = chr;
    if (trainer) bytes[6] |= 0x04;
    if (nes2) bytes[7] |= 0x08;
    return bytes;
  }

  it('passes a well-formed 2-PRG/1-CHR ROM', () => {
    const result = verifyNes(rom(2, 1, false));
    expect(result.passed).toBe(true);
    expect(result.details.join(' ')).toMatch(/2 PRG/);
  });

  it('passes a ROM with a trainer', () => {
    expect(verifyNes(rom(1, 1, true)).passed).toBe(true);
  });

  it('passes a ROM with zero CHR banks (CHR RAM)', () => {
    expect(verifyNes(rom(1, 0, false)).passed).toBe(true);
  });

  it('fails a bad magic', () => {
    const bytes = rom(2, 1, false);
    bytes.write('NOPE', 0, 'ascii');
    const result = verifyNes(bytes);
    expect(result.passed).toBe(false);
    expect(result.details.join(' ')).toMatch(/magic/);
  });

  it('fails a file shorter than the header', () => {
    const result = verifyNes(Buffer.alloc(10));
    expect(result.passed).toBe(false);
    expect(result.details.join(' ')).toMatch(/16-byte/);
  });

  it('fails a truncated ROM', () => {
    const bytes = rom(2, 1, false).subarray(0, 100);
    const result = verifyNes(bytes);
    expect(result.passed).toBe(false);
    expect(result.details.join(' ')).toMatch(/declares 40976/);
  });

  it('fails a ROM with zero PRG banks', () => {
    const bytes = Buffer.alloc(16);
    bytes.write('NES\x1A', 0, 'ascii');
    const result = verifyNes(bytes);
    expect(result.passed).toBe(false);
    expect(result.details.join(' ')).toMatch(/zero PRG/);
  });

  it('fails a NES 2.0 header', () => {
    const result = verifyNes(rom(2, 1, false, true));
    expect(result.passed).toBe(false);
    expect(result.details.join(' ')).toMatch(/2\.0/);
  });

  it('validates a ROM file on disk', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'famitune-nes-')), 'game.nes');
    writeFileSync(path, rom(2, 1, false));
    expect(verifyNesFile(path).passed).toBe(true);
  });

  it('fails instead of throwing for a missing ROM file', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'famitune-nes-')), 'missing.nes');
    const result = verifyNesFile(path);
    expect(result.passed).toBe(false);
    expect(result.details.join(' ')).toMatch(/cannot read ROM file/);
  });
});
