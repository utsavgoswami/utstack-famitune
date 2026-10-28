import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import { parseScore } from '../parse/parse.js';
import { convertScoreToText } from '../emit/emit.js';
import { isFamiStudioAvailable, renderOutputs } from './render.js';
import { verifyWavFile } from './verify.js';

const feature = await loadFeature(join(import.meta.dirname, '../../features/render.feature'));

describeFeature(feature, ({ Scenario }) => {
  Scenario('Hello World renders one audible pitch', ({ Given, When, Then }) => {
    let dir = '';
    let wavPath = '';
    let skipped = false;
    let actualBpm = 120;

    Given('the Hello World FamiStudio Text', () => {
      dir = mkdtempSync(join(tmpdir(), 'famitune-render-'));
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
      wavPath = (await renderOutputs(join(dir, 'hello.txt'), dir)).wavPath;
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
});
