import c from 'picocolors';

import type { ILintResult } from './types.ts';

/**
 * Renders an {@link ILintResult} into a console-ready string. With `json`, emits
 * machine-readable output (for AI/tooling consumption); otherwise a colorized
 * pass message or the list of violations.
 */
export const format = (result: ILintResult, json = false): string => {
  if (json) {
    const { passed, scanned, violations } = result;

    return `${JSON.stringify({ passed, scanned, violations }, null, 2)}\n`;
  }

  if (result.passed) {
    return c.green(`\n✔ No unjustified disable directives (${result.scanned} files scanned).\n`);
  }

  let output = '\n';

  result.violations.forEach(({ path, line, column, message }) => {
    output += c.red(`✖ ${path}:${line}:${column}  ${message}\n`);
  });

  output += c.red(`\n${result.violations.length} unjustified disable directive(s) found.\n`);

  return output;
};
