import { describe, expect, it } from 'vitest';
import { parseScore } from './parse.js';
import { beatUnitQuarters, bpmAt, buildTempoMap, DEFAULT_TEMPO_BPM } from './tempo.js';

const SCORE = (body: string): string =>
  `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><part-list><score-part id="P1"><part-name>M</part-name></score-part></part-list><part id="P1">${body}</part></score-partwise>`;

const ATTRS = `<attributes><divisions>1</divisions></attributes>`;
const NOTE = `<note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration></note>`;

describe('tempo map', () => {
  it('reads <sound tempo> at the measure', () => {
    const xml = SCORE(
      `<measure number="1">${ATTRS}<direction><direction-type><metronome>` +
        `<beat-unit>half</beat-unit><per-minute>60</per-minute>` +
        `</metronome></direction-type><sound tempo="120"/></direction>${NOTE}</measure>`,
    );
    const { tempoMap } = parseScore(xml);
    expect(tempoMap.usedDefault).toBe(false);
    expect(tempoMap.marks).toEqual([{ measureOrdinal: 0, bpm: 120, source: 'sound' }]);
  });

  it('scales a non-quarter metronome to quarter-note BPM', () => {
    const xml = SCORE(
      `<measure number="1">${ATTRS}<direction><direction-type><metronome>` +
        `<beat-unit>half</beat-unit><beat-unit-dot/><per-minute>80</per-minute>` +
        `</metronome></direction-type></direction>${NOTE}</measure>`,
    );
    const { tempoMap } = parseScore(xml);
    expect(tempoMap.marks).toEqual([{ measureOrdinal: 0, bpm: 240, source: 'metronome' }]);
  });

  it('tracks tempo changes across measures with bpmAt', () => {
    const xml = SCORE(
      `<measure number="1">${ATTRS}<sound tempo="90"/>${NOTE}</measure>` +
        `<measure number="2"><sound tempo="140"/>${NOTE}</measure>`,
    );
    const { tempoMap } = parseScore(xml);
    expect(bpmAt(tempoMap, 0)).toBe(90);
    expect(bpmAt(tempoMap, 1)).toBe(140);
    expect(bpmAt(tempoMap, 7)).toBe(140);
  });

  it('defaults to 120 with usedDefault when no tempo is marked', () => {
    const xml = SCORE(`<measure number="1">${ATTRS}${NOTE}</measure>`);
    const { tempoMap } = parseScore(xml);
    expect(tempoMap.usedDefault).toBe(true);
    expect(tempoMap.marks).toEqual([]);
    expect(bpmAt(tempoMap, 0)).toBe(DEFAULT_TEMPO_BPM);
  });

  it('rejects a non-positive sound tempo with the location', () => {
    const xml = SCORE(`<measure number="3">${ATTRS}<sound tempo="0"/>${NOTE}</measure>`);
    expect(() => parseScore(xml)).toThrowError(/invalid <sound tempo>.*part "P1", measure "3"/);
  });
});

describe('beatUnitQuarters', () => {
  it('handles dotted units', () => {
    expect(beatUnitQuarters('quarter', 0)).toBe(1);
    expect(beatUnitQuarters('quarter', 1)).toBe(1.5);
    expect(beatUnitQuarters('half', 0)).toBe(2);
    expect(beatUnitQuarters('nonsense', 0)).toBeUndefined();
  });

  it('resolves an empty map to the default', () => {
    const map = buildTempoMap([]);
    expect(map.usedDefault).toBe(true);
    expect(bpmAt(map, 4)).toBe(120);
  });
});
