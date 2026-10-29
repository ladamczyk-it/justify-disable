import semver from 'semver';

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
  return semver.subset('*', range, { includePrerelease: true })
    ? `"${range}" matches every version`
    : null;
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
  if (
    (token.startsWith('+') || token.startsWith('-')) &&
    token.length > 1 &&
    !ENGINE_TOKEN.test(token)
  ) {
    return { kind: token.startsWith('+') ? 'added' : 'removed', token, name: token.slice(1) };
  }
  return classifyRanged(token, seen);
};

export const parseConditions = (comment: string): TCondition[] => {
  const tag = comment.indexOf('@todo');
  if (tag === -1) {
    return [];
  }
  CONDITION_LIST.lastIndex = tag + '@todo'.length;
  const match = CONDITION_LIST.exec(comment);
  if (!match) {
    return [];
  }
  const seen = { date: false, version: false };
  return (match[1] ?? '').split(',').map((token) => classify(token.trim(), seen));
};
