import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FAMISTUDIO_VERSION } from './config.js';

describe('FamiStudio toolchain pin', () => {
  it('pins a 4.5.x version string', () => {
    expect(FAMISTUDIO_VERSION).toMatch(/^4\.5\.\d+$/);
  });

  it('stamps the pinned version into the golden file', () => {
    const golden = readFileSync(
      join(import.meta.dirname, '../fixtures/golden-hello-world.txt'),
      'utf8',
    );
    const firstLine = golden.split('\n')[0] ?? '';
    expect(firstLine).toContain(`Project Version="${FAMISTUDIO_VERSION}"`);
  });
});
