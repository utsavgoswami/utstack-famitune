#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { convertScoreToText } from '../write/write.js';
import { exportOutputs, isFamiStudioAvailable, type ExportPaths } from '../export/export.js';
import { verifyNesFile } from '../export/verify.js';
import { MusicXmlParseError, parseScore } from '../parse/parse.js';
import { formatReport } from '../report/report.js';

export interface CliIO {
  stdout: (message: string) => void;
  stderr: (message: string) => void;
}

const USAGE = 'Usage: famitune-convert <input.musicxml> [--out-dir <directory>] [--export]';

const processIO: CliIO = {
  stdout: (message) => process.stdout.write(message),
  stderr: (message) => process.stderr.write(message),
};

/**
 * CLI entry: one MusicXML path in, FamiStudio Text plus a conversion report
 * out, optionally exported to WAV, NSF, and NES ROM with `--export`.
 * Returns the process exit code: 0 on success, 1 on rejected input,
 * unreadable files, or failed export/validation under `--export`, 2 on
 * missing arguments. Rejection errors name the problem and, when known,
 * the part/measure location. Without `--export` FamiStudio is never
 * invoked; with it, the `.txt` and report are written before exporting so
 * they survive an export failure.
 */
export interface CliExportDeps {
  isExportAvailable: () => Promise<boolean>;
  runExports: (txtPath: string, outDir: string) => Promise<ExportPaths>;
}

const defaultExportDeps: CliExportDeps = {
  isExportAvailable: () => isFamiStudioAvailable(),
  runExports: (txtPath, outDir) => exportOutputs(txtPath, outDir),
};

export async function run(
  argv: string[],
  io: CliIO = processIO,
  exportDeps: CliExportDeps = defaultExportDeps,
): Promise<number> {
  const input = argv.find((arg) => !arg.startsWith('-'));
  if (input === undefined || argv.includes('-h') || argv.includes('--help')) {
    io.stdout(`${USAGE}\n`);
    return input === undefined ? 2 : 0;
  }
  const outDirFlag = argv.indexOf('--out-dir');
  const outDir = outDirFlag === -1 ? dirname(resolve(input)) : resolve(argv[outDirFlag + 1] ?? '.');
  const wantExport = argv.includes('--export');

  let xml: string;
  try {
    xml = readFileSync(resolve(input), 'utf8');
  } catch {
    io.stderr(`Error: cannot read input file "${input}"\n`);
    return 1;
  }

  let title = basename(input, '.musicxml');
  if (title.endsWith('.xml')) title = title.slice(0, -'.xml'.length);

  try {
    const { text, report } = convertScoreToText(title, parseScore(xml));
    mkdirSync(outDir, { recursive: true });
    const txtPath = join(outDir, `${title}.txt`);
    const reportPath = join(outDir, `${title}.report.txt`);
    writeFileSync(txtPath, text);
    const rendered = formatReport(report);
    writeFileSync(reportPath, `${rendered}\n`);
    io.stdout(`${rendered}\nWrote ${txtPath}\nWrote ${reportPath}\n`);
    if (!wantExport) return 0;
    if (!(await exportDeps.isExportAvailable())) {
      io.stderr(
        `Error: cannot export "${input}": FamiStudio is unavailable ` +
          `(check FAMISTUDIO_BIN or FamiStudio on PATH, plus a .NET 8 runtime via DOTNET_ROOT)\n`,
      );
      return 1;
    }
    let paths: ExportPaths;
    try {
      paths = await exportDeps.runExports(txtPath, outDir);
    } catch (error) {
      const cause = error instanceof Error ? error.message : String(error);
      io.stderr(`Error: export failed for "${input}": ${cause}\n`);
      return 1;
    }
    const nes = verifyNesFile(paths.nesPath);
    if (!nes.passed) {
      io.stderr(`Error: NES ROM validation failed for "${input}": ${nes.details.join('; ')}\n`);
      return 1;
    }
    io.stdout(`Wrote ${paths.wavPath}\nWrote ${paths.nsfPath}\nWrote ${paths.nesPath}\n`);
    return 0;
  } catch (error) {
    if (error instanceof MusicXmlParseError) {
      io.stderr(`Error: rejected "${input}": ${error.message}\n`);
      return 1;
    }
    throw error;
  }
}

const invokedAsMain =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedAsMain) {
  run(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code;
    },
    (error) => {
      console.error(error);
      process.exitCode = 1;
    },
  );
}
