import { join } from 'node:path';
import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import { parseScore } from '../parse/parse.js';
import type { ConversionReport } from '../report/report.js';
import { convertPiece } from './convert.js';
import type { StreamPattern } from './patterns.js';
import type { QuantizedPiece } from './quantize.js';

const feature = await loadFeature(join(import.meta.dirname, '../../features/convert.feature'));

const SCORE = (divisions: string, body: string): string =>
  `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0">` +
  `<part-list><score-part id="P1"><part-name>M</part-name></score-part></part-list>` +
  `<part id="P1"><measure number="1"><attributes><divisions>${divisions}</divisions>` +
  `<time><beats>4</beats><beat-type>4</beat-type></time></attributes>${body}</measure></part></score-partwise>`;

const NOTE = (step: string, octave: number, duration: number): string =>
  `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>${duration}</duration></note>`;

const PART = (divisions: string, firstNotes: string, restMeasures: string): string =>
  `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0">` +
  `<part-list><score-part id="P1"><part-name>M</part-name></score-part></part-list>` +
  `<part id="P1"><measure number="1"><attributes><divisions>${divisions}</divisions>` +
  `<time><beats>4</beats><beat-type>4</beat-type></time></attributes>${firstNotes}</measure>${restMeasures}</part></score-partwise>`;

