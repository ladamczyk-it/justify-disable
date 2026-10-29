import { describe, expect, it } from 'vitest';

import { parseConditions } from './todo.ts';

const kinds = (comment: string) => parseConditions(comment).map(({ kind }) => kind);

describe('parseConditions', () => {
  it('returns [] without a bracket directly after @todo', () => {
    expect(parseConditions('// @todo drop it')).toStrictEqual([]);
    expect(parseConditions('// no tag [2027-01-01]')).toStrictEqual([]);
  });

  it('classifies every token kind in order', () => {
    const conditions = parseConditions(
      '// @todo [2027-01-01, >=2, +lodash, -left-pad, lodash@>4, @scope/pkg@^2, engine:node@>=24] r'
    );

    expect(conditions.map(({ kind }) => kind)).toStrictEqual([
      'date',
      'version',
      'added',
      'removed',
      'dependency',
      'dependency',
      'engine',
    ]);
    expect(conditions[5]).toMatchObject({ name: '@scope/pkg', range: '^2' });
    expect(conditions[6]).toMatchObject({ engine: 'node', range: '>=24' });
  });

  it('allows no space between @todo and the bracket', () => {
    expect(parseConditions('// @todo[<2] r')).toMatchObject([{ kind: 'version', range: '<2' }]);
  });

  it('marks a calendar-impossible date invalid', () => {
    expect(parseConditions('// @todo [2027-02-30] r')).toMatchObject([
      { kind: 'invalid', token: '2027-02-30' },
    ]);
  });

  it('marks match-all ranges invalid', () => {
    expect(kinds('// @todo [*] r')).toStrictEqual(['invalid']);
    expect(kinds('// @todo [x] r')).toStrictEqual(['invalid']);
    expect(kinds('// @todo [lodash@*] r')).toStrictEqual(['invalid']);
  });

  it('marks a second date or second own-version token invalid', () => {
    expect(parseConditions('// @todo [2027-01-01, 2028-01-01] r')).toMatchObject([
      { kind: 'date' },
      { kind: 'invalid', token: '2028-01-01' },
    ]);
    expect(kinds('// @todo [>1, >2] r')).toStrictEqual(['version', 'invalid']);
  });

  it('marks empty and unclassifiable tokens invalid', () => {
    expect(kinds('// @todo [, foo bar] r')).toStrictEqual(['invalid', 'invalid']);
  });

  it('examines only the first @todo', () => {
    expect(parseConditions('/**\n * @todo r\n * @todo [2020-01-01] r2\n */')).toStrictEqual([]);
  });

  it('does not let a bracket body cross a newline', () => {
    expect(parseConditions('// @todo [2027-01-01\n// ] r')).toStrictEqual([]);
  });
});
