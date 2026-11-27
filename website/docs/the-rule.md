---
title: 'When a lint disable counts as justified'
sidebar_label: 'The rule'
sidebar_position: 2
description: 'What counts as a @todo reason above an eslint-disable or stylelint-disable directive: the defaults, what a run scans and the known limits.'
keywords:
  [eslint-disable reason, stylelint-disable, lint suppression, todo comment, justify eslint-disable]
---

The comment ending on the line directly above a disable directive must contain `@todo <text>` (case-sensitive).

```ts
/**
 * @todo Legacy API returns `any`; type it once the SDK is upgraded.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const response: any = await legacyCall();
```

- Multi-line `/** @todo … */` is the recommended style.
- `//`, `/* */` and JSX `{/* */}` comments are accepted in JS-family files. CSS-family files accept block comments only.
- A blank line between the comment and the directive breaks the link.
- A same-line `-- reason` (`// eslint-disable-line no-console -- why`) does not count.
- A bracketed condition may follow `@todo` (`@todo [2030-01-01] <text>`), see [todo conditions](./todo-conditions.md).

## Defaults

Directives checked:

- `eslint-disable`
- `eslint-disable-next-line`
- `eslint-disable-line`
- `stylelint-disable`
- `stylelint-disable-next-line`
- `stylelint-disable-line`

Extensions and the tools applied to them:

| Extension                                            | Tools                 |
| ---------------------------------------------------- | --------------------- |
| `js`, `mjs`, `cjs`, `jsx`, `ts`, `mts`, `cts`, `tsx` | `eslint`              |
| `css`, `scss`, `sass`, `less`                        | `stylelint`           |
| `vue`, `svelte`, `html`                              | `eslint`, `stylelint` |

## Scope

Files come from `git ls-files`: tracked and untracked, with `.gitignore` respected. Positional paths are passed to git as pathspecs. Running outside a git repository is an error (exit `2`), unless you configure a `provider`.

## Known limits

- Directives inside string literals are reported (the scan is textual, not a parse). Exclude such files with `ignorePatterns`.
- HTML `<!-- eslint-disable -->` comments are not in the defaults. `html` files are scanned only for `//` and `/* */` directives.
