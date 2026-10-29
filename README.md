# @ladamczyk/justify-disable

## Rationale

Suppressions without a stated reason rot: nobody remembers why a rule was switched off, so nobody dares to switch it back on. `justify-disable` fails when an `eslint-disable` or `stylelint-disable` directive has no `@todo <reason>` comment directly above it.

It is heavily inspired by unicorn's [`expiring-todo-comments`](https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/expiring-todo-comments.md). A `@todo` can carry a bracketed condition (`@todo [2030-01-01] …`) that expires it: a date, the project's own version, an engine or dependency range, or a dependency being added or removed. See [todo conditions](docs/todo-conditions.md).

## Install

```bash
npm install --save-dev @ladamczyk/justify-disable
```

or run it directly:

```bash
npx @ladamczyk/justify-disable
```

## The rule

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
- A bracketed condition may follow `@todo` (`@todo [2030-01-01] <text>`), see [todo conditions](docs/todo-conditions.md).

### Defaults

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

### Scope

Files come from `git ls-files`: tracked and untracked, with `.gitignore` respected. Positional paths are passed to git as pathspecs. Running outside a git repository is an error (exit `2`), unless you configure a `provider`.

### Known limits

- Directives inside string literals are reported (the scan is textual, not a parse). Exclude such files with `ignorePatterns`.
- HTML `<!-- eslint-disable -->` comments are not in the defaults. `html` files are scanned only for `//` and `/* */` directives.

## Usage

```bash
justify-disable                  # scan the whole repo
justify-disable src docs/a.ts    # scan only these pathspecs
justify-disable --json           # machine-readable output
justify-disable --concurrency 8  # read 8 files in parallel
justify-disable -h               # list all options
```

| Option              | Default | Description                                |
| ------------------- | ------- | ------------------------------------------ |
| `--json`            | —       | Emit machine-readable JSON instead of text |
| `--concurrency <n>` | `64`    | Files read in parallel (positive integer)  |

| Exit code | Meaning                                         |
| --------- | ----------------------------------------------- |
| `0`       | No unjustified directives                       |
| `1`       | At least one `error`-severity violation         |
| `2`       | Any error (bad config, not a git repository, …) |

## Config

Create `justify-disable.config.ts` (or `.js`, `.mjs`, `.cjs`) in the working directory (or any parent, up to the nearest directory containing a `package.json` or `package.yaml`) and default-export an object. Every key is optional.

```ts
import type { IJustifyDisableConfig } from '@ladamczyk/justify-disable';

export default {
  ignorePatterns: ['*.d.ts', 'dist/**'],
  concurrency: 32,
  stats: false,
} satisfies IJustifyDisableConfig;
```

### `tools` and `extensions`

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

### `ignorePatterns`

Matched against the posix path (relative to the working directory) with `path.matchesGlob`. This is not gitignore:

- A pattern with no `/` gets `**/` prepended, so it is matched against the path at any depth: `*.d.ts` matches both `x.d.ts` and `src/x.d.ts`.
- It still has to match the whole path. `dist` matches only a path whose last segment is `dist`, never the files under `dist/`. To ignore a directory, write `dist/**`.

### `concurrency`

Number of files read in parallel, a positive integer, default `64` (`DEFAULT_CONCURRENCY`). The `--concurrency` flag and the `concurrency` option of `lint()` override it.

### `rules`

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

The conditions these rules report are described in [todo conditions](docs/todo-conditions.md).

### `provider`

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

### `stats`

Anonymous usage stats, off until a human says yes. A counted run sends only the tool name `justify-disable`: never your code, file names, paths, config contents, violations or the flags you typed.

| Config state   | Meaning     | Effect                                        |
| -------------- | ----------- | --------------------------------------------- |
| `stats: true`  | allowed     | one count per run                             |
| `stats: false` | denied      | nothing sent, never asked again               |
| no key         | never asked | nothing sent, asked again on the next TTY run |

The CLI asks once, on the first run with a TTY on stdin and stdout, and writes the answer into your config file. It never asks under `CI=true`, in a pipe, with `--json`, or when there is no config file to record the answer in. The API never prompts: `stats` is a required option of `lint()`, and `false` sends nothing.

## API

```ts
import { lint, format } from '@ladamczyk/justify-disable';

const result = await lint({ paths: ['src'], stats: false });

result.passed; // boolean, no violations
result.scanned; // number of files read
result.violations; // Array<{ path, line, column, directive, tool, rule, severity, message }>

process.stdout.write(format(result)); // or format(result, true) for JSON
```

Pass `config` to skip config-file discovery:

```ts
const result = await lint({ config: { ignorePatterns: ['dist/**'] }, stats: false });
```

Additional exports: `loadConfig`, `DEFAULT_CONFIG_FILES`, `DEFAULT_TOOLS`, `DEFAULT_EXTENSIONS`, `DEFAULT_CONCURRENCY`, `DEFAULT_RULES`, `gitProvider`, and the types `IToolDirectives`, `IProvidedFile`, `IProviderContext`, `TFileProvider`, `IJustifyDisableConfig`, `ILintOptions`, `IViolation`, `ILintResult`, `TRuleName`, `TRuleSeverity`.

## Contents

- [justify-disable](docs/index.md)
- [CLI, config file and stats](docs/cli-and-stats.md)
- [Lint flow](docs/lint-flow.md)
- [Todo conditions](docs/todo-conditions.md)
