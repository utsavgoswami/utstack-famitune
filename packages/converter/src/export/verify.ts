import { readFileSync } from 'node:fs';

/**
 * Output verification: automated guardrail for exported
 * output. WAV pitch per segment comes from autocorrelation; onsets come from
 * an energy envelope. Limits follow the vertical slice: each onset within one
 * NES frame (~16.6 ms NTSC) of expected, each pitch within half a semitone.
 * NES ROM structure is checked against the iNES header. Listening (layer 2)
 * stays manual.
 */

export const NES_FRAME_SECONDS = 1 / 60.0988;

export interface PcmAudio {
  samples: Float64Array;
  sampleRate: number;
}

export interface ExpectedSegment {
  midi: number;
  onsetSeconds: number;
  durationSeconds: number;
}

export interface VerifyResult {
  passed: boolean;
  details: string[];
}

/** Read a PCM WAV file (8/16-bit, any channels) mixed down to mono. */
export function readWavFile(path: string): PcmAudio {
  const bytes = readFileSync(path);
  if (bytes.length < 44 || bytes.toString('ascii', 0, 4) !== 'RIFF') {
    throw new Error(`not a WAV file: "${path}"`);
  }
  let offset = 12;
  let sampleRate = 0;
  let channels = 0;
  let bitsPerSample = 0;
  let data: Buffer | undefined;
  while (offset + 8 <= bytes.length) {
    const chunkId = bytes.toString('ascii', offset, offset + 4);
    const chunkSize = bytes.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (chunkId === 'fmt ') {
      sampleRate = bytes.readUInt32LE(body + 4);
      channels = bytes.readUInt16LE(body + 2);
      bitsPerSample = bytes.readUInt16LE(body + 14);
    } else if (chunkId === 'data') {
      data = bytes.subarray(body, body + chunkSize);
    }
    offset = body + chunkSize + (chunkSize % 2);
  }
  if (sampleRate === 0 || channels === 0 || data === undefined) {
    throw new Error(`unsupported WAV layout: "${path}"`);
  }
  const frames = Math.floor(data.length / (channels * (bitsPerSample / 8)));
  const samples = new Float64Array(frames);
  for (let frame = 0; frame < frames; frame++) {
    let mixed = 0;
    for (let channel = 0; channel < channels; channel++) {
      const at = frame * channels * (bitsPerSample / 8) + channel * (bitsPerSample / 8);
      if (bitsPerSample === 16) mixed += data.readInt16LE(at) / 32768;
      else if (bitsPerSample === 8) mixed += (data[at] - 128) / 128;
      else throw new Error(`unsupported bit depth ${bitsPerSample}: "${path}"`);
    }
    samples[frame] = mixed / channels;
  }
  return { samples, sampleRate };
}

export function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** Dominant frequency of a window via autocorrelation (works for squares too). */
export function dominantFrequency(samples: Float64Array, sampleRate: number): number | undefined {
  const minLag = Math.max(1, Math.floor(sampleRate / 4000));
  const maxLag = Math.min(samples.length - 1, Math.ceil(sampleRate / 50));
  let energy = 0;
  for (let i = 0; i < samples.length; i++) energy += samples[i] * samples[i];
  if (energy === 0) return undefined;
  const correlations: number[] = [];
  let bestLag = minLag;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let value = 0;
    for (let i = 0; i + lag < samples.length; i++) value += samples[i] * samples[i + lag];
    correlations.push(value);
    if (value > correlations[bestLag - minLag]) bestLag = lag;
  }
  // Parabolic interpolation around the peak for sub-sample period accuracy.
  const at = (lag: number): number => correlations[lag - minLag] ?? Number.NEGATIVE_INFINITY;
  const previous = at(bestLag - 1);
  const current = at(bestLag);
  const next = at(bestLag + 1);
  const denominator = previous - 2 * current + next;
  const shift = denominator === 0 ? 0 : (0.5 * (previous - next)) / denominator;
  return sampleRate / (bestLag + Math.max(-1, Math.min(1, shift)));
}

function rms(samples: Float64Array, from: number, to: number): number {
  let sum = 0;
  let count = 0;
  for (let i = Math.max(0, from); i < Math.min(samples.length, to); i++) {
    sum += samples[i] * samples[i];
    count++;
  }
  return count === 0 ? 0 : Math.sqrt(sum / count);
}

/** First energy rise near the expected onset, or the expectation when legato. */
function detectOnset(audio: PcmAudio, expectedSeconds: number, frameSeconds: number): number {
  // Search ±4 frames so shifts beyond the 1-frame tolerance are still found.
  const span = Math.ceil(4 * frameSeconds * audio.sampleRate);
  const center = Math.floor(expectedSeconds * audio.sampleRate);
  let peak = 0;
  for (let i = center - span; i < center + span; i += 8) {
    peak = Math.max(peak, rms(audio.samples, i, i + 64));
  }
  if (peak === 0) return expectedSeconds;
  const threshold = peak * 0.1;
  // Legato: the previous note still rings just before this onset, so no
  // energy rise exists to find — hold the scored onset instead of blaming
  // the window edge.
  if (rms(audio.samples, center - span, center) >= threshold) return expectedSeconds;
  for (let i = center - span; i < center + span; i += 8) {
    if (rms(audio.samples, i, i + 64) >= threshold) return i / audio.sampleRate;
  }
  return expectedSeconds;
}

