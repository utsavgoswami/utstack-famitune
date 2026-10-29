import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import { parseScore } from '../parse/parse.js';
import { formatReport } from '../report/report.js';
import { convertScoreToText } from './write.js';

const feature = await loadFeature(join(import.meta.dirname, '../../features/write.feature'));

const FIXTURE = join(import.meta.dirname, '../../fixtures/hello-world.musicxml');
const GOLDEN = join(import.meta.dirname, '../../fixtures/golden-hello-world.txt');

const SCORE = (body: string): string =>
  `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0">` +
  `<part-list><score-part id="P1"><part-name>M</part-name></score-part></part-list>` +
  `<part id="P1"><measure number="1"><attributes><divisions>1</divisions>` +
  `<time><beats>4</beats><beat-type>4</beat-type></time></attributes>${body}</measure></part></score-partwise>`;

describeFeature(feature, ({ Scenario }) => {
  Scenario('Hello World matches the golden file', ({ Given, When, Then }) => {
    let xml = '';
    let text = '';

    Given('the Hello World fixture', () => {
      xml = readFileSync(FIXTURE, 'utf8');
    });

    When('the converter emits FamiStudio Text', () => {
      text = convertScoreToText('Hello World', parseScore(xml)).text;
    });

    Then('the output is byte-identical to the golden file', () => {
      expect(text).toBe(readFileSync(GOLDEN, 'utf8'));
    });
  });

  Scenario('Repeat conversion is identical', ({ Given, When, Then }) => {
    let xml = '';
    let first = '';
    let second = '';

    Given('the Hello World fixture', () => {
      xml = readFileSync(FIXTURE, 'utf8');
    });

    When('the converter emits FamiStudio Text twice', () => {
      first = convertScoreToText('Hello World', parseScore(xml)).text;
      second = convertScoreToText('Hello World', parseScore(xml)).text;
    });

    Then('both outputs are byte-identical', () => {
      expect(second).toBe(first);
    });
  });

  Scenario('Middle C converts exactly', ({ Given, When, Then }) => {
    let xml = '';
    let text = '';

    Given('a score containing C4', () => {
      xml = SCORE(`<note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration></note>`);
    });

    When('the converter emits FamiStudio Text', () => {
      text = convertScoreToText('Middle C', parseScore(xml)).text;
    });

    Then('the output contains a note named C3 at the corresponding position', () => {
      expect(text).toContain('Value="C3"');
      expect(text).toMatch(/Note Time="0" Value="C3"/);
    });
  });

  Scenario('Flat converts to its sharp equivalent', ({ Given, When, Then }) => {
    let xml = '';
    let text = '';
    let reportText = '';
    let respellings = 0;

    Given('a score containing E-flat in octave 4', () => {
      xml = SCORE(
        `<note><pitch><step>E</step><alter>-1</alter><octave>4</octave></pitch><duration>4</duration></note>`,
      );
    });

    When('the converter emits FamiStudio Text', () => {
      const result = convertScoreToText('Flat', parseScore(xml));
      text = result.text;
      respellings = result.report.enharmonicRespellings;
      reportText = formatReport(result.report);
    });

    Then('the output contains a note named D#3 and the conversion report notes the respelling', () => {
      expect(text).toContain('Value="D#3"');
      expect(text).not.toContain('Eb');
      expect(respellings).toBe(1);
      expect(reportText).toMatch(/Enharmonic respellings: 1/);
    });
  });
});
