---
title: 'qoq integration'
sidebar_label: 'qoq integration'
sidebar_position: 8
description: 'Turn the check on inside qoq --check: the justifyDisable severity, which files it scans, how it differs from a standalone run, and how /qoq fix reports it.'
keywords: [qoq, qoq-cli, ai quality gate, justify-disable, eslint-disable check, claude code skill]
---

[qoq](https://qoq.adamczyk.ovh/) is a quality suite for JavaScript and TypeScript projects (ESLint, Prettier, Knip, JSCPD and more behind one CLI) and a Claude Code skill that turns those checks into a guarded delivery loop. This is one of qoq's optional checks: `@ladamczyk/qoq-cli` calls its [JavaScript API](./javascript-api.md) in-process, so with `severity: 'error'` an unexplained lint disable fails `qoq --check`.

## Turn it on

It is off by default. Add a `justifyDisable` section to `qoq.config.js`, or pick `warn` or `error` in qoq's config wizard, which also installs `@ladamczyk/justify-disable` as an optional peer:

```js
// qoq.config.js
export default {
  justifyDisable: {
    severity: 'error', // 'warn' | 'error' | 'off' (default)
  },
};
```

- `error` fails `qoq --check` on any violation; `warn` reports them and passes.
- `--skip-justify-disable` skips it for one run.
- Outside a git repository it prints a warning and passes.

## How it differs from a standalone run

- **qoq's config wins.** qoq passes its own config to `lint()`, so a `justify-disable.config.*` in the project is not read. `severity` applies to `missingReason`, `expired` and `invalidCondition`; `missingDate` stays off.
- **qoq's scope.** It scans the files your qoq ESLint entries (`files` / `ignores`) or Stylelint glob cover, limited to the extensions assigned to each tool, and only staged files when qoq checks staged files.

## Reports and /qoq fix

`qoq --check --json` writes `justify-disable-report.json`, the same object as `justify-disable --json`. A failed run suggests `/qoq fix`. qoq's skill lists each finding by rule and marks them **not auto-fixable**: the fix is a `@todo <reason>` comment on the line above the directive, or removing the directive. Warnings count as findings too, so `/qoq fix` works through them as well.
