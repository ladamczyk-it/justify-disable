import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { gitProvider } from './provider.ts';
import { resolveConfig, selectFiles } from './resolve.ts';
import { scanSource } from './scan.ts';

import type { ILintOptions, ILintResult, IViolation } from './types.ts';

export const lint = async (options: ILintOptions): Promise<ILintResult> => {
  const resolved = resolveConfig(options.config, options.concurrency);
  const provider = resolved.provider ?? gitProvider;
  const files = selectFiles(await provider({ paths: options.paths ?? [] }), resolved);

  // undefined marks a file deleted from the worktree but still listed
  const results: (IViolation[] | undefined)[] = Array.from({ length: files.length });
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < files.length) {
      const index = next++;
      const { path, tools } = files[index]!;
      try {
        const source = await readFile(resolve(process.cwd(), path), 'utf8');
        results[index] = scanSource(source, path, tools, resolved.tools);
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
  return { passed: violations.length === 0, scanned: read.length, violations };
};
