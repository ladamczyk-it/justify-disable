import { describe, expect, it } from 'vitest';

import { format } from './format.ts';

import type { ILintResult } from './types.ts';

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
      message: 'unjustified eslint-disable',
    },
    {
      path: 'b.css',
      line: 4,
      column: 3,
      directive: 'stylelint-disable',
      tool: 'stylelint',
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
});
