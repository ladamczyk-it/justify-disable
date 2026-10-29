import { describe, expect, it } from 'vitest';

import { DEFAULT_CONCURRENCY, DEFAULT_EXTENSIONS, DEFAULT_TOOLS } from './defaults.ts';
import { resolveConfig, selectFiles } from './resolve.ts';

const tsTool = { directive: /\/\/\s*(@ts-ignore)/, reason: /@todo[ \t]+\S/g };
const concurrencyError = 'concurrency must be a positive integer';

describe('resolveConfig', () => {
  it('returns the defaults for an empty config', () => {
    const resolved = resolveConfig();

    expect(resolved.tools.eslint?.directive.source).toBe(DEFAULT_TOOLS.eslint.directive.source);
    expect(resolved.tools.eslint?.reason).toBe(DEFAULT_TOOLS.eslint.reason);
    expect(resolved.tools.stylelint?.reason).toBe(DEFAULT_TOOLS.stylelint.reason);
    expect(resolved.extensions).toStrictEqual(DEFAULT_EXTENSIONS);
    expect(resolved.ignorePatterns).toStrictEqual([]);
    expect(resolved.concurrency).toBe(DEFAULT_CONCURRENCY);
  });

  it('adds a custom tool with normalised flags without mutating the input', () => {
    const resolved = resolveConfig({ tools: { ts: tsTool } });

    expect(Object.keys(resolved.tools)).toStrictEqual(['eslint', 'stylelint', 'ts']);
    expect(resolved.tools.ts?.directive.flags).toBe('g');
    expect(resolved.tools.ts?.reason.flags).toBe('');
    expect(tsTool.directive.flags).toBe('');
    expect(tsTool.reason.flags).toBe('g');
  });

  it('replaces only the overridden extension entry', () => {
    const resolved = resolveConfig({ extensions: { ts: ['eslint', 'ts'] }, tools: { ts: tsTool } });

    expect(resolved.extensions.ts).toStrictEqual(['eslint', 'ts']);
    expect(resolved.extensions.tsx).toStrictEqual(['eslint']);
  });

  it('throws on an extension naming an unknown tool', () => {
    expect(() => resolveConfig({ extensions: { ts: ['nope'] } })).toThrow('unknown tool "nope"');
  });

  it.each([
    [{ concurrency: 0 }, undefined],
    [{ concurrency: 1.5 }, undefined],
    [{}, -1],
  ])('rejects invalid concurrency %j / %j', (config, override) => {
    expect(() => resolveConfig(config, override)).toThrow(concurrencyError);
  });

  it('prefers the concurrency override', () => {
    expect(resolveConfig({ concurrency: 8 }, 2).concurrency).toBe(2);
  });

  it('prepends **/ to slash-less ignore patterns only', () => {
    expect(
      resolveConfig({ ignorePatterns: ['*.d.ts', 'fixtures/**'] }).ignorePatterns
    ).toStrictEqual(['**/*.d.ts', 'fixtures/**']);
  });
});

describe('selectFiles', () => {
  const resolved = resolveConfig({ ignorePatterns: ['*.d.ts', 'fixtures/**'] });

  it('maps files by extension and drops unmapped ones', () => {
    expect(
      selectFiles(
        [{ path: 'src/a.TS' }, { path: 'b.scss' }, { path: 'App.vue' }, { path: 'README.md' }],
        resolved
      )
    ).toStrictEqual([
      { path: 'src/a.TS', tools: ['eslint'] },
      { path: 'b.scss', tools: ['stylelint'] },
      { path: 'App.vue', tools: ['eslint', 'stylelint'] },
    ]);
  });

  it('uses explicit tools even for unmapped extensions', () => {
    expect(
      selectFiles(
        [
          { path: 'App.vue', tools: ['eslint'] },
          { path: 'README.md', tools: ['eslint'] },
        ],
        resolved
      )
    ).toStrictEqual([
      { path: 'App.vue', tools: ['eslint'] },
      { path: 'README.md', tools: ['eslint'] },
    ]);
  });

  it('throws on an explicit unknown tool', () => {
    expect(() => selectFiles([{ path: 'a.ts', tools: ['nope'] }], resolved)).toThrow(
      'unknown tool "nope"'
    );
  });

  it('drops ignored paths', () => {
    expect(
      selectFiles(
        [
          { path: 'src/x.d.ts' },
          { path: 'x.d.ts' },
          { path: 'fixtures/a.ts' },
          { path: 'src/fixtures-a.ts' },
        ],
        resolved
      )
    ).toStrictEqual([{ path: 'src/fixtures-a.ts', tools: ['eslint'] }]);
  });

  it('throws on an absolute path', () => {
    expect(() => selectFiles([{ path: '/abs/a.ts' }], resolved)).toThrow(
      'provider returned an absolute path: /abs/a.ts'
    );
  });
});