describeFeature(feature, ({ Scenario }) => {
  Scenario('Onsets land on expected rows', ({ Given, When, Then }) => {
    let xml = '';
    let piece: QuantizedPiece | undefined;
    let report: ConversionReport | undefined;

    Given('an eighth-note melody', () => {
      xml = SCORE('4', NOTE('C', 4, 4) + NOTE('D', 4, 2) + NOTE('E', 4, 2) + NOTE('G', 4, 4));
    });

    When('the converter quantizes the melody', () => {
      const converted = convertPiece(parseScore(xml));
      piece = converted.piece;
      report = converted.report;
    });

    Then('onsets land on rows 0, 8, 12, and 16 with no error', () => {
      expect(piece?.rowsPerQuarter).toBe(8);
      expect(piece?.notes.map((n) => n.onsetRow)).toEqual([0, 8, 12, 16]);
      expect(piece?.notes.map((n) => n.durationRows)).toEqual([8, 4, 4, 8]);
      expect(report?.maxOnsetErrorFrames).toBe(0);
    });
  });

  Scenario('Maximum quantization error is reported in frames', ({ Given, When, Then }) => {
    let xml = '';
    let piece: QuantizedPiece | undefined;
    let report: ConversionReport | undefined;

    Given('a melody mixing triplets and sixteenths', () => {
      xml = SCORE('48', NOTE('C', 4, 16) + NOTE('D', 4, 3) + NOTE('E', 4, 3));
    });

    When('the converter quantizes the melody', () => {
      const converted = convertPiece(parseScore(xml));
      piece = converted.piece;
      report = converted.report;
    });

    Then('the report states the maximum onset error in frames', () => {
      expect(piece?.rowsPerQuarter).toBe(16);
      expect(piece?.notes.map((n) => n.onsetRow)).toEqual([0, 5, 6]);
      expect(report?.maxOnsetErrorFrames).toBeCloseTo(0.626, 3);
    });
  });

  Scenario('Marked tempo is realized', ({ Given, When, Then }) => {
    let xml = '';
    let groove: string | undefined;
    let report: ConversionReport | undefined;

    Given('a score marking quarter-note 120 on a 16th grid', () => {
      xml = SCORE('1', NOTE('C', 4, 4));
      xml = xml.replace(
        '</attributes>',
        '</attributes><direction><direction-type><metronome><beat-unit>quarter</beat-unit>' +
          '<per-minute>120</per-minute></metronome></direction-type></direction>',
      );
    });

    When('the converter converts the score', () => {
      const converted = convertPiece(parseScore(xml));
      groove = converted.tempo.groove;
      report = converted.report;
    });

    Then('the song uses a frame groove realized within 1 BPM of 120 as stated in the report', () => {
      expect(groove).toBe('8-7');
      expect(report?.requestedBpm).toBe(120);
      expect(report?.actualBpm).toBeGreaterThan(119);
      expect(report?.actualBpm).toBeLessThan(121);
    });
  });

  Scenario('Two measures chunk into two patterns', ({ Given, When, Then }) => {
    let xml = '';
    let patterns: StreamPattern[] = [];

    Given('a two-measure melody', () => {
      const whole = (step: string): string =>
        `<note><pitch><step>${step}</step><octave>4</octave></pitch><duration>4</duration></note>`;
      xml = PART('1', whole('C'), `<measure number="2">${whole('D')}</measure>`);
    });

    When('the converter chunks the melody into patterns', () => {
      patterns = convertPiece(parseScore(xml)).patterns;
    });

    Then('two patterns hold one measure each', () => {
      expect(patterns.map((p) => p.name)).toEqual(['M001', 'M002']);
      expect(patterns.map((p) => p.lengthRows)).toEqual([16, 16]);
      expect(patterns[0].notes.map((n) => n.row)).toEqual([0]);
      expect(patterns[1].notes.map((n) => n.row)).toEqual([0]);
    });
  });

  Scenario('Pickup measure gets a length override', ({ Given, When, Then }) => {
    let xml = '';
    let patterns: StreamPattern[] = [];

    Given('a melody with a pickup measure', () => {
      const quarter = (step: string): string =>
        `<note><pitch><step>${step}</step><octave>4</octave></pitch><duration>1</duration></note>`;
      const whole = `<note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration></note>`;
      xml = PART('1', `${quarter('C')}${quarter('D')}`, `<measure number="2">${whole}</measure>`);
    });

    When('the converter chunks the melody into patterns', () => {
      patterns = convertPiece(parseScore(xml)).patterns;
    });

    Then('the pickup pattern carries a shorter length', () => {
      expect(patterns).toHaveLength(2);
      expect(patterns[0].lengthRows).toBe(16);
      expect(patterns[0].customLengthRows).toBe(8);
      expect(patterns[1].customLengthRows).toBeUndefined();
    });
  });

  Scenario('Two streams use two channels', ({ Given, When, Then }) => {
    let xml = '';
    let assigned: Array<{ channel: string; instrument: string }> = [];

    Given('a high melody stream and a low bass stream', () => {
      const whole = (step: string, octave: number): string =>
        `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>4</duration></note>`;
      xml =
        `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0">` +
        `<part-list><score-part id="P1"><part-name>Melody</part-name></score-part>` +
        `<score-part id="P2"><part-name>Bass</part-name></score-part></part-list>` +
        `<part id="P1"><measure number="1"><attributes><divisions>1</divisions>` +
        `<time><beats>4</beats><beat-type>4</beat-type></time></attributes>${whole('C', 5)}</measure></part>` +
        `<part id="P2"><measure number="1"><attributes><divisions>1</divisions>` +
        `<time><beats>4</beats><beat-type>4</beat-type></time></attributes>${whole('C', 3)}</measure></part>` +
        `</score-partwise>`;
    });

    When('the converter allocates streams to channels', () => {
      const { allocation } = convertPiece(parseScore(xml));
      assigned = allocation.assigned.map((a) => ({ channel: a.channel, instrument: a.instrument }));
    });

    Then('the melody sounds on Square 1 and the bass on Triangle', () => {
      expect(assigned).toEqual([
        { channel: 'Square1', instrument: 'Lead' },
        { channel: 'Triangle', instrument: 'Bass' },
      ]);
    });
  });

  Scenario('Overflow stream is reported', ({ Given, When, Then }) => {
    let xml = '';
    let channels: string[] = [];
    let report: ConversionReport | undefined;

    Given('four melodic streams', () => {
      const whole = (step: string, octave: number, voice: string): string =>
        `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch>` +
        `<duration>4</duration><voice>${voice}</voice></note>`;
      xml =
        `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0">` +
        `<part-list><score-part id="P1"><part-name>M</part-name></score-part></part-list>` +
        `<part id="P1"><measure number="1"><attributes><divisions>1</divisions>` +
        `<time><beats>4</beats><beat-type>4</beat-type></time></attributes>` +
        `${whole('C', 5, '1')}<backup><duration>4</duration></backup>` +
        `${whole('C', 4, '2')}<backup><duration>4</duration></backup>` +
        `${whole('G', 3, '3')}<backup><duration>4</duration></backup>` +
        `${whole('C', 3, '4')}</measure></part></score-partwise>`;
    });

    When('the converter allocates streams to channels', () => {
      const converted = convertPiece(parseScore(xml));
      channels = converted.allocation.assigned.map((a) => a.channel);
      report = converted.report;
    });

    Then('three streams are converted and the report identifies the dropped stream and its note count', () => {
      expect(channels).toEqual(['Square1', 'Square2', 'Triangle']);
      expect(report?.droppedStreams).toEqual([{ stream: 'part "P1", staff 1, voice "3"', noteCount: 1 }]);
    });
  });

  Scenario('Three-note chord keeps one pitch', ({ Given, When, Then }) => {
    let xml = '';
    let midis: number[] = [];
    let report: ConversionReport | undefined;

    Given('a melody stream with a three-note chord', () => {
      xml =
        `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0">` +
        `<part-list><score-part id="P1"><part-name>M</part-name></score-part></part-list>` +
        `<part id="P1"><measure number="1"><attributes><divisions>1</divisions>` +
        `<time><beats>4</beats><beat-type>4</beat-type></time></attributes>` +
        `<note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>` +
        `<note><chord/><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>` +
        `<note><chord/><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>` +
        `</measure></part></score-partwise>`;
    });

    When('the converter reduces chords', () => {
      const converted = convertPiece(parseScore(xml));
      midis = converted.allocation.assigned.flatMap((a) => a.patterns.flatMap((p) => p.notes.map((n) => n.midi)));
      report = converted.report;
    });

    Then("one pitch sounds on that stream's channel and the report counts two dropped chord tones", () => {
      expect(midis).toEqual([67]);
      expect(report?.chordTonesKept).toBe(1);
      expect(report?.chordTonesDropped).toBe(2);
    });
  });

  Scenario('Rest produces a gap', ({ Given, When, Then }) => {
    let xml = '';
    let piece: QuantizedPiece | undefined;

    Given('a measure with a quarter rest between two notes', () => {
      xml = SCORE(
        '1',
        `<note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration></note>` +
          `<note><rest/><duration>1</duration></note>` +
          `<note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration></note>`,
      );
    });

    When('the converter quantizes the measure', () => {
      piece = convertPiece(parseScore(xml)).piece;
    });

    Then('no note sounds during the rest and the following note starts at the correct position', () => {
      expect(piece?.notes).toHaveLength(2);
      expect(piece?.notes.map((n) => n.onsetRow)).toEqual([0, 8]);
      expect(piece?.notes.map((n) => n.durationRows)).toEqual([4, 4]);
      expect(piece?.notes.map((n) => n.midi)).toEqual([60, 62]);
    });
  });
});
