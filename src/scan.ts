import { DEFAULT_TOOLS } from './defaults.ts';

import type { IToolDirectives, IViolation } from './types.ts';

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

export const scanSource = (
  source: string,
  path: string,
  toolNames: string[],
  tools: Record<string, IToolDirectives>
): IViolation[] => {
  const violations: IViolation[] = [];
  let lineStarts: number[] | undefined;
  for (const tool of toolNames) {
    const { directive, reason } = tools[tool]!;
    const message =
      reason === (DEFAULT_TOOLS as Record<string, IToolDirectives>)[tool]?.reason
        ? ' @todo reason'
        : ' reason';
    for (const match of source.matchAll(directive)) {
      lineStarts ??= findLineStarts(source);
      const lineIndex = findLineIndex(lineStarts, match.index);
      const comment = findCommentAbove(source, lineStarts, lineIndex);
      if (comment !== undefined && reason.test(comment)) {
        continue;
      }
      violations.push({
        path,
        line: lineIndex + 1,
        column: match.index - lineStarts[lineIndex]! + 1,
        directive: match[1]!,
        tool,
        message: `${match[1]!} has no${message} above it`,
      });
    }
  }
  return violations;
};
