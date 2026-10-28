#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { convertScoreToText } from '../emit/emit.js';
import { MusicXmlParseError, parseScore } from '../parse/parse.js';
import { formatReport } from '../report/report.js';

export interface CliIO {
  stdout: (message: string) => void;
  stderr: (message: string) => void;
}

const USAGE = 'Usage: famitune-convert <input.musicxml> [--out-dir <directory>]';

const processIO: CliIO = {
  stdout: (message) => process.stdout.write(message),
  stderr: (message) => process.stderr.write(message),
};

/**
 * CLI entry: one MusicXML path in, FamiStudio Text plus a conversion report
 * out. Returns the process exit code: 0 on success, 1 on rejected input or
 * unreadable files, 2 on missing arguments. Rejection errors name the
 * problem and, when known, the part/measure location.
 */
export async function run(argv: string[], io: CliIO = processIO): Promise<number> {
  const input = argv.find((arg) => !arg.startsWith('-'));
  if (input === undefined || argv.includes('-h') || argv.includes('--help')) {
    io.stdout(`${USAGE}\n`);
    return input === undefined ? 2 : 0;
  }
  const outDirFlag = argv.indexOf('--out-dir');
  const outDir = outDirFlag === -1 ? dirname(resolve(input)) : resolve(argv[outDirFlag + 1] ?? '.');

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
