import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { gitProvider } from './provider.ts';

const originalCwd = process.cwd();
let workDir: string;

const git = (...args: string[]): void => {
  execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...args], { cwd: workDir });
};

const sortedPaths = async (paths: string[] = []): Promise<string[]> =>
  (await gitProvider({ paths })).map((file) => file.path).sort();

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'provider-'));
  process.chdir(workDir);
});

afterEach(async () => {
  process.chdir(originalCwd);
  await rm(workDir, { recursive: true, force: true });
});

describe('gitProvider', () => {
  const initRepo = async (): Promise<void> => {
    git('init', '-q');
    await writeFile(join(workDir, 'a.ts'), '');
    await mkdir(join(workDir, 'src'));
    await writeFile(join(workDir, 'src', 's.ts'), '');
    git('add', '.');
    git('commit', '-qm', 'init');
    await writeFile(join(workDir, 'b.ts'), '');
    await mkdir(join(workDir, 'dist'));
    await writeFile(join(workDir, 'dist', 'c.ts'), '');
    await writeFile(join(workDir, '.git', 'info', 'exclude'), 'dist\n');
  };

  it('returns tracked and untracked files but not ignored ones', async () => {
    await initRepo();
    expect(await sortedPaths()).toStrictEqual(['a.ts', 'b.ts', 'src/s.ts']);
  });

  it('returns a non-ASCII file name literally', async () => {
    await initRepo();
    await writeFile(join(workDir, 'ä b.ts'), '');
    expect(await sortedPaths()).toContain('ä b.ts');
  });

  it('restricts results to the given paths', async () => {
    await initRepo();
    expect(await sortedPaths(['src'])).toStrictEqual(['src/s.ts']);
  });

  it('rejects an unmatched pathspec', async () => {
    await initRepo();
    await expect(gitProvider({ paths: ['nope'] })).rejects.toThrow(
      "pathspec 'nope' matched no files"
    );
  });

  it('rejects outside a git repository', async () => {
    await expect(gitProvider({ paths: [] })).rejects.toThrow(
      'not a git repository — run inside one or configure a provider'
    );
  });

  it('passes shell metacharacters literally', async () => {
    await initRepo();
    await expect(gitProvider({ paths: ['$(touch pwned)'] })).rejects.toThrow(
      "pathspec '$(touch pwned)' matched no files"
    );
    expect(existsSync(join(workDir, 'pwned'))).toBe(false);
  });
});
