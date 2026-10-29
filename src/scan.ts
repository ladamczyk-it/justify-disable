import { DEFAULT_TOOLS } from './defaults.ts';
import { evaluateCondition, parseConditions } from './todo.ts';

import type {
  IPackageJson,
  IToolDirectives,
  IViolation,
  TRuleName,
  TRuleSeverity,
} from './types.ts';

type TFinding = Pick<IViolation, 'rule' | 'message'>;

/** Condition findings for a comment that passed the reason check, in bracket order, then missingDate. */
const findConditionProblems = (
  comment: string,
  directive: string,
  readPackageJson: () => IPackageJson | null
): TFinding[] => {
  const conditions = parseConditions(comment);
  const findings: TFinding[] = [];
  for (const condition of conditions) {
    const evaluation =
      condition.kind === 'invalid'
        ? { status: 'invalid' as const, detail: condition.detail }
        : evaluateCondition(condition, readPackageJson);
    if (evaluation.status === 'invalid') {
      findings.push({
        rule: 'invalidCondition',
        message: `${directive} has an invalid @todo condition [${condition.token}]: ${evaluation.detail}`,
      });
    } else if (evaluation.status === 'met') {
      findings.push({
        rule: 'expired',
        message: `${directive} has an expired @todo condition [${condition.token}]`,
      });
    }
  }
  if (!conditions.some(({ kind }) => kind === 'date')) {
    findings.push({
      rule: 'missingDate',
      message: `${directive} has a @todo without a date condition`,
    });
  }
  return findings;
};

const findLineStarts = (source: string): number[] => {
  const lineStarts = [0];
  for (let index = source.indexOf('\n'); index !== -1; index = source.indexOf('\n', index + 1)) {
    lineStarts.push(index + 1);
  }
  return lineStarts;
};

/** 0-based index of the line holding `offset`: the last line start at or before it. */
const findLineIndex = (lineStarts: number[], offset: number): number => {
  let low = 0;
  let high = lineStarts.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (lineStarts[middle]! <= offset) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }
  return low;
};

/** The comment ending on the line before `lineIndex`, delimiters included, or undefined. */
const findCommentAbove = (
  source: string,
  lineStarts: number[],
  lineIndex: number
): string | undefined => {
  if (lineIndex === 0) {
    return undefined;
  }
  const previousStart = lineStarts[lineIndex - 1]!;
  const previousLine = source.slice(previousStart, lineStarts[lineIndex]! - 1).replace(/\r$/, '');
  const blockEnd = previousLine.lastIndexOf('*/');
  const lineCommentStart = previousLine.indexOf('//', blockEnd === -1 ? 0 : blockEnd + 2);
  if (lineCommentStart !== -1) {
    return previousLine.slice(lineCommentStart);
  }
  if (blockEnd === -1) {
    return undefined;
  }
  const absoluteBlockEnd = previousStart + blockEnd;
  return source.slice(source.lastIndexOf('/*', absoluteBlockEnd), absoluteBlockEnd + 2);
};

type TLocation = Omit<IViolation, 'rule' | 'severity' | 'message'>;

/** The finding as a violation at `location`, or nothing when its rule is off. */
const toViolation = (
  location: TLocation,
  finding: TFinding,
  rules: Record<TRuleName, TRuleSeverity>
): IViolation[] => {
  const severity = rules[finding.rule];
  return severity === 'off' ? [] : [{ ...location, ...finding, severity }];
};

export const scanSource = (
  source: string,
  path: string,
  toolNames: string[],
  tools: Record<string, IToolDirectives>,
  rules: Record<TRuleName, TRuleSeverity>,
  readPackageJson: () => IPackageJson | null
): IViolation[] => {
  const violations: IViolation[] = [];
  let lineStarts: number[] | undefined;
  for (const tool of toolNames) {
    const { directive, reason } = tools[tool]!;
    // Identity, not source equality: resolveConfig returns an untouched default `reason` as-is so this still matches.
    const message =
      reason === (DEFAULT_TOOLS as Record<string, IToolDirectives>)[tool]?.reason
        ? ' @todo reason'
        : ' reason';
    for (const match of source.matchAll(directive)) {
      lineStarts ??= findLineStarts(source);
      const lineIndex = findLineIndex(lineStarts, match.index);
      const comment = findCommentAbove(source, lineStarts, lineIndex);
      const findings =
        comment !== undefined && reason.test(comment)
          ? findConditionProblems(comment, match[1]!, readPackageJson)
          : [{ rule: 'missingReason' as const, message: `${match[1]!} has no${message} above it` }];
      const location = {
        path,
        line: lineIndex + 1,
        column: match.index - lineStarts[lineIndex]! + 1,
        directive: match[1]!,
        tool,
      };
      violations.push(...findings.flatMap((finding) => toViolation(location, finding, rules)));
    }
  }
  return violations;
};
