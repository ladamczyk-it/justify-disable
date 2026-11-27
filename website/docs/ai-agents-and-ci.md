---
title: 'Lint suppression guardrail for AI agents and CI'
sidebar_label: 'AI agents and CI'
sidebar_position: 7
description: 'Stop AI coding agents and CI merges from silencing lint errors without a reason: JSON output, exit codes, warnings and an AGENTS.md snippet.'
keywords:
  [
    ai coding agent eslint-disable,
    agents.md,
    lint quality gate,
    ci lint check,
    eslint-disable json,
    claude code,
  ]
---

A guardrail for AI coding agents such as Claude Code, Codex or Cursor, and a gate for CI. An agent that silences a lint error with `eslint-disable` must also write down why, in a `@todo` comment a reviewer can read, and the run fails until it does.

## The contract

- **Exit codes.** `0` when no violation has `error` severity (warnings may still be printed), `1` when at least one does, `2` on any other error: a bad config, not a git repository, a pathspec that matched no files.
- **JSON output.** `--json` prints one object to stdout. Its shape is documented below and kept stable within a major version; it carries no schema version field.
- **Never interactive.** Runs with `--json`, with `CI=true`, or without a terminal on stdin and stdout are never prompted.
- **Severities.** Each rule (`missingReason`, `expired`, `invalidCondition`, `missingDate`) is `error`, `warn` or `off` in the [config](./configuration.md). Only `error` violations change the exit code.

```json
{
  "passed": false,
  "scanned": 42,
  "violations": [
    {
      "path": "src/api.ts",
      "line": 12,
      "column": 1,
      "directive": "eslint-disable-next-line",
      "tool": "eslint",
      "rule": "missingReason",
      "severity": "error",
      "message": "eslint-disable-next-line has no @todo reason above it"
    }
  ]
}
```

`line` and `column` are 1-based and point at the start of the directive's comment. When the run itself fails, `--json` prints `{ "passed": false, "error": "<message>" }` and exits `2`.

## CI example

```bash
npx @ladamczyk/justify-disable            # whole repository
npx @ladamczyk/justify-disable src styles # only these pathspecs
npx @ladamczyk/justify-disable --json > justify-disable-report.json
```

Files come from `git ls-files`, so tracked and untracked-but-not-ignored files are checked and `.gitignore` is respected.

## AGENTS.md snippet

Paste this into your `AGENTS.md` or `CLAUDE.md`:

```markdown
## Lint suppressions

- Fix the code instead of disabling a lint rule whenever you can.
- If a disable is truly needed, put a comment directly above the directive, with no blank line between:
  `// @todo <why this rule is disabled here and what would let us remove it>`
  In CSS the reason must be a block comment: `/* @todo <reason> */`.
- When the disable should not live forever, add a condition: `// @todo [2030-01-01] <reason>` or `// @todo [some-package@^5] <reason>`.
- Run `npx @ladamczyk/justify-disable --json` before finishing. Exit code 1 means a suppression has no reason or its reason expired.
```

## From JavaScript

[`lint()`](./javascript-api.md) returns the same object `--json` prints, so tools running in Node can call it in-process.

## Inside qoq

[qoq](https://qoq.adamczyk.ovh/) can run this check as part of `qoq --check`, as a warning or as a failing check. See [qoq integration](./qoq.md).
