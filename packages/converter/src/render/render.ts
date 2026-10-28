import { execFile } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { promisify } from 'node:util';

/**
 * Render stage (design D1/D6): thin wrapper around the pinned FamiStudio
 * desktop CLI. All FamiStudio-specific knowledge (binary name, export
 * subcommands, flags) lives here — parse and convert never touch it.
 * Only this stage needs the FamiStudio binary; everything else is testable
 * without it.
 */

export type ExecFn = (bin: string, args: string[]) => Promise<{ stdout: string; stderr: string }>;

/** The render failed: names the FamiStudio binary, the failing export, and the cause. */
export class RenderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RenderError';
  }
}

const execFileAsync = promisify(execFile);

const defaultExec: ExecFn = async (bin, args) => {
  const { stdout, stderr } = await execFileAsync(bin, args);
  return { stdout, stderr };
};

/** Resolve the FamiStudio binary: explicit path, `FAMISTUDIO_BIN`, or PATH lookup. */
export function locateFamiStudio(explicitBin?: string): string {
  return explicitBin ?? process.env.FAMISTUDIO_BIN ?? 'FamiStudio';
}

function stemOf(path: string): string {
  return basename(path).replace(/\.[^.]*$/, '');
}

/** File size or -1 when the path cannot be statted. */
function outputBytes(path: string): number {
  try {
    return statSync(path).size;
  } catch {
    return -1;
  }
}

async function runExport(
  exec: ExecFn,
  bin: string,
  args: string[],
  kind: 'wav-export' | 'nsf-export',
  txtPath: string,
): Promise<void> {
  try {
    await exec(bin, args);
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error);
    throw new RenderError(`${kind} failed for "${txtPath}" using "${bin}": ${cause}`);
  }
}

export interface RenderPaths {
  wavPath: string;
  nsfPath: string;
}

/**
 * Render FamiStudio Text to WAV and NSF via the pinned CLI:
 * `FamiStudio out.txt wav-export out.wav` and
 * `FamiStudio out.txt nsf-export out.nsf -nsf-export-mode:ntsc`.
 */
export async function renderOutputs(
  txtPath: string,
  outDir: string,
  opts?: { bin?: string; exec?: ExecFn; wavChannelsMask?: string },
): Promise<RenderPaths> {
  const bin = locateFamiStudio(opts?.bin);
  const exec = opts?.exec ?? defaultExec;
  const stem = stemOf(txtPath);
  mkdirSync(outDir, { recursive: true });
  const wavPath = join(outDir, `${stem}.wav`);
  const nsfPath = join(outDir, `${stem}.nsf`);
  const wavArgs = [txtPath, 'wav-export', wavPath];
  if (opts?.wavChannelsMask !== undefined) wavArgs.push(`-wav-export-channels:${opts.wavChannelsMask}`);
  await runExport(exec, bin, wavArgs, 'wav-export', txtPath);
  await runExport(exec, bin, [txtPath, 'nsf-export', nsfPath, '-nsf-export-mode:ntsc'], 'nsf-export', txtPath);
  // FamiStudio exits zero even when an export fails, so confirm the
  // artifacts exist and are non-empty (task 4.2 verification).
  for (const [kind, path] of [
    ['wav-export', wavPath],
    ['nsf-export', nsfPath],
  ] as const) {
    if (outputBytes(path) <= 0) {
      throw new RenderError(`${kind} produced no output for "${txtPath}" using "${bin}"`);
    }
  }
  return { wavPath, nsfPath };
}

/** True when the pinned FamiStudio CLI answers (used to gate render tests). */
export async function isFamiStudioAvailable(opts?: { bin?: string; exec?: ExecFn }): Promise<boolean> {
  const bin = locateFamiStudio(opts?.bin);
  const exec = opts?.exec ?? defaultExec;
  try {
    await exec(bin, ['-help']);
    return true;
  } catch {
    return false;
  }
}
