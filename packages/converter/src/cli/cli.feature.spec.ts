import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import { run } from './cli.js';

const feature = await loadFeature(join(import.meta.dirname, '../../features/cli.feature'));

const HELLO_WORLD = readFileSync(join(import.meta.dirname, '../../fixtures/hello-world.musicxml'), 'utf8');
const TIMEWISE = `<?xml version="1.0" encoding="UTF-8"?><score-timewise version="4.0"></score-timewise>`;

function silentRun(argv: string[]): { code: Promise<number>; out: string[]; err: string[] } {
  const out: string[] = [];
  const err: string[] = [];
  return {
    code: run(argv, {
      stdout: (s) => out.push(s),
      stderr: (s) => err.push(s),
    }),
    out,
    err,
  };
}

describeFeature(feature, ({ Scenario }) => {
  Scenario('CLI converts a file', ({ Given, When, Then }) => {
    let dir = '';
    let code = -1;

    Given('a MusicXML file on disk', () => {
      dir = mkdtempSync(join(tmpdir(), 'famitune-cli-'));
      writeFileSync(join(dir, 'song.musicxml'), HELLO_WORLD);
    });

    When('the CLI converts the file', async () => {
      code = await silentRun([join(dir, 'song.musicxml'), '--out-dir', dir]).code;
    });

    Then('the CLI exits zero and writes FamiStudio Text', () => {
      expect(code).toBe(0);
      const text = readFileSync(join(dir, 'song.txt'), 'utf8');
      expect(text).toContain('Project Version="4.5.0"');
      expect(text).toContain('Value="C3"');
      expect(existsSync(join(dir, 'song.report.txt'))).toBe(true);
    });
  });

  Scenario('CLI rejects bad input', ({ Given, When, Then }) => {
    let dir = '';
    let code = -1;
    let err: string[] = [];

    Given('a timewise file on disk', () => {
      dir = mkdtempSync(join(tmpdir(), 'famitune-cli-'));
      writeFileSync(join(dir, 'bad.musicxml'), TIMEWISE);
    });

    When('the CLI converts the file', async () => {
      const result = silentRun([join(dir, 'bad.musicxml'), '--out-dir', dir]);
      err = result.err;
      code = await result.code;
    });

    Then('the CLI exits non-zero and names the problem', () => {
      expect(code).toBe(1);
      expect(err.join('')).toMatch(/score-timewise/);
      expect(existsSync(join(dir, 'bad.txt'))).toBe(false);
    });
  });

  Scenario('CLI writes the conversion report', ({ Given, When, Then }) => {
    let dir = '';
    let out: string[] = [];

    Given('a MusicXML file on disk', () => {
      dir = mkdtempSync(join(tmpdir(), 'famitune-cli-'));
      writeFileSync(join(dir, 'song.musicxml'), HELLO_WORLD);
    });

    When('the CLI converts the file', async () => {
      const result = silentRun([join(dir, 'song.musicxml'), '--out-dir', dir]);
      out = result.out;
      await result.code;
    });

    Then('the report file states the tempo and the written paths', () => {
      const report = readFileSync(join(dir, 'song.report.txt'), 'utf8');
      expect(report).toContain('Conversion report');
      expect(report).toMatch(/requested 120 BPM, actual 120\.20 BPM/);
      expect(out.join('')).toContain('song.txt');
    });
  });
});
