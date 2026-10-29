import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { loadConfig } from './config.ts';
import { createPackageJsonLookup } from './package.ts';
import { gitProvider } from './provider.ts';
import { resolveConfig, selectFiles } from './resolve.ts';
import { scanSource } from './scan.ts';
import { sendStats } from './stats.ts';

import type { ILintOptions, ILintResult, IViolation } from './types.ts';

export const lint = async (options: ILintOptions): Promise<ILintResult> => {
  // Nothing is prompted from here — a library call has no TTY to ask on, so the
  // caller's `stats` is taken as the whole of the consent decision.
  if (options.stats) {
    void sendStats();
  }

  const resolved = resolveConfig(options.config ?? (await loadConfig()), options.concurrency);
  const provider = resolved.provider ?? gitProvider;
  const files = selectFiles(await provider({ paths: options.paths ?? [] }), resolved);

  // undefined marks a file deleted from the worktree but still listed
  const results: (IViolation[] | undefined)[] = Array.from({ length: files.length });
  const lookupPackageJson = createPackageJsonLookup();
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < files.length) {
      const index = next++;
      const { path, tools } = files[index]!;
      try {
        const absolutePath = resolve(process.cwd(), path);
        const source = await readFile(absolutePath, 'utf8');
        results[index] = scanSource(source, path, tools, resolved.tools, resolved.rules, () =>
          lookupPackageJson(dirname(absolutePath))
        );
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
      }
    }
  };
  await Promise.all(Array.from({ length: resolved.concurrency }, worker));

  const read = results.filter((result) => result !== undefined);
  const violations = read
    .flat()
    .toSorted((a, b) => a.path.localeCompare(b.path) || a.line - b.line || a.column - b.column);
  return {
    passed: !violations.some(({ severity }) => severity === 'error'),
    scanned: read.length,
    violations,
  };
};
