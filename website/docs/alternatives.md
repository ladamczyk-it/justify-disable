---
title: 'Require a reason on eslint-disable: every option compared'
sidebar_label: 'Alternatives'
sidebar_position: 1.5
description: 'How to require a reason on eslint-disable and stylelint-disable: built-in options, eslint-comments, unicorn and justify-disable, and when each one fits.'
keywords:
  [
    require description eslint-disable,
    eslint-disable reason,
    stylelint-disable reason,
    reportDescriptionlessDisables,
    eslint-comments require-description,
    no-abusive-eslint-disable,
    reportUnusedDisableDirectives,
  ]
---

**Short answer:** in ESLint, turn on `@eslint-community/eslint-comments/require-description`, which requires a `-- reason` after every directive. In Stylelint, set `reportDescriptionlessDisables: true`. Reach for justify-disable when you want one check for both linters that runs without either installed, puts the reason in a `@todo` comment above the directive, and can make that reason expire.

## What the linters already give you

**ESLint descriptions.** Any directive comment can carry a reason after two or more hyphens. ESLint core accepts the reason but cannot require it.

```ts
// eslint-disable-next-line no-console -- CLI output, not debug logging
console.log(result);
```

**`@eslint-community/eslint-comments/require-description`.** Reports ESLint directive comments without a `--` description. Its `ignore` option skips directive kinds, and `additionalDirectives` checks other comments such as `istanbul` or `c8`. The same plugin's `no-restricted-disable` forbids disabling the rules you list, whatever the reason.

**`unicorn/no-abusive-eslint-disable`.** Reports a disable that names no rule, such as a bare `// eslint-disable-next-line`. It does not ask for a reason.

**`linterOptions.reportUnusedDisableDirectives`.** Reports disable directives that no longer suppress anything (`"warn"` by default in ESLint 9). It removes stale disables but does not ask why the live ones exist.

**Stylelint `reportDescriptionlessDisables`.** Reports `stylelint-disable` comments without a description, written `/* stylelint-disable-next-line block-no-empty -- reason */`. The CLI flag is `--report-descriptionless-disables`.

**`unicorn/expiring-todo-comments`.** Makes `TODO` comments fail on a date, a package version or a dependency change. It applies to `TODO` comments, not to disable directives; justify-disable's [todo conditions](./todo-conditions.md) borrow its syntax for disables.

## Side by side

| Need                                  | Built-ins and plugins                       | justify-disable                                                |
| ------------------------------------- | ------------------------------------------- | -------------------------------------------------------------- |
| Reason required on ESLint disables    | `eslint-comments/require-description`       | yes                                                            |
| Reason required on Stylelint disables | `reportDescriptionlessDisables`             | yes                                                            |
| Where the reason goes                 | after `--` on the directive                 | a `@todo` comment on the line above                            |
| Reason expires                        | no                                          | date, own version, engine, dependency added, removed or ranged |
| Other directives (`@ts-ignore`, …)    | `additionalDirectives` (ESLint plugin only) | any, through `tools` config                                    |
| Runs without ESLint or Stylelint      | no                                          | yes, files come from git                                       |
| Forbid disabling specific rules       | `eslint-comments/no-restricted-disable`     | no                                                             |
| Remove disables that suppress nothing | `reportUnusedDisableDirectives`             | no                                                             |

The two styles do not mix: justify-disable does not accept a same-line `-- reason`, so a codebase that already uses `require-description` would have to move its reasons into `@todo` comments. See [the rule](./the-rule.md).

## When you don't need justify-disable

- You only run ESLint and a same-line `-- reason` is enough: use `require-description`.
- You only run Stylelint: use `reportDescriptionlessDisables`.
- You want certain rules never disabled: use `no-restricted-disable`. A reason won't help there.

## When it fits

- ESLint and Stylelint directives (and `@ts-ignore` or other custom ones) should follow one rule and one report.
- A suppression should expire: on a date, when your package reaches a version, or when a dependency is added, removed or upgraded.
- The check has to run where the linters don't, for example as a fast CI step or as the last thing an [AI coding agent](./ai-agents-and-ci.md) runs before it finishes.
- You already use [qoq](./qoq.md), where it is one config line.

It works alongside the rules above: keep `reportUnusedDisableDirectives` and `no-restricted-disable` on, and let justify-disable own the reasons.
