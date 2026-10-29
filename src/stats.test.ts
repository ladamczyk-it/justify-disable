import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { sendStats as send } from '@ladamczyk/qoq-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { lint } from './lint.ts';
import { resolveConsent, writeConsent } from './stats.ts';

vi.mock('@ladamczyk/qoq-utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@ladamczyk/qoq-utils')>()),
  sendStats: vi.fn().mockResolvedValue(undefined),
}));

const cwd = process.cwd();
let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'jd-stats-'));
  process.chdir(dir);
});

afterEach(() => {
  process.chdir(cwd);
  rmSync(dir, { recursive: true, force: true });
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.mocked(send).mockClear();
});

const put = (contents: string): string => {
  const file = join(dir, 'justify-disable.config.mjs');
  writeFileSync(file, contents);
  return file;
};

const tty = (isTTY: boolean): void => {
  vi.stubEnv('CI', '');
  vi.stubGlobal('process', { ...process, stdin: { isTTY }, stdout: { isTTY } });
};

describe('resolveConsent', () => {
  it.each([true, false])('returns stored stats: %s without prompting', async (value) => {
    put(`export default { stats: ${value} };\n`);
    tty(true);
    await expect(resolveConsent()).resolves.toBe(value);
  });

  it('returns undefined with no config file', async () => {
    tty(true);
    await expect(resolveConsent()).resolves.toBeUndefined();
    expect(readdirSync(dir)).toStrictEqual([]);
  });

  it('leaves the file untouched in CI', async () => {
    const file = put('export default {};\n');
    tty(true);
    vi.stubEnv('CI', 'true');
    await expect(resolveConsent()).resolves.toBeUndefined();
    expect(readFileSync(file, 'utf8')).toBe('export default {};\n');
  });

  it('leaves the file untouched without a TTY', async () => {
    const file = put('export default {};\n');
    tty(false);
    await expect(resolveConsent()).resolves.toBeUndefined();
    expect(readFileSync(file, 'utf8')).toBe('export default {};\n');
  });

  it('returns undefined when ask is false', async () => {
    put('export default {};\n');
    tty(true);
    await expect(resolveConsent(false)).resolves.toBeUndefined();
  });
});

describe('writeConsent', () => {
  it.each([
    [
      true,
      'export default {\n  ignorePatterns: [] };',
      'export default { stats: true,\n  ignorePatterns: [] };',
    ],
    [
      false,
      'const config = {\n  ignorePatterns: [] };\nexport default config;',
      'const config = { stats: false,\n  ignorePatterns: [] };\nexport default config;',
    ],
  ])('splices stats: %s into the source', (stats, source, expected) => {
    const file = put(source);
    writeConsent(file, stats);
    expect(readFileSync(file, 'utf8')).toBe(expected);
  });

  it('warns and leaves a defineConfig wrapper unchanged', () => {
    const source = 'export default defineConfig({});\n';
    const file = put(source);
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    writeConsent(file, true);
    expect(readFileSync(file, 'utf8')).toBe(source);
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining(`Couldn't update ${file}`));
  });
});

describe('lint stats', () => {
  it('sends once under the tool name when stats is true', async () => {
    await lint({ stats: true, config: { provider: () => [] } });
    expect(send).toHaveBeenCalledExactlyOnceWith('justify-disable');
  });

  it('never sends when stats is false', async () => {
    await lint({ stats: false, config: { provider: () => [] } });
    expect(send).not.toHaveBeenCalled();
  });
});
