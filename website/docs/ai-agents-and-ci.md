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

## Why agents add lint disables

An agent is asked to make the checks pass. When a lint error is hard to fix, a disable comment is the shortest diff that turns the run green, and the diff reads as done. The suppression lands with no explanation, and a reviewer skimming a large change rarely stops on one comment line.

```diff
+ // eslint-disable-next-line @typescript-eslint/no-floating-promises
  saveDraft(state);
```

With justify-disable in the loop, that diff fails. The agent either fixes the code or states its reason where the reviewer will see it:

```diff
+ // @todo [2030-01-01] saveDraft is fire-and-forget until the queue lands; await it then.
+ // eslint-disable-next-line @typescript-eslint/no-floating-promises
  saveDraft(state);
```

## Ban or justify

Banning every disable comment sounds stricter, but real code has real exceptions, and a ban pushes them into config overrides nobody reads. Requiring a reason keeps the exception next to the code, and a [todo condition](./todo-conditions.md) makes sure it is looked at again. To forbid disabling particular rules outright, pair this with `eslint-comments/no-restricted-disable`; see [Alternatives](./alternatives.md).

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

As a GitHub Actions job (`CI=true` is set there, so the run never prompts):

```yaml
name: lint-suppressions
on: [pull_request]
jobs:
  justify-disable:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 24
      - run: npx @ladamczyk/justify-disable
```

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
