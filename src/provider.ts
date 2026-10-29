import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import type { TFileProvider } from './types.ts';

const execFileAsync = promisify(execFile);

const toProviderError = (error: unknown): Error => {
  const { code, stderr = '' } = error as { code?: unknown; stderr?: string };
  if (code === 'ENOENT') {
    return new Error('git not found — install git or configure a provider');
  }
  // Matched on stderr: exit code 128 is shared with `../outside` paths.
  if (stderr.includes('not a git repository')) {
    return new Error('not a git repository — run inside one or configure a provider');
  }
  const unmatched = /pathspec '(.*)' did not match/.exec(stderr);
  if (unmatched) {
    return new Error(`pathspec '${unmatched[1]}' matched no files`);
  }
  return new Error(stderr.trim() || String(error));
};

// execFile (argv, no shell) so user paths are never parsed by a shell; -z because git quotes non-ASCII names otherwise.
export const gitProvider: TFileProvider = async (context) => {
  try {
    const { stdout } = await execFileAsync(
      'git',
      [
        'ls-files',
        '-z',
        '--cached',
        '--others',
        '--exclude-standard',
        '--error-unmatch',
        '--',
        ...context.paths,
      ],
      { encoding: 'utf8', maxBuffer: Infinity, cwd: process.cwd() }
    );
    // Set: merge conflicts list a path once per stage.
    return [...new Set(stdout.split('\0').filter(Boolean))].map((path) => ({ path }));
  } catch (error) {
    throw toProviderError(error);
  }
};
