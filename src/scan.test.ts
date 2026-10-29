import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_EXTENSIONS, DEFAULT_RULES, DEFAULT_TOOLS } from './defaults.ts';
import { scanSource } from './scan.ts';

const noPackageJson = () => null;
const scanEslint = (source: string) =>
  scanSource(source, 'a.ts', ['eslint'], DEFAULT_TOOLS, DEFAULT_RULES, noPackageJson);
const scanStylelint = (source: string) =>
  scanSource(source, 'a.css', ['stylelint'], DEFAULT_TOOLS, DEFAULT_RULES, noPackageJson);
const directive = 'eslint-disable-next-line no-console\nfoo();';

describe('scanSource', () => {
  describe('missingReason severity', () => {
    const scanWith = (missingReason: 'error' | 'warn' | 'off') =>
      scanSource(
        '// eslint-disable-next-line\nx',
        'a.ts',
        ['eslint'],
        DEFAULT_TOOLS,
        { ...DEFAULT_RULES, missingReason },
        noPackageJson
      );

    it('reports error by default', () => {
      expect(scanWith('error')).toMatchObject([
        {
          rule: 'missingReason',
          severity: 'error',
          message: 'eslint-disable-next-line has no @todo reason above it',
        },
      ]);
    });

    it('reports warn when configured', () => {
      expect(scanWith('warn')).toMatchObject([{ rule: 'missingReason', severity: 'warn' }]);
    });

    it('reports nothing when off', () => {
      expect(scanWith('off')).toStrictEqual([]);
    });
  });

  it('reports an unjustified directive on line 1', () => {
    expect(scanEslint(`// ${directive}`)).toStrictEqual([
      {
        path: 'a.ts',
        line: 1,
        column: 1,
        directive: 'eslint-disable-next-line',
        tool: 'eslint',
        rule: 'missingReason',
        severity: 'error',
        message: 'eslint-disable-next-line has no @todo reason above it',
      },
    ]);
  });

  it.each([
    ['multi-line JSDoc', '/**\n * @todo remove after migration\n */'],
    ['line comment', '// @todo remove after migration'],
    ['JSX comment', '{/* @todo remove after migration */}'],
  ])('accepts a %s reason above', (_name, comment) => {
    expect(scanEslint(`${comment}\n// ${directive}`)).toStrictEqual([]);
  });

  it.each([
    ['empty block reason', '/** @todo */'],
    ['empty line reason', '// @todo   '],
    ['uppercase tag', '// @TODO reason'],
    ['blank line between', '// @todo reason\n'],
    ['nearest comment lacks the tag', '// @todo reason\n// other'],
  ])('flags %s', (_name, above) => {
    expect(scanEslint(`${above}\n// ${directive}`)).toHaveLength(1);
  });

  it('flags a same-line reason at the comment opener column', () => {
    const [violation] = scanEslint('foo(); // eslint-disable-line no-console -- because legacy');

    expect(violation).toMatchObject({ line: 1, column: 8, directive: 'eslint-disable-line' });
  });

  it('accepts a trailing line comment above', () => {
    expect(scanEslint(`foo(); // @todo reason\n// ${directive}`)).toStrictEqual([]);
  });

  it.each(['/* eslint-disable */', '/*eslint-disable*/', '// eslint-disable-line'])(
    'detects %s',
    (text) => {
      expect(scanEslint(text)).toHaveLength(1);
    }
  );

  it.each(['// eslint-enable', '// eslint-disable-foo', '/** eslint-disable */'])(
    'ignores %s',
    (text) => {
      expect(scanEslint(text)).toStrictEqual([]);
    }
  );

  it('requires a block comment reason for stylelint', () => {
    const line = '/* stylelint-disable-next-line color-no-hex */';

    expect(scanStylelint(`/* @todo brand palette */\n${line}`)).toStrictEqual([]);
    expect(scanStylelint(`// @todo brand palette\n${line}`)).toHaveLength(1);
  });

  it('flags a condition list with no reason after it', () => {
    expect(scanEslint(`// @todo [2027-01-01]\n// ${directive}`)).toHaveLength(1);
  });

  it('flags an unspaced condition list with no reason after it', () => {
    expect(scanEslint(`// @todo[2027-01-01]\n// ${directive}`)).toHaveLength(1);
  });

  it.each([
    ['spaced condition with a reason', '// @todo [2027-01-01] drop it'],
    ['unspaced condition with a reason', '// @todo[2027-01-01] drop it'],
    ['bare reason', '// @todo drop it'],
  ])('accepts a %s above', (_name, comment) => {
    expect(scanEslint(`${comment}\n// ${directive}`)).toStrictEqual([]);
  });

  it('flags a block comment condition list with no reason for stylelint', () => {
    const line = '/* stylelint-disable-next-line color-no-hex */';

    expect(scanStylelint(`/* @todo [2027-01-01] */\n${line}`)).toHaveLength(1);
  });

  it('accepts a block comment condition list followed by a reason for stylelint', () => {
    const line = '/* stylelint-disable-next-line color-no-hex */';

    expect(scanStylelint(`/* @todo [2027-01-01] drop it */\n${line}`)).toStrictEqual([]);
  });

  it('reports each tool of a multi-tool file', () => {
    const source = '// eslint-disable-next-line x\na();\n/* stylelint-disable */';
    const violations = scanSource(
      source,
      'a.vue',
      ['eslint', 'stylelint'],
      DEFAULT_TOOLS,
      DEFAULT_RULES,
      noPackageJson
    );

    expect(violations.map(({ tool }) => tool)).toStrictEqual(['eslint', 'stylelint']);
  });

  it('uses the generic message for a custom reason', () => {
    const tools = { custom: { directive: /(?:\/\/)\s*(custom-off)/g, reason: /why:/ } };

    expect(
      scanSource('// custom-off', 'a.ts', ['custom'], tools, DEFAULT_RULES, noPackageJson)[0]
        ?.message
    ).toBe('custom-off has no reason above it');
  });

  it('gives CRLF sources the same verdicts as LF', () => {
    const source = '// @todo ok\n// eslint-disable-next-line a\nfoo();\n  // eslint-disable-line b';
    const crlf = source.replaceAll('\n', '\r\n');

    expect(scanEslint(crlf)).toStrictEqual(scanEslint(source));
    expect(scanEslint(crlf)).toMatchObject([{ line: 4, column: 3 }]);
  });
});

