import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isFamiStudioAvailable, locateFamiStudio, exportOutputs, ExportError, type ExecFn } from './export.js';

const stubExec = (calls: Array<{ bin: string; args: string[] }>, failOn?: string): ExecFn => {
  return async (bin, args) => {
    calls.push({ bin, args });
    if (failOn !== undefined && args.includes(failOn)) {
      throw new Error(`${failOn} exploded`);
    }
    writeFileSync(args[2], 'dummy-output');
    return { stdout: '', stderr: '' };
  };
};

describe('exportOutputs', () => {
  it('invokes wav-export then nsf-export then rom-export with the pinned CLI shape', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'famitune-export-'));
    const calls: Array<{ bin: string; args: string[] }> = [];
    const paths = await exportOutputs('/tmp/out.txt', dir, { bin: 'FamiStudio', exec: stubExec(calls) });
    expect(paths).toEqual({
      wavPath: join(dir, 'out.wav'),
      nsfPath: join(dir, 'out.nsf'),
      nesPath: join(dir, 'out.nes'),
    });
    expect(calls).toEqual([
      { bin: 'FamiStudio', args: ['/tmp/out.txt', 'wav-export', join(dir, 'out.wav')] },
      { bin: 'FamiStudio', args: ['/tmp/out.txt', 'nsf-export', join(dir, 'out.nsf'), '-nsf-export-mode:ntsc'] },
      { bin: 'FamiStudio', args: ['/tmp/out.txt', 'rom-export', join(dir, 'out.nes'), '-rom-export-mode:ntsc'] },
    ]);
  });

  it('wraps export failures naming the binary and the input', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'famitune-export-'));
    const calls: Array<{ bin: string; args: string[] }> = [];
    const result = await exportOutputs('/tmp/out.txt', dir, {
      bin: 'FamiStudio',
      exec: stubExec(calls, 'nsf-export'),
    }).then(
      () => ({ thrown: undefined as unknown }),
      (error: unknown) => ({ thrown: error }),
    );
    expect(result.thrown).toBeInstanceOf(ExportError);
    expect((result.thrown as Error).message).toMatch(/nsf-export failed for "\/tmp\/out.txt" using "FamiStudio"/);
    expect(calls).toHaveLength(2);
  });

  it('wraps rom-export failures naming the ROM export', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'famitune-export-'));
    const calls: Array<{ bin: string; args: string[] }> = [];
    const result = await exportOutputs('/tmp/out.txt', dir, {
      bin: 'FamiStudio',
      exec: stubExec(calls, 'rom-export'),
    }).then(
      () => ({ thrown: undefined as unknown }),
      (error: unknown) => ({ thrown: error }),
    );
    expect(result.thrown).toBeInstanceOf(ExportError);
    expect((result.thrown as Error).message).toMatch(/rom-export failed for "\/tmp\/out.txt" using "FamiStudio"/);
    expect(calls).toHaveLength(3);
  });

  it('rejects a missing ROM artifact even on zero exit', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'famitune-export-'));
    const silentRom: ExecFn = async (_bin, args) => {
      if (!args.includes('rom-export')) writeFileSync(args[2], 'dummy-output');
      return { stdout: '', stderr: '' };
    };
    await expect(exportOutputs('/tmp/out.txt', dir, { bin: 'FamiStudio', exec: silentRom })).rejects.toThrowError(
      /rom-export produced no output/,
    );
  });

  it('rejects missing output artifacts even on zero exit', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'famitune-export-'));
    const silent: ExecFn = async () => ({ stdout: '', stderr: '' });
    await expect(exportOutputs('/tmp/out.txt', dir, { bin: 'FamiStudio', exec: silent })).rejects.toThrowError(
      /wav-export produced no output/,
    );
  });

  it('reports the binary absent without throwing', async () => {
    const failing: ExecFn = async () => {
      throw new Error('spawn FamiStudio ENOENT');
    };
    await expect(isFamiStudioAvailable({ exec: failing })).resolves.toBe(false);
  });

  it('prefers the explicit binary and FAMISTUDIO_BIN', () => {
    expect(locateFamiStudio('/opt/fs')).toBe('/opt/fs');
    process.env.FAMISTUDIO_BIN = '/env/fs';
    try {
      expect(locateFamiStudio()).toBe('/env/fs');
    } finally {
      delete process.env.FAMISTUDIO_BIN;
    }
    expect(locateFamiStudio()).toBe('FamiStudio');
  });
});
