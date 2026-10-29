import { describe, expect, it } from 'vitest';

import { format } from './format.ts';

import type { ILintResult, IViolation } from './types.ts';

const failed: ILintResult = {
  passed: false,
  scanned: 2,
  violations: [
    {
      path: 'src/a.ts',
      line: 12,
      column: 1,
      directive: 'eslint-disable',
      tool: 'eslint',
      rule: 'missingReason',
      severity: 'error',
      message: 'unjustified eslint-disable',
    },
    {
      path: 'b.css',
      line: 4,
      column: 3,
      directive: 'stylelint-disable',
      tool: 'stylelint',
      rule: 'missingReason',
      severity: 'error',
      message: 'unjustified stylelint-disable',
    },
  ],
};

describe('format', () => {
  it('renders the pass message with the scanned file count', () => {
    expect(format({ passed: true, scanned: 3, violations: [] })).toBe(
      '\n✔ No unjustified disable directives (3 files scanned).\n'
    );
  });

  it('lists each violation at its location and counts them', () => {
    expect(format(failed)).toBe(
      '\n✖ src/a.ts:12:1  unjustified eslint-disable\n✖ b.css:4:3  unjustified stylelint-disable\n\n2 unjustified disable directive(s) found.\n'
    );
  });

  it('emits JSON with only passed, scanned and violations when json is set', () => {
    const output = format(failed, true);

    expect(output).toBe(
      `${JSON.stringify({ passed: failed.passed, scanned: failed.scanned, violations: failed.violations }, null, 2)}\n`
    );
    expect(JSON.parse(output)).toStrictEqual({
      passed: failed.passed,
      scanned: failed.scanned,
      violations: failed.violations,
    });
  });

  const error: IViolation = {
    path: 'a.ts',
    line: 1,
    column: 1,
    directive: 'eslint-disable',
    tool: 'eslint',
    rule: 'missingReason',
    severity: 'error',
    message: 'msg',
  };
  const warning: IViolation = { ...error, rule: 'expired', severity: 'warn' };

  it('renders a lone error exactly as before', () => {
    expect(format({ passed: false, scanned: 1, violations: [error] })).toBe(
      '\n✖ a.ts:1:1  msg\n\n1 unjustified disable directive(s) found.\n'
    );
  });

  it('renders a warning with the pass line and a warning count', () => {
    expect(format({ passed: true, scanned: 3, violations: [warning] })).toBe(
      '\n⚠ a.ts:1:1  msg\n\n✔ No unjustified disable directives (3 files scanned).\n1 warning(s).\n'
    );
  });

  it('counts errors and warnings separately', () => {
    expect(format({ passed: false, scanned: 3, violations: [error, warning, warning] })).toMatch(
      /1 unjustified disable directive\(s\) found\.\n2 warning\(s\)\.\n$/
    );
  });

  it('includes rule and severity in JSON violations', () => {
    const parsed = JSON.parse(
      format({ passed: true, scanned: 1, violations: [warning] }, true)
    ) as ILintResult;
    const [violation] = parsed.violations;

    expect(violation).toMatchObject({ rule: 'expired', severity: 'warn' });
  });
});
