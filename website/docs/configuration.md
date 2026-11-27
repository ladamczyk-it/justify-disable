---
title: 'Configuration file reference'
sidebar_label: 'Configuration'
sidebar_position: 4
description: 'Everything justify-disable.config.ts can set: custom tools and directives such as @ts-ignore, extensions, ignorePatterns and rules.'
keywords:
  [justify-disable config, ts-ignore, custom directives, lint rules severity, ignorePatterns]
---

Create `justify-disable.config.ts` (or `.js`, `.mjs`, `.cjs`) in the working directory (or any parent, up to the nearest directory containing a `package.json` or `package.yaml`) and default-export an object. Every key is optional.

```ts
import type { IJustifyDisableConfig } from '@ladamczyk/justify-disable';

export default {
  ignorePatterns: ['*.d.ts', 'dist/**'],
  concurrency: 32,
  stats: false,
} satisfies IJustifyDisableConfig;
```

## `tools` and `extensions`

Both merge over the defaults:

- `tools` is merged by key over `DEFAULT_TOOLS`: a new key adds a tool, an existing key (`eslint`, `stylelint`) replaces that tool. Each tool is `{ directive, reason }`: `directive` is a regex whose capture group 1 is the directive name, `reason` is tested against the comment above (delimiters included).
- `extensions` is merged by key over `DEFAULT_EXTENSIONS`: a key (extension without the dot, lowercase) replaces that entry; every other extension keeps its default. Tool names must exist in `tools`, otherwise `unknown tool "<name>"` is thrown.

Because a key replaces the whole entry, extending one means spreading the default. Example: also check `@ts-ignore` in TypeScript files.

```ts
import { DEFAULT_EXTENSIONS } from '@ladamczyk/justify-disable';

import type { IJustifyDisableConfig } from '@ladamczyk/justify-disable';

export default {
  tools: {
    tsIgnore: {
      directive: /(?:\/\/|\/\*)\s*(@ts-ignore)(?=\s|\*\/|$)/gm,
      reason: /@todo[ \t]+[^\s*]/,
    },
  },
  extensions: {
    ts: [...DEFAULT_EXTENSIONS.ts, 'tsIgnore'],
    mts: [...DEFAULT_EXTENSIONS.mts, 'tsIgnore'],
    cts: [...DEFAULT_EXTENSIONS.cts, 'tsIgnore'],
    tsx: [...DEFAULT_EXTENSIONS.tsx, 'tsIgnore'],
  },
} satisfies IJustifyDisableConfig;
```

## `ignorePatterns`

Matched against the posix path (relative to the working directory) with `path.matchesGlob`. This is not gitignore:

- A pattern with no `/` gets `**/` prepended, so it is matched against the path at any depth: `*.d.ts` matches both `x.d.ts` and `src/x.d.ts`.
- It still has to match the whole path. `dist` matches only a path whose last segment is `dist`, never the files under `dist/`. To ignore a directory, write `dist/**`.

## `concurrency`

Number of files read in parallel, a positive integer, default `64` (`DEFAULT_CONCURRENCY`). The `--concurrency` flag and the `concurrency` option of `lint()` override it.

## `rules`

Four rules, each with a severity. Merged by key over `DEFAULT_RULES`:

| Rule               | Default | Reports                                       |
| ------------------ | ------- | --------------------------------------------- |
| `missingReason`    | `error` | a directive with no `@todo <reason>` above it |
| `expired`          | `error` | a `@todo` condition that is met               |
| `invalidCondition` | `error` | a `@todo` condition that cannot be checked    |
| `missingDate`      | `off`   | a `@todo` with no date condition              |

`error` fails the run (exit `1`). `warn` is printed with a `⚠` and exits `0`. `off` reports nothing. `passed` is false only when some violation has `error` severity. An unknown rule name, or a severity other than `error`, `warn` or `off`, throws.

```ts
import type { IJustifyDisableConfig } from '@ladamczyk/justify-disable';

export default {
  rules: { missingDate: 'warn', expired: 'warn' },
} satisfies IJustifyDisableConfig;
```

The conditions these rules report are described in [todo conditions](./todo-conditions.md).

## `provider`

The extension point for where files come from. It replaces the default git provider (`gitProvider`); the qoq provider lives in qoq, not here.

```ts
type TFileProvider = (context: IProviderContext) => IProvidedFile[] | Promise<IProvidedFile[]>;

interface IProviderContext {
  paths: string[]; // the positional CLI paths (or `lint({ paths })`), [] when none
}

interface IProvidedFile {
  path: string; // posix, relative to the working directory
  tools?: string[]; // when present, these tools apply and the extension map is skipped
}
```

`context.paths` is passed through exactly as given, unexpanded; interpreting it is the provider's job. An absolute path is an error.
