import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { loadConfig } from './config.ts';
import { lint } from './lint.ts';

const originalCwd = process.cwd();
let workDir: string;

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'config-'));
  process.chdir(workDir);
});

afterEach(async () => {
  process.chdir(originalCwd);
  await rm(workDir, { recursive: true, force: true });
});

describe('loadConfig', () => {
  it('resolves the object exported by justify-disable.config.mjs', async () => {
    await writeFile(
      join(workDir, 'justify-disable.config.mjs'),
      "export default { ignorePatterns: ['x/**'] };\n"
    );
    expect(await loadConfig()).toStrictEqual({ ignorePatterns: ['x/**'] });
  });

  it('resolves {} when there is no config file', async () => {
    expect(await loadConfig()).toStrictEqual({});
  });

  it('rejects a config file whose default export is not an object', async () => {
    await writeFile(join(workDir, 'justify-disable.config.mjs'), 'export default 42;\n');
    await expect(loadConfig()).rejects.toThrow(
      `Config "${join(workDir, 'justify-disable.config.mjs')}" must export (default) an object.`
    );
  });
});

describe('lint and the config file', () => {
  it('does not report a directive in a path the config file ignores', async () => {
    execFileSync('git', ['init', '-q'], { cwd: workDir });
    await writeFile(
      join(workDir, 'justify-disable.config.mjs'),
      "export default { ignorePatterns: ['fixtures/**'] };\n"
    );
    await mkdir(join(workDir, 'fixtures'));
    await writeFile(
      join(workDir, 'fixtures', 'a.ts'),
      '\n\n// eslint-disable-next-line no-console\nconsole.log(1);\n'
    );
    expect((await lint({ stats: false })).violations).toStrictEqual([]);
  });

  it('resolves without reading the config file when config is passed', async () => {
    execFileSync('git', ['init', '-q'], { cwd: workDir });
    await writeFile(join(workDir, 'justify-disable.config.mjs'), 'export default 42;\n');
    await expect(lint({ stats: false, config: {} })).resolves.toMatchObject({
      passed: true,
      violations: [],
    });
  });
});
