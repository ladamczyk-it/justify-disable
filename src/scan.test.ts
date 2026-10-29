import { describe, expect, it } from 'vitest';

import { DEFAULT_EXTENSIONS, DEFAULT_TOOLS } from './defaults.ts';
import { scanSource } from './scan.ts';

const scanEslint = (source: string) => scanSource(source, 'a.ts', ['eslint'], DEFAULT_TOOLS);
const scanStylelint = (source: string) => scanSource(source, 'a.css', ['stylelint'], DEFAULT_TOOLS);
const directive = 'eslint-disable-next-line no-console\nfoo();';

describe('scanSource', () => {
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

  it('reports each tool of a multi-tool file', () => {
    const source = '// eslint-disable-next-line x\na();\n/* stylelint-disable */';
    const violations = scanSource(source, 'a.vue', ['eslint', 'stylelint'], DEFAULT_TOOLS);

    expect(violations.map(({ tool }) => tool)).toStrictEqual(['eslint', 'stylelint']);
  });

  it('uses the generic message for a custom reason', () => {
    const tools = { custom: { directive: /(?:\/\/)\s*(custom-off)/g, reason: /why:/ } };

    expect(scanSource('// custom-off', 'a.ts', ['custom'], tools)[0]?.message).toBe(
      'custom-off has no reason above it'
    );
  });

  it('gives CRLF sources the same verdicts as LF', () => {
    const source = '// @todo ok\n// eslint-disable-next-line a\nfoo();\n  // eslint-disable-line b';
    const crlf = source.replaceAll('\n', '\r\n');

    expect(scanEslint(crlf)).toStrictEqual(scanEslint(source));
    expect(scanEslint(crlf)).toMatchObject([{ line: 4, column: 3 }]);
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
