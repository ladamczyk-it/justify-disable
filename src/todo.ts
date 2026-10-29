import semver from 'semver';

import type { IPackageJson } from './types.ts';

export type TCondition =
  | { kind: 'date'; token: string; date: string }
  | { kind: 'version'; token: string; range: string }
  | { kind: 'engine'; token: string; engine: string; range: string }
  | { kind: 'added' | 'removed'; token: string; name: string }
  | { kind: 'dependency'; token: string; name: string; range: string }
  | { kind: 'invalid'; token: string; detail: string };

// The body skips `@` only when it starts another `@todo`: keeps the scan linear and
// lets `name@range` tokens through.
const CONDITION_LIST = /[ \t]*\[((?:[^\]\n@]|@(?!todo))*)\]/y;
const CONDITION_LIST_OPENER = /[ \t]*\[/y;
interface ISeen {
  date: boolean;
  version: boolean;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ENGINE_TOKEN = /^engine:([^@]+)@(.*)$/;

const isRealDate = (token: string) => {
  const parsed = new Date(`${token}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(token);
};

/** Returns the invalid detail for a range, or null when it constrains something. */
const rangeProblem = (range: string): string | null => {
  if (semver.validRange(range) === null) {
    return `"${range}" is not a valid semver range`;
  }
  return semver.subset('*', range) ? `"${range}" matches every version` : null;
};

const classifyDate = (token: string, seen: ISeen): TCondition => {
  if (!isRealDate(token)) {
    return { kind: 'invalid', token, detail: 'not a real calendar date' };
  }
  if (seen.date) {
    return { kind: 'invalid', token, detail: 'only one date condition is allowed' };
  }
  seen.date = true;
  return { kind: 'date', token, date: token };
};

const classifyRanged = (token: string, seen: ISeen): TCondition => {
  const [, engine = '', engineRange = ''] = ENGINE_TOKEN.exec(token) ?? [];
  if (engine) {
    const problem = rangeProblem(engineRange);
    return problem
      ? { kind: 'invalid', token, detail: problem }
      : { kind: 'engine', token, engine, range: engineRange };
  }
  const at = token.lastIndexOf('@');
  const range = at > 0 ? token.slice(at + 1) : token;
  const problem = rangeProblem(range);
  if (problem) {
    return { kind: 'invalid', token, detail: problem };
  }
  if (at > 0) {
    return { kind: 'dependency', token, name: token.slice(0, at), range };
  }
  if (seen.version) {
    return { kind: 'invalid', token, detail: 'only one version condition is allowed' };
  }
  seen.version = true;
  return { kind: 'version', token, range };
};

const classify = (token: string, seen: ISeen): TCondition => {
  if (token === '') {
    return { kind: 'invalid', token, detail: 'empty condition' };
  }
  if (ISO_DATE.test(token)) {
    return classifyDate(token, seen);
  }
  if ((token.startsWith('+') || token.startsWith('-')) && token.length > 1) {
    return { kind: token.startsWith('+') ? 'added' : 'removed', token, name: token.slice(1) };
  }
  return classifyRanged(token, seen);
};

export const parseConditions = (comment: string): TCondition[] => {
  const tag = comment.indexOf('@todo');
  if (tag === -1) {
    return [];
  }
  const listStart = tag + '@todo'.length;
  CONDITION_LIST.lastIndex = listStart;
  const match = CONDITION_LIST.exec(comment);
  if (!match) {
    CONDITION_LIST_OPENER.lastIndex = listStart;
    return CONDITION_LIST_OPENER.test(comment)
      ? [{ kind: 'invalid', token: '', detail: 'condition list must fit on one line' }]
      : [];
  }
  const seen = { date: false, version: false };
  return (match[1] ?? '').split(',').map((token) => classify(token.trim(), seen));
};

type TEvaluation = { status: 'met' | 'unmet' } | { status: 'invalid'; detail: string };

const invalid = (detail: string): TEvaluation => ({ status: 'invalid', detail });
const verdict = (met: boolean): TEvaluation => ({ status: met ? 'met' : 'unmet' });

// Own properties only: user-supplied names must not reach `Object.prototype` members.
const ownEntry = (record: Record<string, string> | undefined, name: string) =>
  record && Object.hasOwn(record, name) ? record[name] : undefined;

/** Lowest version a declared range allows; null for anything semver cannot read (`workspace:*`, URLs). */
const lowestVersion = (declared: string) =>
  semver.validRange(declared) === null ? null : semver.minVersion(declared);

const satisfiesFromDeclared = (declared: string, range: string, subject: string): TEvaluation => {
  const lowest = lowestVersion(declared);
  return lowest
    ? verdict(semver.satisfies(lowest, range, { includePrerelease: true }))
    : invalid(`${subject} range "${declared}" is not a semver range`);
};

const evaluateAgainst = (
  condition: Exclude<TCondition, { kind: 'invalid' | 'date' }>,
  pkg: IPackageJson
): TEvaluation => {
  switch (condition.kind) {
    case 'version':
      return semver.valid(pkg.version)
        ? verdict(
            semver.satisfies(pkg.version as string, condition.range, { includePrerelease: true })
          )
        : invalid('no version in package.json');
    case 'added':
    case 'removed': {
      const declared =
        ownEntry(pkg.dependencies, condition.name) !== undefined ||
        ownEntry(pkg.devDependencies, condition.name) !== undefined;
      return verdict(declared === (condition.kind === 'added'));
    }
    case 'dependency': {
      const declared =
        ownEntry(pkg.dependencies, condition.name) ?? ownEntry(pkg.devDependencies, condition.name);
      return declared === undefined
        ? invalid(`${condition.name} is not declared in package.json`)
        : satisfiesFromDeclared(declared, condition.range, condition.name);
    }
    default: {
      const declared = ownEntry(pkg.engines, condition.engine);
      return declared === undefined
        ? invalid(`no engines.${condition.engine} in package.json`)
        : satisfiesFromDeclared(declared, condition.range, `engines.${condition.engine}`);
    }
  }
};

export const evaluateCondition = (
  condition: Exclude<TCondition, { kind: 'invalid' }>,
  readPackageJson: () => IPackageJson | null
): TEvaluation => {
  if (condition.kind === 'date') {
    return verdict(new Date().toISOString().slice(0, 10) > condition.date);
  }
  const pkg = readPackageJson();
  return pkg
    ? evaluateAgainst(condition, pkg)
    : invalid(`no package.json found (needed for the ${condition.kind} condition)`);
};
