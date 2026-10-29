import { extname, matchesGlob, isAbsolute } from 'node:path';

import {
  DEFAULT_CONCURRENCY,
  DEFAULT_EXTENSIONS,
  DEFAULT_RULES,
  DEFAULT_TOOLS,
} from './defaults.ts';

import type {
  IJustifyDisableConfig,
  IProvidedFile,
  IToolDirectives,
  TFileProvider,
  TRuleName,
  TRuleSeverity,
} from './types.ts';

export interface IResolvedConfig {
  tools: Record<string, IToolDirectives>;
  extensions: Record<string, string[]>;
  ignorePatterns: string[];
  provider?: TFileProvider;
  concurrency: number;
  rules: Record<TRuleName, TRuleSeverity>;
}

const assertKnownTools = (names: string[], tools: Record<string, IToolDirectives>): void => {
  for (const name of names) {
    if (!Object.hasOwn(tools, name)) {
      throw new Error(`unknown tool "${name}"`);
    }
  }
};

const SEVERITIES: readonly string[] = ['error', 'warn', 'off'];

const resolveRules = (
  rules: IJustifyDisableConfig['rules'] = {}
): Record<TRuleName, TRuleSeverity> => {
  for (const [name, severity] of Object.entries(rules)) {
    if (!Object.hasOwn(DEFAULT_RULES, name)) {
      throw new Error(`unknown rule "${name}"`);
    }
    if (!SEVERITIES.includes(severity)) {
      throw new Error(`rule "${name}" must be "error", "warn" or "off"`);
    }
  }
  return { ...DEFAULT_RULES, ...rules };
};

const normaliseTool = ({ directive, reason }: IToolDirectives): IToolDirectives => ({
  directive: directive.global ? directive : new RegExp(directive.source, `${directive.flags}g`),
  // a reason without g/y is returned as is so the default keeps its identity
  reason:
    reason.global || reason.sticky
      ? new RegExp(reason.source, reason.flags.replaceAll(/[gy]/g, ''))
      : reason,
});

export const resolveConfig = (
  config: IJustifyDisableConfig = {},
  concurrencyOverride?: number
): IResolvedConfig => {
  const tools = Object.fromEntries(
    Object.entries({ ...DEFAULT_TOOLS, ...config.tools }).map(([name, tool]) => [
      name,
      normaliseTool(tool),
    ])
  );
  const extensions = { ...DEFAULT_EXTENSIONS, ...config.extensions };
  for (const names of Object.values(extensions)) {
    assertKnownTools(names, tools);
  }

  const concurrency = concurrencyOverride ?? config.concurrency ?? DEFAULT_CONCURRENCY;
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error('concurrency must be a positive integer');
  }

  return {
    tools,
    extensions,
    ignorePatterns: (config.ignorePatterns ?? []).map((pattern) =>
      pattern.includes('/') ? pattern : `**/${pattern}`
    ),
    ...(config.provider && { provider: config.provider }),
    concurrency,
    rules: resolveRules(config.rules),
  };
};

export const selectFiles = (
  files: IProvidedFile[],
  resolved: IResolvedConfig
): { path: string; tools: string[] }[] => {
  const selected: { path: string; tools: string[] }[] = [];
  for (const { path, tools: explicit } of files) {
    if (isAbsolute(path)) {
      throw new Error(`provider returned an absolute path: ${path}`);
    }
    if (resolved.ignorePatterns.some((pattern) => matchesGlob(path, pattern))) {
      continue;
    }
    if (explicit) {
      assertKnownTools(explicit, resolved.tools);
    }
    const extension = extname(path).slice(1).toLowerCase();
    const tools =
      explicit ??
      (Object.hasOwn(resolved.extensions, extension) ? resolved.extensions[extension] : undefined);
    if (tools) {
      selected.push({ path, tools });
    }
  }
  return selected;
};
