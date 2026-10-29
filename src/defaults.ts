import type { IToolDirectives, TRuleName, TRuleSeverity } from './types.ts';

export const DEFAULT_CONCURRENCY = 64;
export const DEFAULT_RULES: Record<TRuleName, TRuleSeverity> = {
  missingReason: 'error',
  expired: 'error',
  invalidCondition: 'error',
  missingDate: 'off',
};
// The reason regexes accept an optional `[condition]` after `@todo` but require prose after it
// (`[^\s*[]`), so a condition list alone is not a reason.
export const DEFAULT_TOOLS: Record<'eslint' | 'stylelint', IToolDirectives> = {
  eslint: {
    directive: /(?:\/\/|\/\*)\s*(eslint-disable(?:-next-line|-line)?)(?=\s|\*\/|$)/gm,
    reason: /@todo(?:[ \t]*\[(?:[^\]@]|@(?!todo))*\])?[ \t]+[^\s*[]/,
  },
  stylelint: {
    directive: /(?:\/\/|\/\*)\s*(stylelint-disable(?:-next-line|-line)?)(?=\s|\*\/|$)/gm,
    reason: /^\/\*[\s\S]*?@todo(?:[ \t]*\[(?:[^\]@]|@(?!todo))*\])?[ \t]+[^\s*[]/,
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
