import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseScore } from '../parse/parse.js';
import { createReport, emptyReport, formatReport } from './report.js';

const SCORE = (body: string): string =>
  `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><part-list><score-part id="P1"><part-name>M</part-name></score-part></part-list><part id="P1">${body}</part></score-partwise>`;

describe('conversion report skeleton', () => {
  it('flags the missing-tempo warning from the tempo map', () => {
    const withTempo = createReport({ unhandled: [], tempoUsedDefault: false });
    expect(withTempo.missingTempoWarning).toBe(false);
    const withoutTempo = createReport({ unhandled: [], tempoUsedDefault: true });
    expect(withoutTempo.missingTempoWarning).toBe(true);
    expect(formatReport(withoutTempo)).toMatch(/no tempo marking/);
  });

  it('names each unhandled construct with its location', () => {
    const report = createReport({
      unhandled: [{ construct: 'grace-note', part: 'P1', measure: '2' }],
      tempoUsedDefault: false,
    });
    expect(formatReport(report)).toContain('grace-note (part "P1", measure "2")');
  });

  it('renders cleanly when nothing is unhandled', () => {
    expect(formatReport(emptyReport())).toContain('Unhandled constructs: none');
  });
});

describe('zero silent drops', () => {
  it('logs every grace note, unpitched note, fractional alter, and repeat in every fixture', () => {
    const dir = join(import.meta.dirname, '../../fixtures');
    const fixtures = readdirSync(dir).filter((f) => f.endsWith('.musicxml'));
    expect(fixtures.length).toBeGreaterThan(0);
    for (const fixture of fixtures) {
      const xml = readFileSync(join(dir, fixture), 'utf8');
      const { unhandled } = parseScore(xml);
      const count = (construct: string): number => unhandled.filter((u) => u.construct === construct).length;
      expect({ fixture, grace: count('grace-note'), raw: (xml.match(/<grace[\s/>]/g) ?? []).length }).toMatchObject({
        grace: (xml.match(/<grace[\s/>]/g) ?? []).length,
      });
      expect(count('unpitched')).toBe((xml.match(/<unpitched[\s/>]/g) ?? []).length);
      expect(count('repeat')).toBe((xml.match(/<repeat[\s/>]/g) ?? []).length);
      const fractionalAlters = (xml.match(/<alter>([^<]*)<\/alter>/g) ?? []).filter(
        (m) => !Number.isInteger(Number(m.replace(/<\/?alter>/g, ''))),
      );
      expect(count('fractional-alter')).toBe(fractionalAlters.length);
    }
  });

  it('keeps supported content while logging the rest', () => {
    const xml = SCORE(
      `<measure number="1"><attributes><divisions>1</divisions></attributes>` +
        `<note><grace/><pitch><step>D</step><octave>4</octave></pitch></note>` +
        `<note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration></note>` +
        `<note><unpitched><display-step>C</display-step><display-octave>4</display-octave></unpitched><duration>1</duration><instrument id="P1-I1"/></note>` +
        `<note><pitch><step>E</step><alter>0.5</alter><octave>4</octave></pitch><duration>1</duration></note>` +
        `<barline><bar-style>light-heavy</bar-style><repeat direction="backward"/></barline></measure>`,
    );
    const { events, unhandled } = parseScore(xml);
    expect(events.map((e) => (e.kind === 'note' ? e.midi : 'rest'))).toEqual([60, 64.5]);
    expect(unhandled.map((u) => u.construct).sort()).toEqual([
      'fractional-alter',
      'grace-note',
      'repeat',
      'unpitched',
    ]);
  });
});
