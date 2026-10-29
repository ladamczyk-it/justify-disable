import { execFile, execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as api from './index.ts';

const execFileAsync = promisify(execFile);
const CLI = join(dirname(fileURLToPath(import.meta.url)), 'cli.ts');
const NOT_GIT = 'not a git repository — run inside one or configure a provider';

interface IRun {
  code: number;
  stdout: string;
  stderr: string;
}

let workDir: string;

const runCli = async (...args: string[]): Promise<IRun> => {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [CLI, ...args], {
      cwd: workDir,
      env: { ...process.env, NO_COLOR: '1', CI: 'true' },
    });
    return { code: 0, stdout, stderr };
  } catch (error) {
    const { code, stdout, stderr } = error as IRun;
    return { code, stdout, stderr };
  }
};

const initRepo = async (source: string): Promise<void> => {
  execFileSync('git', ['init', '-q'], { cwd: workDir });
  await mkdir(join(workDir, 'src'));
  await writeFile(join(workDir, 'src/a.ts'), source);
};

const UNJUSTIFIED = '\n\n// eslint-disable-next-line no-console\nconsole.log(1);\n';

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'cli-'));
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

describe('cli', () => {
  it('exits 1 and lists the violation when a directive is unjustified', async () => {
    await initRepo(UNJUSTIFIED);
    const { code, stdout } = await runCli();
    expect(code).toBe(1);
    expect(stdout).toContain('✖ src/a.ts:');
    expect(stdout).toContain('1 unjustified disable directive(s) found.');
  });

  it('exits 0 in a clean repo', async () => {
    await initRepo('export const a = 1;\n');
    const { code, stdout } = await runCli();
    expect(code).toBe(0);
    expect(stdout).toContain('✔ No unjustified disable directives (');
  });

  it('prints JSON and exits 1 under --json when a directive is unjustified', async () => {
    await initRepo(UNJUSTIFIED);
    const { code, stdout } = await runCli('--json');
    const parsed = JSON.parse(stdout) as {
      passed: boolean;
      scanned: number;
      violations: unknown[];
    };
    expect(code).toBe(1);
    expect(parsed.passed).toBe(false);
    expect(typeof parsed.scanned).toBe('number');
    expect(parsed.violations).toHaveLength(1);
  });

  it('exits 2 with the error on stderr outside a git repository', async () => {
    const { code, stderr } = await runCli();
    expect(code).toBe(2);
    expect(stderr).toContain(NOT_GIT);
  });

  it('exits 2 with a JSON error payload on stdout under --json outside a git repository', async () => {
    const { code, stdout } = await runCli('--json');
    expect(code).toBe(2);
    expect(JSON.parse(stdout)).toStrictEqual({ passed: false, error: NOT_GIT });
  });

  it('exits 2 when a path matches no files', async () => {
    await initRepo('export const a = 1;\n');
    const { code, stderr } = await runCli('nope');
    expect(code).toBe(2);
    expect(stderr).toContain("pathspec 'nope' matched no files");
  });

  it('exits 2 when --concurrency is not a positive integer', async () => {
    await initRepo('export const a = 1;\n');
    const { code, stderr } = await runCli('--concurrency', '0');
    expect(code).toBe(2);
    expect(stderr).toContain('concurrency must be a positive integer');
  });
});

describe('cli exit after flush', () => {
  const lintMock = vi.fn();
  let heldCallback: (() => void) | undefined;
  const originalArgv = process.argv;

  // Runs the CLI in-process with the stream's write holding its callback, so
  // the test controls when the write "finishes".
  const startCli = async (stream: NodeJS.WriteStream, ...args: string[]) => {
    heldCallback = undefined;
    const write = vi.spyOn(stream, 'write').mockImplementation((...writeArgs: unknown[]) => {
      heldCallback = writeArgs.find((arg) => typeof arg === 'function') as () => void;
      return true;
    });
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    process.argv = [process.execPath, CLI, ...args];
    vi.resetModules();
    vi.doMock('./stats.ts', () => ({
      resolveConsent: vi.fn().mockResolvedValue(false),
      sendStats: vi.fn(),
    }));
    vi.doMock('./lint.ts', () => ({ lint: lintMock }));
    await import('./cli.ts');
    await vi.waitFor(() => {
      expect(write).toHaveBeenCalled();
    });
    write.mockRestore();
    return exit;
  };

  afterEach(() => {
    process.argv = originalArgv;
    vi.doUnmock('./stats.ts');
    vi.doUnmock('./lint.ts');
    vi.restoreAllMocks();
  });

  it('exits with the result code only after stdout has flushed', async () => {
    lintMock.mockResolvedValue({ passed: true, scanned: 0, violations: [] });
    const exit = await startCli(process.stdout);
    expect(exit).not.toHaveBeenCalled();
    heldCallback?.();
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('exits 2 only after the --json error payload on stdout has flushed', async () => {
    lintMock.mockRejectedValue(new Error('boom'));
    const exit = await startCli(process.stdout, '--json');
    expect(exit).not.toHaveBeenCalled();
    heldCallback?.();
    expect(exit).toHaveBeenCalledWith(2);
  });

  it('exits 2 only after the error line on stderr has flushed', async () => {
    lintMock.mockRejectedValue(new Error('boom'));
    const exit = await startCli(process.stderr);
    expect(exit).not.toHaveBeenCalled();
    heldCallback?.();
    expect(exit).toHaveBeenCalledWith(2);
  });
});

describe('public exports', () => {
  it('exposes the library API and no run', () => {
    expect(Object.keys(api).toSorted()).toStrictEqual([
      'DEFAULT_CONCURRENCY',
      'DEFAULT_CONFIG_FILES',
      'DEFAULT_EXTENSIONS',
      'DEFAULT_TOOLS',
      'format',
      'gitProvider',
      'lint',
      'loadConfig',
    ]);
  });
});