/**
 * Verify rendered audio against scored segments. Every segment pitch must
 * land within half a semitone (octave-tolerant for pulse waves); every
 * onset within one NES frame of its scored position. Legato onsets (no
 * energy dip) hold the scored position. Total duration must land within
 * one frame per segment count when provided.
 */
export function verifyWav(
  audio: PcmAudio,
  expected: ExpectedSegment[],
  frameSeconds: number = NES_FRAME_SECONDS,
  expectedTotalSeconds?: number,
): VerifyResult {
  const details: string[] = [];
  let passed = true;
  for (const segment of expected) {
    const start = Math.floor(segment.onsetSeconds * audio.sampleRate);
    const end = Math.floor((segment.onsetSeconds + segment.durationSeconds) * audio.sampleRate);
    const probe = audio.samples.subarray(
      Math.min(audio.samples.length - 1, start + Math.floor((end - start) / 3)),
      Math.min(audio.samples.length, start + Math.floor((2 * (end - start)) / 3)),
    );
    const frequency = probe.length > 64 ? dominantFrequency(probe, audio.sampleRate) : undefined;
    const wanted = midiToFrequency(segment.midi);
    if (frequency === undefined) {
      passed = false;
      details.push(`segment @${segment.onsetSeconds}s: silence, wanted MIDI ${segment.midi}`);
      continue;
    }
    // No octave tolerance: render probes show autocorrelation reads true
    // fundamentals on pulse waves, so an octave mismatch is a real bug
    // (it once masked the writer naming an octave high).
    const relativeError = Math.abs(frequency - wanted) / wanted;
    if (relativeError > 0.03) {
      passed = false;
      details.push(`segment @${segment.onsetSeconds}s: ${frequency.toFixed(1)} Hz, wanted ${wanted.toFixed(1)} Hz`);
    }
    const detected = detectOnset(audio, segment.onsetSeconds, frameSeconds);
    if (Math.abs(detected - segment.onsetSeconds) > frameSeconds) {
      passed = false;
      details.push(`segment @${segment.onsetSeconds}s: onset off by ${Math.abs(detected - segment.onsetSeconds) * 1000} ms`);
    }
  }
  if (expectedTotalSeconds !== undefined) {
    const actualTotal = audio.samples.length / audio.sampleRate;
    const tolerance = frameSeconds * Math.max(1, expected.length);
    if (Math.abs(actualTotal - expectedTotalSeconds) > tolerance) {
      passed = false;
      details.push(`total ${actualTotal.toFixed(3)} s, wanted ${expectedTotalSeconds.toFixed(3)} s`);
    }
  }
  if (passed) details.push(`all ${expected.length} segment(s) match pitch and onset`);
  return { passed, details };
}

/** Read a WAV file and verify it against scored segments. */
export function verifyWavFile(path: string, expected: ExpectedSegment[], expectedTotalSeconds?: number): VerifyResult {
  const audio = readWavFile(path);
  return verifyWav(audio, expected, NES_FRAME_SECONDS, expectedTotalSeconds);
}

/** iNES header constants for NES ROM validation. */
export const INES_MAGIC = 'NES\x1A';
const INES_HEADER_BYTES = 16;
const INES_PRG_BANK_BYTES = 16384;
const INES_CHR_BANK_BYTES = 8192;
const INES_TRAINER_BYTES = 512;

/**
 * Verify NES ROM bytes as a legacy iNES image (no hardcoded size or mapper,
 * so larger future ROMs pass). Rules: at least a 16-byte header starting
 * with the `NES\x1A` magic, at least one PRG ROM bank (CHR count may be 0:
 * CHR RAM is legal), no NES 2.0 indicator, and an actual size equal to the
 * header plus any trainer plus the declared PRG and CHR bank sizes.
 */
export function verifyNes(bytes: Uint8Array): VerifyResult {
  const details: string[] = [];
  if (bytes.length < INES_HEADER_BYTES) {
    return { passed: false, details: [`ROM is ${bytes.length} bytes, shorter than the 16-byte iNES header`] };
  }
  const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  if (magic !== INES_MAGIC) {
    return { passed: false, details: ['ROM lacks the iNES magic "NES\\x1A"'] };
  }
  if ((bytes[7] & 0x0c) === 0x08) {
    return { passed: false, details: ['ROM uses the NES 2.0 header format, which is unsupported'] };
  }
  const prgBanks = bytes[4];
  const chrBanks = bytes[5];
  if (prgBanks === 0) {
    return { passed: false, details: ['ROM declares zero PRG ROM banks'] };
  }
  const trainer = (bytes[6] & 0x04) !== 0 ? INES_TRAINER_BYTES : 0;
  const expected = INES_HEADER_BYTES + trainer + prgBanks * INES_PRG_BANK_BYTES + chrBanks * INES_CHR_BANK_BYTES;
  if (bytes.length !== expected) {
    details.push(`ROM is ${bytes.length} bytes but its header declares ${expected} bytes`);
    return { passed: false, details };
  }
  details.push(`valid iNES image: ${prgBanks} PRG bank(s), ${chrBanks} CHR bank(s)${trainer > 0 ? ', trainer present' : ''}`);
  return { passed: true, details };
}

/**
 * Read a NES ROM file and validate its iNES header and size. Read failures
 * return `passed: false` instead of throwing, matching the `VerifyResult`
 * contract used by the CLI.
 */
export function verifyNesFile(path: string): VerifyResult {
  try {
    return verifyNes(readFileSync(path));
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error);
    return { passed: false, details: [`cannot read ROM file "${path}": ${cause}`] };
  }
}
