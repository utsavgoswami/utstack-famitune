import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import { parseScore } from '../parse/parse.js';
import { convertScoreToText } from '../write/write.js';
import { isFamiStudioAvailable, exportOutputs } from './export.js';
import { hasAudibleGapInFile, verifyNesFile, verifyWavFile } from './verify.js';

const feature = await loadFeature(join(import.meta.dirname, '../../features/export.feature'));

describeFeature(feature, ({ Scenario }) => {
  Scenario('Hello World renders one audible pitch', ({ Given, When, Then }) => {
    let dir = '';
    let wavPath = '';
    let skipped = false;
    let actualBpm = 120;

    Given('the Hello World FamiStudio Text', () => {
      dir = mkdtempSync(join(tmpdir(), 'famitune-export-'));
      const xml = readFileSync(join(import.meta.dirname, '../../fixtures/hello-world.musicxml'), 'utf8');
      const { text, report } = convertScoreToText('Hello World', parseScore(xml));
      actualBpm = report.actualBpm;
      writeFileSync(join(dir, 'hello.txt'), text);
    });

    When('the pinned build renders WAV output', async () => {
      // Tag gate: without the FamiStudio binary this scenario skips
      // without error; CI runs every other feature.
      if (!(await isFamiStudioAvailable())) {
        skipped = true;
        return;
      }
      wavPath = (await exportOutputs(join(dir, 'hello.txt'), dir)).wavPath;
    });

    Then('the WAV contains a single sustained pitch corresponding to C4 for the expected duration', () => {
      if (skipped) return;
      const quarterSeconds = 60 / actualBpm;
      const result = verifyWavFile(
        wavPath,
        [{ midi: 60, onsetSeconds: 0, durationSeconds: 4 * quarterSeconds }],
        4 * quarterSeconds,
      );
      expect(result.passed, `${wavPath}: ${result.details.join('; ')}`).toBe(true);
    });
  });

  Scenario('Repeated notes export with an audible gap', ({ Given, When, Then, And }) => {
    let dir = '';
    let wavPath = '';
    let skipped = false;

    Given('the Repeated Notes FamiStudio Text', () => {
      dir = mkdtempSync(join(tmpdir(), 'famitune-export-'));
      const xml = readFileSync(join(import.meta.dirname, '../../fixtures/repeated-notes.musicxml'), 'utf8');
      const { text } = convertScoreToText('Repeated Notes', parseScore(xml));
      writeFileSync(join(dir, 'repeated.txt'), text);
    });

    When('the pinned build exports WAV output from the Repeated Notes text', async () => {
      if (!(await isFamiStudioAvailable())) {
        skipped = true;
        return;
      }
      wavPath = (await exportOutputs(join(dir, 'repeated.txt'), dir)).wavPath;
    });

    Then('the WAV has a gap before the repeated note at 1 second', () => {
      if (skipped) return;
      expect(hasAudibleGapInFile(wavPath, 1.0), `${wavPath}: no gap at 1s`).toBe(true);
    });

    And('the WAV has no gap inside the tied note at 6 seconds', () => {
      if (skipped) return;
      expect(hasAudibleGapInFile(wavPath, 6.0), `${wavPath}: gap at 6s`).toBe(false);
    });
  });

  Scenario('Hello World exports a valid NES ROM', ({ Given, When, Then }) => {
    let dir = '';
    let nesPath = '';
    let skipped = false;

    Given('the Hello World FamiStudio Text', () => {
      dir = mkdtempSync(join(tmpdir(), 'famitune-export-'));
      const xml = readFileSync(join(import.meta.dirname, '../../fixtures/hello-world.musicxml'), 'utf8');
      const { text } = convertScoreToText('Hello World', parseScore(xml));
      writeFileSync(join(dir, 'hello.txt'), text);
    });

    When('the pinned build exports a NES ROM', async () => {
      // Tag gate: without the FamiStudio binary this scenario skips
      // without error; CI runs every other feature.
      if (!(await isFamiStudioAvailable())) {
        skipped = true;
        return;
      }
      nesPath = (await exportOutputs(join(dir, 'hello.txt'), dir)).nesPath;
    });

    Then('the ROM passes iNES validation', () => {
      if (skipped) return;
      const result = verifyNesFile(nesPath);
      expect(result.passed, `${nesPath}: ${result.details.join('; ')}`).toBe(true);
    });
  });
});
