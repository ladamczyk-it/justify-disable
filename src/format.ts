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

  const { violations, scanned } = result;

  if (violations.length === 0) {
    return c.green(`\n✔ No unjustified disable directives (${scanned} files scanned).\n`);
  }

  let output = '\n';

  violations.forEach(({ path, line, column, message, severity }) => {
    const text = `${path}:${line}:${column}  ${message}\n`;

    output += severity === 'warn' ? c.yellow(`⚠ ${text}`) : c.red(`✖ ${text}`);
  });

  const errors = violations.filter(({ severity }) => severity === 'error').length;
  const warnings = violations.length - errors;

  output += errors
    ? c.red(`\n${errors} unjustified disable directive(s) found.\n`)
    : c.green(`\n✔ No unjustified disable directives (${scanned} files scanned).\n`);

  if (warnings) {
    output += c.yellow(`${warnings} warning(s).\n`);
  }

  return output;
};
