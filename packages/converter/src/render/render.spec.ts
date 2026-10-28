import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isFamiStudioAvailable, locateFamiStudio, renderOutputs, RenderError, type ExecFn } from './render.js';

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

describe('renderOutputs', () => {
  it('invokes wav-export then nsf-export with the pinned CLI shape', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'famitune-render-'));
    const calls: Array<{ bin: string; args: string[] }> = [];
    const paths = await renderOutputs('/tmp/out.txt', dir, { bin: 'FamiStudio', exec: stubExec(calls) });
    expect(paths).toEqual({ wavPath: join(dir, 'out.wav'), nsfPath: join(dir, 'out.nsf') });
    expect(calls).toEqual([
      { bin: 'FamiStudio', args: ['/tmp/out.txt', 'wav-export', join(dir, 'out.wav')] },
      { bin: 'FamiStudio', args: ['/tmp/out.txt', 'nsf-export', join(dir, 'out.nsf'), '-nsf-export-mode:ntsc'] },
    ]);
  });

  it('wraps export failures naming the binary and the input', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'famitune-render-'));
    const calls: Array<{ bin: string; args: string[] }> = [];
    const result = await renderOutputs('/tmp/out.txt', dir, {
      bin: 'FamiStudio',
      exec: stubExec(calls, 'nsf-export'),
    }).then(
      () => ({ thrown: undefined as unknown }),
      (error: unknown) => ({ thrown: error }),
    );
    expect(result.thrown).toBeInstanceOf(RenderError);
    expect((result.thrown as Error).message).toMatch(/nsf-export failed for "\/tmp\/out.txt" using "FamiStudio"/);
    expect(calls).toHaveLength(2);
  });

  it('rejects missing output artifacts even on zero exit', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'famitune-render-'));
    const silent: ExecFn = async () => ({ stdout: '', stderr: '' });
    await expect(renderOutputs('/tmp/out.txt', dir, { bin: 'FamiStudio', exec: silent })).rejects.toThrowError(
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
