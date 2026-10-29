import { cosmiconfig } from 'cosmiconfig';

import type { IJustifyDisableConfig } from './types.ts';

const moduleName = 'justify-disable';

/** Config file names looked up (in order) in the current working directory. */
export const DEFAULT_CONFIG_FILES = [
  'justify-disable.config.ts',
  'justify-disable.config.js',
  'justify-disable.config.mjs',
  'justify-disable.config.cjs',
];

// Module-level, not per call: cosmiconfig caches each search, so repeated
// `searchConfig` calls read the config file once.
const explorer = cosmiconfig(moduleName, {
  // qoq-sheriff: accepted — This package is to js/TS projects only
  searchStrategy: 'project',
  searchPlaces: DEFAULT_CONFIG_FILES,
});

/** Raw cosmiconfig hit: config plus the file path it came from. */
export const searchConfig = (): Promise<{ config: unknown; filepath: string } | null> =>
  explorer.search();

/**
 * Discovers and loads the `justify-disable.config.*` file in the current
 * working directory and returns its default export. With no config file the
 * result is `{}`, so the defaults apply.
 */
export const loadConfig = async (): Promise<IJustifyDisableConfig> => {
  const result = await searchConfig();
  if (!result) {
    return {};
  }

  const { config, filepath } = result;
  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    throw new Error(`Config "${filepath}" must export (default) an object.`);
  }
  return config;
};
