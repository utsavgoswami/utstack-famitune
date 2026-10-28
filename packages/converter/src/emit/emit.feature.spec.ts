import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import { parseScore } from '../parse/parse.js';
import { convertScoreToText } from './emit.js';

const feature = await loadFeature(join(import.meta.dirname, '../../features/emit.feature'));

const FIXTURE = join(import.meta.dirname, '../../fixtures/hello-world.musicxml');
const GOLDEN = join(import.meta.dirname, '../../fixtures/golden-hello-world.txt');

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
});
