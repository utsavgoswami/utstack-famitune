import { describe, expect, it } from 'vitest';
import { parseMusicXml } from './parse.js';
import { mergeTies } from './ties.js';

const SCORE = (body: string): string =>
  `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><part-list><score-part id="P1"><part-name>M</part-name></score-part></part-list><part id="P1">${body}</part></score-partwise>`;

const MEASURE = (n: string, inner: string): string => `<measure number="${n}">${inner}</measure>`;
const ATTRS = `<attributes><divisions>1</divisions></attributes>`;
const NOTE = (pitch: string, duration: string, ties = ''): string =>
  `<note><pitch><step>${pitch}</step><octave>4</octave></pitch><duration>${duration}</duration>${ties}</note>`;

describe('mergeTies', () => {
  it('merges a three-note chain by summing durations', () => {
    const xml = SCORE(
      MEASURE('1', ATTRS + NOTE('C', '1', '<tie type="start"/>')) +
        MEASURE('2', NOTE('C', '1', '<tie type="start"/><tie type="stop"/>')) +
        MEASURE('3', NOTE('C', '2', '<tie type="stop"/>')),
    );
    const merged = mergeTies(parseMusicXml(xml));
    expect(merged).toHaveLength(1);
    const event = merged[0];
    expect(event.kind).toBe('note');
    if (event.kind !== 'note') throw new Error('expected a note event');
    expect(event.midi).toBe(60);
    expect(event.onsetQuarters).toBe(0);
    expect(event.durationQuarters).toBe(4);
  });

  it('keeps notes separate across a pitch change or a rest', () => {
    const xml = SCORE(
      MEASURE(
        '1',
        ATTRS +
          NOTE('C', '1', '<tie type="start"/>') +
          NOTE('D', '1', '<tie type="stop"/>') +
          NOTE('D', '1', '<tie type="start"/>') +
          `<note><rest/><duration>1</duration></note>` +
          NOTE('D', '1', '<tie type="stop"/>'),
      ),
    );
    const merged = mergeTies(parseMusicXml(xml));
    expect(merged.map((e) => (e.kind === 'note' ? e.durationQuarters : `rest:${e.durationQuarters}`))).toEqual([
      1,
      1,
      1,
      'rest:1',
      1,
    ]);
  });

  it('keeps an orphan stop without fusing it into an untied note', () => {
    const xml = SCORE(MEASURE('1', ATTRS + NOTE('C', '1') + NOTE('C', '1', '<tie type="stop"/>')));
    const merged = mergeTies(parseMusicXml(xml));
    expect(merged).toHaveLength(2);
  });
});
