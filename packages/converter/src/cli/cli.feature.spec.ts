import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import { ExportError } from '../export/export.js';
import { run, type CliExportDeps } from './cli.js';

const feature = await loadFeature(join(import.meta.dirname, '../../features/cli.feature'));

const HELLO_WORLD = readFileSync(join(import.meta.dirname, '../../fixtures/hello-world.musicxml'), 'utf8');
const TIMEWISE = `<?xml version="1.0" encoding="UTF-8"?><score-timewise version="4.0"></score-timewise>`;

function silentRun(argv: string[], exportDeps?: CliExportDeps): { code: Promise<number>; out: string[]; err: string[] } {
  const out: string[] = [];
  const err: string[] = [];
  return {
    code: run(
      argv,
      {
        stdout: (s) => out.push(s),
        stderr: (s) => err.push(s),
      },
      exportDeps,
    ),
    out,
    err,
  };
}

/** Stub exporter that writes a header-valid ROM so the real validator runs. */
function stubExports(corruptRom: boolean): CliExportDeps {
  return {
    isExportAvailable: async () => true,
    runExports: async (_txtPath, outDir) => {
      const wavPath = join(outDir, 'song.wav');
      const nsfPath = join(outDir, 'song.nsf');
      const nesPath = join(outDir, 'song.nes');
      writeFileSync(wavPath, 'dummy-wav');
      writeFileSync(nsfPath, 'dummy-nsf');
      if (corruptRom) {
        writeFileSync(nesPath, 'not-a-rom');
      } else {
        const rom = Buffer.alloc(16 + 2 * 16384 + 1 * 8192);
        rom.write('NES\x1A', 0, 'ascii');
        rom[4] = 2;
        rom[5] = 1;
        writeFileSync(nesPath, rom);
      }
      return { wavPath, nsfPath, nesPath };
    },
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

  Scenario('CLI exports playable files with the export flag', ({ Given, When, Then }) => {
    let dir = '';
    let code = -1;
    let out: string[] = [];

    Given('a MusicXML file on disk', () => {
      dir = mkdtempSync(join(tmpdir(), 'famitune-cli-'));
      writeFileSync(join(dir, 'song.musicxml'), HELLO_WORLD);
    });

    When('the CLI exports the file', async () => {
      const result = silentRun([join(dir, 'song.musicxml'), '--out-dir', dir, '--export'], stubExports(false));
      out = result.out;
      code = await result.code;
    });

    Then('the CLI exits zero and writes WAV, NSF, and NES files', () => {
      expect(code).toBe(0);
      expect(existsSync(join(dir, 'song.txt'))).toBe(true);
      expect(existsSync(join(dir, 'song.report.txt'))).toBe(true);
      expect(existsSync(join(dir, 'song.wav'))).toBe(true);
      expect(existsSync(join(dir, 'song.nsf'))).toBe(true);
      expect(existsSync(join(dir, 'song.nes'))).toBe(true);
      expect(out.join('')).toContain('song.nes');
    });
  });

  Scenario('CLI fails loudly when FamiStudio is unavailable', ({ Given, When, Then }) => {
    let dir = '';
    let code = -1;
    let err: string[] = [];

    Given('a MusicXML file on disk', () => {
      dir = mkdtempSync(join(tmpdir(), 'famitune-cli-'));
      writeFileSync(join(dir, 'song.musicxml'), HELLO_WORLD);
    });

    When('the CLI exports the file without FamiStudio', async () => {
      const result = silentRun([join(dir, 'song.musicxml'), '--out-dir', dir, '--export'], {
        isExportAvailable: async () => false,
        runExports: async () => {
          throw new Error('must not export without FamiStudio');
        },
      });
      err = result.err;
      code = await result.code;
    });

    Then('the CLI exits non-zero but keeps the FamiStudio Text', () => {
      expect(code).toBe(1);
      expect(err.join('')).toMatch(/unavailable/);
      expect(existsSync(join(dir, 'song.txt'))).toBe(true);
      expect(existsSync(join(dir, 'song.report.txt'))).toBe(true);
      expect(existsSync(join(dir, 'song.wav'))).toBe(false);
    });
  });

  Scenario('CLI fails loudly on an invalid ROM', ({ Given, When, Then }) => {
    let dir = '';
    let code = -1;
    let err: string[] = [];

    Given('a MusicXML file on disk', () => {
      dir = mkdtempSync(join(tmpdir(), 'famitune-cli-'));
      writeFileSync(join(dir, 'song.musicxml'), HELLO_WORLD);
    });

    When('the CLI exports the file with a corrupt ROM', async () => {
      const result = silentRun([join(dir, 'song.musicxml'), '--out-dir', dir, '--export'], stubExports(true));
      err = result.err;
      code = await result.code;
    });

    Then('the CLI exits non-zero and names validation', () => {
      expect(code).toBe(1);
      expect(err.join('')).toMatch(/validation/);
      expect(existsSync(join(dir, 'song.txt'))).toBe(true);
    });
  });

  Scenario('CLI fails loudly when an export produces no ROM', ({ Given, When, Then }) => {
    let dir = '';
    let code = -1;
    let err: string[] = [];

    Given('a MusicXML file on disk', () => {
      dir = mkdtempSync(join(tmpdir(), 'famitune-cli-'));
      writeFileSync(join(dir, 'song.musicxml'), HELLO_WORLD);
    });

    When('the CLI exports the file but the ROM export fails', async () => {
      const result = silentRun([join(dir, 'song.musicxml'), '--out-dir', dir, '--export'], {
        isExportAvailable: async () => true,
        runExports: async (_txtPath, outDir) => {
          writeFileSync(join(outDir, 'song.wav'), 'dummy-wav');
          writeFileSync(join(outDir, 'song.nsf'), 'dummy-nsf');
          throw new ExportError('rom-export produced no output for "song.txt" using "FamiStudio"');
        },
      });
      err = result.err;
      code = await result.code;
    });

    Then('the CLI exits non-zero, names the ROM export, but keeps the FamiStudio Text', () => {
      expect(code).toBe(1);
      expect(err.join('')).toMatch(/export failed/);
      expect(err.join('')).toMatch(/rom-export produced no output/);
      expect(existsSync(join(dir, 'song.txt'))).toBe(true);
      expect(existsSync(join(dir, 'song.report.txt'))).toBe(true);
      expect(existsSync(join(dir, 'song.nes'))).toBe(false);
    });
  });

  Scenario('CLI without the export flag never touches FamiStudio', ({ Given, When, Then }) => {
    let dir = '';
    let code = -1;
    let availabilityChecks = 0;
    let exportRuns = 0;

    Given('a MusicXML file on disk', () => {
      dir = mkdtempSync(join(tmpdir(), 'famitune-cli-'));
      writeFileSync(join(dir, 'song.musicxml'), HELLO_WORLD);
    });

    When('the CLI converts the file without the export flag', async () => {
      const result = silentRun([join(dir, 'song.musicxml'), '--out-dir', dir], {
        isExportAvailable: async () => {
          availabilityChecks++;
          return true;
        },
        runExports: async () => {
          exportRuns++;
          throw new Error('must not export without the export flag');
        },
      });
      code = await result.code;
    });

    Then('the CLI exits zero and never checks FamiStudio availability', () => {
      expect(code).toBe(0);
      expect(availabilityChecks).toBe(0);
      expect(exportRuns).toBe(0);
      expect(existsSync(join(dir, 'song.txt'))).toBe(true);
      expect(existsSync(join(dir, 'song.report.txt'))).toBe(true);
      expect(existsSync(join(dir, 'song.wav'))).toBe(false);
      expect(existsSync(join(dir, 'song.nsf'))).toBe(false);
      expect(existsSync(join(dir, 'song.nes'))).toBe(false);
    });
  });
});
