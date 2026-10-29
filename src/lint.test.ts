import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs/promises';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { lint } from './lint.ts';

import type { TFileProvider } from './types.ts';

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return { ...actual, readFile: vi.fn(actual.readFile) };
});

const originalCwd = process.cwd();
const realReadFile = (await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises'))
  .readFile;
let workDir: string;

const git = (...args: string[]): void => {
  execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...args], { cwd: workDir });
};

const write = async (path: string, content: string): Promise<void> => {
  await mkdir(join(workDir, path, '..'), { recursive: true });
  await writeFile(join(workDir, path), content);
};

const UNJUSTIFIED = '\n\n// eslint-disable-next-line no-console\nconsole.log(1);\n';

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'lint-'));
  process.chdir(workDir);
});

afterEach(async () => {
  process.chdir(originalCwd);
  vi.mocked(fs.readFile).mockImplementation(realReadFile);
  await rm(workDir, { recursive: true, force: true });
});

describe('lint in a git repo', () => {
  it('reports an unjustified directive', async () => {
    git('init', '-q');
    await write('src/a.ts', UNJUSTIFIED);
    expect(await lint({ stats: false })).toStrictEqual({
      passed: false,
      scanned: 1,
      violations: [
        {
          path: 'src/a.ts',
          line: 3,
          column: 1,
          directive: 'eslint-disable-next-line',
          tool: 'eslint',
          rule: 'missingReason',
          severity: 'error',
          message: 'eslint-disable-next-line has no @todo reason above it',
        },
      ],
    });
  });

  it('passes when every directive is justified', async () => {
    git('init', '-q');
    await write(
      'src/a.ts',
      '// @todo remove after the logger lands\n// eslint-disable-next-line no-console\n'
    );
    await write('src/b.css', 'a {}\n');
    await write('README.md', '// eslint-disable\n');
    expect(await lint({ stats: false })).toStrictEqual({
      passed: true,
      scanned: 2,
      violations: [],
    });
  });

  it('neither reports nor counts a gitignored file', async () => {
    git('init', '-q');
    await write('.gitignore', 'dist\n');
    await write('dist/x.ts', UNJUSTIFIED);
    await write('ok.ts', 'export {};\n');
    const result = await lint({ stats: false });
    expect(result.scanned).toBe(1);
    expect(result.violations).toStrictEqual([]);
  });

  it('rejects outside a git repository', async () => {
    await expect(lint({ stats: false })).rejects.toThrow(
      'not a git repository — run inside one or configure a provider'
    );
  });
});

describe('lint with a provider', () => {
  it('scans only the provided file and honours its tools', async () => {
    await write('App.vue', '/* stylelint-disable */\n');
    await write('other.ts', UNJUSTIFIED);
    const result = await lint({
      stats: false,
      config: { provider: () => [{ path: 'App.vue', tools: ['eslint'] }] },
    });
    expect(result).toStrictEqual({ passed: true, scanned: 1, violations: [] });
  });

  it('passes the paths to the provider', async () => {
    const provider = vi.fn<TFileProvider>(() => []);
    await lint({ stats: false, paths: ['src'], config: { provider } });
    expect(provider).toHaveBeenCalledWith({ paths: ['src'] });
  });

  it('skips a missing file without counting it', async () => {
    await write('real.ts', 'export {};\n');
    const result = await lint({
      stats: false,
      config: { provider: () => [{ path: 'gone.ts' }, { path: 'real.ts' }] },
    });
    expect(result).toStrictEqual({ passed: true, scanned: 1, violations: [] });
  });

  it('orders violations by path then line whatever order the provider gives', async () => {
    await write('a.ts', `\n// eslint-disable\n${'\n'.repeat(6)}// eslint-disable\n`);
    await write('b.ts', '// eslint-disable\n');
    const result = await lint({
      stats: false,
      config: { provider: () => [{ path: 'b.ts' }, { path: 'a.ts' }] },
    });
    expect(result.violations.map(({ path, line }) => `${path}:${line}`)).toStrictEqual([
      'a.ts:2',
      'a.ts:9',
      'b.ts:1',
    ]);
  });

  it('never has more reads in flight than the concurrency', async () => {
    let inFlight = 0;
    let peak = 0;
    vi.mocked(fs.readFile).mockImplementation(async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => {
        setTimeout(resolve, 5);
      });
      inFlight -= 1;
      return '';
    });
    const files = Array.from({ length: 10 }, (_, index) => ({ path: `f${index}.ts` }));
    const result = await lint({ stats: false, concurrency: 2, config: { provider: () => files } });
    expect(result.scanned).toBe(10);
    expect(peak).toBe(2);
  });
});
