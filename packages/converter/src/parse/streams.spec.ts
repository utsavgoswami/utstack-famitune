import { describe, expect, it } from 'vitest';
import { parseMusicXml } from './parse.js';
import { splitIntoStreams } from './streams.js';

const SCORE = (measure: string): string =>
  `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><part-list><score-part id="P1"><part-name>M</part-name></score-part></part-list><part id="P1">${measure}</part></score-partwise>`;

describe('splitIntoStreams', () => {
  it('splits staves into separate streams', () => {
    const xml = SCORE(
      `<measure number="1"><attributes><divisions>1</divisions></attributes>` +
        `<note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><staff>1</staff></note>` +
        `<note><pitch><step>E</step><octave>2</octave></pitch><duration>1</duration><staff>2</staff></note></measure>`,
    );
    const streams = splitIntoStreams(parseMusicXml(xml));
    expect(streams).toHaveLength(2);
    expect(streams[0].id.staff).toBe(1);
    expect(streams[1].id.staff).toBe(2);
  });

  it('orders streams deterministically by part, staff, then voice', () => {
    const xml = SCORE(
      `<measure number="1"><attributes><divisions>1</divisions></attributes>` +
        `<note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><staff>2</staff><voice>2</voice></note>` +
        `<note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><staff>1</staff><voice>2</voice></note>` +
        `<note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><staff>1</staff><voice>1</voice></note></measure>`,
    );
    const order = splitIntoStreams(parseMusicXml(xml)).map((s) => `${s.id.staff}/${s.id.voice}`);
    expect(order).toEqual(['1/1', '1/2', '2/2']);
  });
});
