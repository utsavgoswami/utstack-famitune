import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import { MusicXmlParseError, parseMusicXml, parseScore, type MusicEvent } from './parse.js';
import { DEFAULT_TEMPO_BPM, type TempoMap } from './tempo.js';
import { createReport, type ConversionReport } from '../report/report.js';
import { splitIntoStreams, type Stream } from './streams.js';
import { mergeTies } from './ties.js';

const feature = await loadFeature(join(import.meta.dirname, '../../features/parse.feature'));

const TIMEWISE_SCORE = `<?xml version="1.0" encoding="UTF-8"?>
<score-timewise version="4.0">
  <part-list>
    <score-part id="P1">
      <part-name>Music</part-name>
    </score-part>
  </part-list>
  <measure number="1">
    <part id="P1">
      <attributes>
        <divisions>1</divisions>
      </attributes>
    </part>
  </measure>
</score-timewise>
`;

describeFeature(feature, ({ Scenario }) => {
  Scenario('Hello World score converts', ({ Given, When, Then }) => {
    let xml = '';
    let events: MusicEvent[] = [];

    Given('the Hello World fixture', () => {
      xml = readFileSync(join(import.meta.dirname, '../../fixtures/hello-world.musicxml'), 'utf8');
    });

    When('the converter parses the fixture', () => {
      events = parseMusicXml(xml);
    });

    Then(
      'the parse yields one C4 event with MIDI pitch 60, onset 0, and duration 4 quarter notes',
      () => {
        expect(events).toHaveLength(1);
        const event = events[0];
        expect(event.kind).toBe('note');
        if (event.kind !== 'note') throw new Error('expected a note event');
        expect(event.midi).toBe(60);
        expect(event.onsetQuarters).toBe(0);
        expect(event.durationQuarters).toBe(4);
      },
    );
  });

  Scenario('Timewise score is rejected', ({ Given, When, Then }) => {
    let xml = '';
    let error: unknown;

    Given('a timewise score', () => {
      xml = TIMEWISE_SCORE;
    });

    When('the converter parses the score', () => {
      try {
        parseMusicXml(xml);
      } catch (err) {
        error = err;
      }
    });

    Then('parsing fails stating the layout is unsupported', () => {
      expect(error).toBeInstanceOf(MusicXmlParseError);
      expect((error as Error).message).toMatch(/timewise/i);
    });
  });

  Scenario('Two voices in one staff split into two streams', ({ Given, When, Then }) => {
    let xml = '';
    let streams: Stream[] = [];

    Given('a measure with two voices', () => {
      xml =
        `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0">` +
        `<part-list><score-part id="P1"><part-name>M</part-name></score-part></part-list>` +
        `<part id="P1"><measure number="1">` +
        `<attributes><divisions>2</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>` +
        `<note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice></note>` +
        `<note><pitch><step>D</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice></note>` +
        `<backup><duration>4</duration></backup>` +
        `<note><pitch><step>E</step><octave>3</octave></pitch><duration>2</duration><voice>2</voice></note>` +
        `<note><pitch><step>F</step><octave>3</octave></pitch><duration>2</duration><voice>2</voice></note>` +
        `</measure></part></score-partwise>`;
    });

    When('the converter parses the measure and splits streams', () => {
      streams = splitIntoStreams(parseMusicXml(xml));
    });

    Then('each voice forms one stream with onsets 0 and 1 quarter notes', () => {
      expect(streams).toHaveLength(2);
      expect(streams[0].id.voice).toBe('1');
      expect(streams[1].id.voice).toBe('2');
      for (const stream of streams) {
        expect(stream.events.map((e) => e.onsetQuarters)).toEqual([0, 1]);
      }
      expect(streams[0].events.map((e) => (e.kind === 'note' ? e.midi : -1))).toEqual([60, 62]);
      expect(streams[1].events.map((e) => (e.kind === 'note' ? e.midi : -1))).toEqual([52, 53]);
    });
  });

  Scenario('Chord onset keeps three pitches in one stream', ({ Given, When, Then }) => {
    let xml = '';
    let streams: Stream[] = [];

    Given('a measure with a three-note chord', () => {
      xml =
        `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0">` +
        `<part-list><score-part id="P1"><part-name>M</part-name></score-part></part-list>` +
        `<part id="P1"><measure number="1">` +
        `<attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>` +
        `<note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>` +
        `<note><chord/><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>` +
        `<note><chord/><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>` +
        `<note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>` +
        `</measure></part></score-partwise>`;
    });

    When('the converter parses the measure and splits streams', () => {
      streams = splitIntoStreams(parseMusicXml(xml));
    });

    Then('one stream holds three pitches at onset 0', () => {
      expect(streams).toHaveLength(1);
      const onsets = streams[0].events.map((e) => e.onsetQuarters);
      expect(onsets).toEqual([0, 0, 0, 1]);
      expect(streams[0].events.map((e) => (e.kind === 'note' ? e.midi : -1))).toEqual([60, 64, 67, 69]);
    });
  });

  Scenario('Tied notes merge', ({ Given, When, Then }) => {
    let xml = '';
    let events: MusicEvent[] = [];

    Given('a tie across a barline', () => {
      xml =
        `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0">` +
        `<part-list><score-part id="P1"><part-name>M</part-name></score-part></part-list>` +
        `<part id="P1">` +
        `<measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>` +
        `<note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><tie type="start"/></note>` +
        `</measure><measure number="2">` +
        `<note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><tie type="stop"/></note>` +
        `</measure></part></score-partwise>`;
    });

    When('the converter parses and merges ties', () => {
      events = mergeTies(parseMusicXml(xml));
    });

    Then('one note sounds with the summed duration', () => {
      expect(events).toHaveLength(1);
      const event = events[0];
      expect(event.kind).toBe('note');
      if (event.kind !== 'note') throw new Error('expected a note event');
      expect(event.midi).toBe(60);
      expect(event.onsetQuarters).toBe(0);
      expect(event.durationQuarters).toBe(2);
    });
  });

  Scenario('Marked tempo enters the tempo map', ({ Given, When, Then }) => {
    let xml = '';
    let tempoMap: TempoMap | undefined;

    Given('a score marking tempo 120', () => {
      xml =
        `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0">` +
        `<part-list><score-part id="P1"><part-name>M</part-name></score-part></part-list>` +
        `<part id="P1"><measure number="1">` +
        `<attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>` +
        `<direction><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>120</per-minute></metronome></direction-type></direction>` +
        `<note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration></note>` +
        `</measure></part></score-partwise>`;
    });

    When('the converter parses the score', () => {
      tempoMap = parseScore(xml).tempoMap;
    });

    Then('the tempo map holds 120 at measure 0 without the default', () => {
      expect(tempoMap?.usedDefault).toBe(false);
      expect(tempoMap?.marks).toEqual([{ measureOrdinal: 0, bpm: 120, source: 'metronome' }]);
    });
  });

  Scenario('Missing tempo warns and defaults', ({ Given, When, Then }) => {
    let xml = '';
    let tempoMap: TempoMap | undefined;

    Given('a score with no tempo marking', () => {
      xml = readFileSync(join(import.meta.dirname, '../../fixtures/hello-world.musicxml'), 'utf8');
    });

    When('the converter parses the score', () => {
      tempoMap = parseScore(xml).tempoMap;
    });

    Then('the tempo map uses the default tempo and flags it', () => {
      expect(tempoMap?.usedDefault).toBe(true);
      expect(tempoMap?.marks).toEqual([]);
      expect(tempoMap?.defaultBpm).toBe(DEFAULT_TEMPO_BPM);
    });
  });

  Scenario('Unhandled construct is logged', ({ Given, When, Then }) => {
    let xml = '';
    let events: MusicEvent[] = [];
    let report: ConversionReport | undefined;

    Given('a score with a grace note', () => {
      xml =
        `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0">` +
        `<part-list><score-part id="P1"><part-name>M</part-name></score-part></part-list>` +
        `<part id="P1"><measure number="1">` +
        `<attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>` +
        `<note><grace slash="yes"/><pitch><step>D</step><octave>4</octave></pitch></note>` +
        `<note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration></note>` +
        `</measure></part></score-partwise>`;
    });

    When('the converter parses the score and builds the report', () => {
      const parsed = parseScore(xml);
      events = parsed.events;
      report = createReport({
        unhandled: parsed.unhandled,
        tempoUsedDefault: parsed.tempoMap.usedDefault,
        enharmonicRespellings: parsed.enharmonicRespellings,
      });
    });

    Then('conversion completes for supported content and the report names the unhandled construct', () => {
      expect(events).toHaveLength(1);
      expect(events[0].kind).toBe('note');
      expect(report?.unhandled.map((u) => u.construct)).toEqual(['grace-note']);
    });
  });
});
