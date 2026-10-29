import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import type { IPackageJson } from './types.ts';

const readPackageJsonIn = (dir: string): IPackageJson | null | undefined => {
  const path = join(dir, 'package.json');
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`invalid package.json: ${path}`);
  }
  // A non-object top level (`null`, an array, a string) has no fields to read; reject it like a syntax error.
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`invalid package.json: ${path}`);
  }
  return parsed;
};

/** Per-run lookup: nearest package.json walking up from `dir` to the filesystem root, cached per directory. null when none. Throws `invalid package.json: <absolute path>` on unparsable JSON. */
export const createPackageJsonLookup = (): ((dir: string) => IPackageJson | null) => {
  const cache = new Map<string, IPackageJson | null>();
  return (dir) => {
    const visited: string[] = [];
    let found: IPackageJson | null = null;
    for (let current = dir; ; current = dirname(current)) {
      const cached = cache.get(current);
      if (cached !== undefined) {
        found = cached;
        break;
      }
      visited.push(current);
      const read = readPackageJsonIn(current);
      if (read !== undefined) {
        found = read;
        break;
      }
      if (dirname(current) === current) {
        break;
      }
    }
    for (const directory of visited) {
      cache.set(directory, found);
    }
    return found;
  };
};
