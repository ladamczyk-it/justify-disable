import type { IToolDirectives, TRuleName, TRuleSeverity } from './types.ts';

export const DEFAULT_CONCURRENCY = 64;
export const DEFAULT_RULES: Record<TRuleName, TRuleSeverity> = {
  missingReason: 'error',
  expired: 'error',
  invalidCondition: 'error',
  missingDate: 'off',
};
export const DEFAULT_TOOLS: Record<'eslint' | 'stylelint', IToolDirectives> = {
  eslint: {
    directive: /(?:\/\/|\/\*)\s*(eslint-disable(?:-next-line|-line)?)(?=\s|\*\/|$)/gm,
    reason: /@todo[ \t]+[^\s*]/,
  },
  stylelint: {
    directive: /(?:\/\/|\/\*)\s*(stylelint-disable(?:-next-line|-line)?)(?=\s|\*\/|$)/gm,
    reason: /^\/\*[\s\S]*?@todo[ \t]+[^\s*]/,
  },
};
export const DEFAULT_EXTENSIONS: Record<string, string[]> = {
  js: ['eslint'],
  mjs: ['eslint'],
  cjs: ['eslint'],
  jsx: ['eslint'],
  ts: ['eslint'],
  mts: ['eslint'],
  cts: ['eslint'],
  tsx: ['eslint'],
  css: ['stylelint'],
  scss: ['stylelint'],
  sass: ['stylelint'],
  less: ['stylelint'],
  vue: ['eslint', 'stylelint'],
  svelte: ['eslint', 'stylelint'],
  html: ['eslint', 'stylelint'],
};
