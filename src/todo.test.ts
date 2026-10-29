import { afterEach, describe, expect, it, vi } from 'vitest';

import { evaluateCondition, parseConditions } from './todo.ts';

import type { IPackageJson } from './types.ts';

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
    expect(parseConditions('// @todo [2027-01-01\n// ] r')).toStrictEqual([
      { kind: 'invalid', token: '', detail: 'condition list must fit on one line' },
    ]);
  });
});

type TEvaluable = Parameters<typeof evaluateCondition>[0];

const evaluate = (condition: TEvaluable, pkg: IPackageJson | null) =>
  evaluateCondition(condition, () => pkg);
const ranged = (kind: 'version', range: string): TEvaluable => ({ kind, token: range, range });
const named = (kind: 'added' | 'removed', name: string): TEvaluable => ({
  kind,
  token: name,
  name,
});
const dependency = (name: string, range: string): TEvaluable => ({
  kind: 'dependency',
  token: `${name}@${range}`,
  name,
  range,
});
const engine = (name: string, range: string): TEvaluable => ({
  kind: 'engine',
  token: `engine:${name}@${range}`,
  engine: name,
  range,
});

describe('evaluateCondition', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('date is unmet on the day itself and met after it, without reading package.json', () => {
    const readPackageJson = vi.fn(() => null);
    const condition: TEvaluable = { kind: 'date', token: '2027-01-01', date: '2027-01-01' };
    vi.useFakeTimers({ toFake: ['Date'] });

    vi.setSystemTime(new Date('2027-01-01T23:59:00Z'));
    expect(evaluateCondition(condition, readPackageJson)).toStrictEqual({ status: 'unmet' });
    vi.setSystemTime(new Date('2027-01-02T00:00:00Z'));
    expect(evaluateCondition(condition, readPackageJson)).toStrictEqual({ status: 'met' });
    expect(readPackageJson).not.toHaveBeenCalled();
  });

  it('version compares the own package version, prereleases included', () => {
    expect(evaluate(ranged('version', '>=2'), { version: '2.0.0' })).toStrictEqual({
      status: 'met',
    });
    expect(evaluate(ranged('version', '>=2'), { version: '1.9.0' })).toStrictEqual({
      status: 'unmet',
    });
    expect(evaluate(ranged('version', '>1'), { version: '2.0.0-beta.1' })).toStrictEqual({
      status: 'met',
    });
  });

  it('version is invalid without a version or a package.json', () => {
    for (const pkg of [{}, null]) {
      expect(evaluate(ranged('version', '>=2'), pkg)).toStrictEqual({
        status: 'invalid',
        detail: expect.stringContaining('version'),
      });
    }
  });

  it('added and removed look in dependencies and devDependencies', () => {
    expect(evaluate(named('added', 'lodash'), { devDependencies: { lodash: '^4' } })).toStrictEqual(
      {
        status: 'met',
      }
    );
    expect(evaluate(named('added', 'lodash'), {})).toStrictEqual({ status: 'unmet' });
    expect(evaluate(named('removed', 'lodash'), {})).toStrictEqual({ status: 'met' });
    expect(evaluate(named('removed', 'lodash'), { dependencies: { lodash: '^4' } })).toStrictEqual({
      status: 'unmet',
    });
  });

  it('added ignores inherited members', () => {
    expect(evaluate(named('added', '__proto__'), {})).toStrictEqual({ status: 'unmet' });
  });

  it('dependency compares the minimum of the declared range', () => {
    const range = (declared: string) => ({ dependencies: { lodash: declared } });

    expect(evaluate(dependency('lodash', '>4'), range('^4.17.0'))).toStrictEqual({
      status: 'unmet',
    });
    expect(evaluate(dependency('lodash', '>4'), range('^5.0.0'))).toStrictEqual({ status: 'met' });
    expect(evaluate(dependency('lodash', '>4'), {})).toStrictEqual({
      status: 'invalid',
      detail: expect.stringContaining('not declared'),
    });
    expect(evaluate(dependency('lodash', '>4'), range('workspace:*')).status).toBe('invalid');
  });

  it('engine compares the minimum of the declared engine range', () => {
    const engines = (name: string, declared: string) => ({ engines: { [name]: declared } });

    expect(evaluate(engine('node', '>=24'), engines('node', '^24.15.0 || >=26.0.0'))).toStrictEqual(
      {
        status: 'met',
      }
    );
    expect(evaluate(engine('node', '>=24'), engines('node', '^22.22.2 || ^24.15.0'))).toStrictEqual(
      {
        status: 'unmet',
      }
    );
    expect(evaluate(engine('node', '>=24'), {}).status).toBe('invalid');
    expect(evaluate(engine('npm', '>10'), engines('npm', '>= 11'))).toStrictEqual({
      status: 'met',
    });
  });

  it('engine ignores inherited members', () => {
    expect(evaluate(engine('constructor', '>1'), { engines: {} }).status).toBe('invalid');
  });
});

describe('parseConditions parser fixes', () => {
  const multiLine = [{ kind: 'invalid', token: '', detail: 'condition list must fit on one line' }];

  it('flags a bracket closed on a later line', () => {
    expect(parseConditions('/**\n * @todo [2020-01-01,\n *   +lodash] r\n */')).toStrictEqual(
      multiLine
    );
  });

  it('flags a bracket that is never closed', () => {
    expect(parseConditions('// @todo [2020-01-01 r')).toStrictEqual(multiLine);
  });

  it('rejects >=0.0.0 as matching every version', () => {
    expect(kinds('// @todo [>=0.0.0] r')).toStrictEqual(['invalid']);
    expect(kinds('// @todo [lodash@>=0.0.0] r')).toStrictEqual(['invalid']);
  });

  it('keeps +name and -name as added and removed', () => {
    const conditions = parseConditions('// @todo [>=1, +lodash, -left-pad] r');

    expect(conditions.map(({ kind }) => kind)).toStrictEqual(['version', 'added', 'removed']);
    expect(conditions[1]).toMatchObject({ name: 'lodash' });
    expect(conditions[2]).toMatchObject({ name: 'left-pad' });
  });
});