describe('scanSource conditions', () => {
  const scanWithRules = (
    source: string,
    rules: Partial<typeof DEFAULT_RULES>,
    readPackageJson: () => null = noPackageJson
  ) =>
    scanSource(
      source,
      'a.ts',
      ['eslint'],
      DEFAULT_TOOLS,
      { ...DEFAULT_RULES, ...rules },
      readPackageJson
    );

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-29T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports an expired date condition', () => {
    expect(scanEslint(`// @todo [2020-01-01] r\n// ${directive}`)).toMatchObject([
      {
        rule: 'expired',
        severity: 'error',
        message: 'eslint-disable-next-line has an expired @todo condition [2020-01-01]',
      },
    ]);
  });

  it('reports an invalid condition with its detail', () => {
    const violations = scanEslint(`// @todo [2999-01-01, foo bar] r\n// ${directive}`);

    expect(violations).toHaveLength(1);
    expect(violations[0]?.rule).toBe('invalidCondition');
    expect(violations[0]?.message).toMatch(
      /^eslint-disable-next-line has an invalid @todo condition \[foo bar\]: /
    );
  });

  it('reports a @todo without a date when missingDate is on', () => {
    expect(scanWithRules(`// @todo r\n// ${directive}`, { missingDate: 'error' })).toMatchObject([
      {
        rule: 'missingDate',
        message: 'eslint-disable-next-line has a @todo without a date condition',
      },
    ]);
  });

  it('ignores a missing date with the default rules', () => {
    expect(scanEslint(`// @todo r\n// ${directive}`)).toStrictEqual([]);
  });

  it('reports only missingReason when there is no comment above', () => {
    expect(
      scanWithRules(`// ${directive}`, { missingDate: 'error' }).map(({ rule }) => rule)
    ).toStrictEqual(['missingReason']);
  });

  it('still checks conditions when missingReason is off', () => {
    expect(
      scanWithRules(`// @todo [2020-01-01] r\n// ${directive}`, { missingReason: 'off' }).map(
        ({ rule }) => rule
      )
    ).toStrictEqual(['expired']);
  });

  it('reports conditions in bracket order, then missingDate', () => {
    expect(
      scanWithRules(`// @todo [foo bar, +lodash] r\n// ${directive}`, { missingDate: 'warn' }).map(
        ({ rule, severity }) => `${rule}:${severity}`
      )
    ).toStrictEqual(['invalidCondition:error', 'invalidCondition:error', 'missingDate:warn']);
  });

  it('never reads package.json for a date-only condition', () => {
    const readPackageJson = vi.fn(noPackageJson);
    scanWithRules(`// @todo [2999-01-01] r\n// ${directive}`, {}, readPackageJson);

    expect(readPackageJson).not.toHaveBeenCalled();
  });
});

describe('DEFAULT_EXTENSIONS', () => {
  it('maps exactly the fifteen contract extensions', () => {
    expect(DEFAULT_EXTENSIONS).toStrictEqual({
      html: ['eslint', 'stylelint'],
      svelte: ['eslint', 'stylelint'],
      vue: ['eslint', 'stylelint'],
      less: ['stylelint'],
      sass: ['stylelint'],
      scss: ['stylelint'],
      css: ['stylelint'],
      tsx: ['eslint'],
      cts: ['eslint'],
      mts: ['eslint'],
      ts: ['eslint'],
      jsx: ['eslint'],
      cjs: ['eslint'],
      mjs: ['eslint'],
      js: ['eslint'],
    });
  });
});
