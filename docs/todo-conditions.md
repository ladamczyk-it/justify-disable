# Todo conditions

justify-disable's `@todo` conditions are heavily inspired by unicorn's [`expiring-todo-comments`](https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/expiring-todo-comments.md) rule. A bracket right after `@todo` says when the reason stops counting: a date, the project's own version, an engine or dependency range, or a dependency being added or removed. When a condition is met, the directive is reported as expired.

## Syntax

```ts
/**
 * @todo [2030-01-01, react@^19] Legacy API returns `any`; type it once the SDK is upgraded.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const response: any = await legacyCall();
```

- The bracket follows the first `@todo` in the comment, with spaces or tabs allowed between them. It must fit on one line.
- Tokens are separated by commas and trimmed.
- Prose must still follow the bracket. `@todo [2030-01-01]` on its own has no reason and is reported as `missingReason`.

## Condition kinds

| Token              | Kind       | Met (expired) when                                                   |
| ------------------ | ---------- | -------------------------------------------------------------------- |
| `2030-01-01`       | date       | today (UTC) is after that date                                       |
| `<2.0.0`           | version    | the package's own `version` satisfies the range                      |
| `engine:node@>=20` | engine     | the lowest version `engines.node` allows satisfies the range         |
| `+left-pad`        | added      | `left-pad` is in `dependencies` or `devDependencies`                 |
| `-left-pad`        | removed    | `left-pad` is in neither                                             |
| `react@^19`        | dependency | the lowest version the declared `react` range allows satisfies `^19` |

- A version token is any semver range. An engine can be any name in `engines`, e.g. `engine:npm@>=10`.
- A dependency is looked up in `dependencies`, then `devDependencies`.
- "Lowest version" is the lowest version a declared range allows: `^18.2.0` counts as `18.2.0`, and `^22.22.2 || ^24.15.0` as `22.22.2`.
- Ranges are checked with prereleases included.
- A date on the day itself is still unmet. A bracket holds at most one date and at most one own-version range; repeats are invalid.

## Invalid conditions

A condition that cannot be checked is reported as `invalidCondition`, with the reason after the colon:

```text
src/app.ts:12:1  eslint-disable-next-line has an invalid @todo condition [react@^19]: react is not declared in package.json
```

| Case                                                                                                       | Detail                                                    |
| ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| an empty token, such as `[2030-01-01,]`                                                                    | `empty condition`                                         |
| a date that is not a real calendar day, such as `2030-02-30`                                               | `not a real calendar date`                                |
| a second date in one bracket                                                                               | `only one date condition is allowed`                      |
| a second own-version range in one bracket                                                                  | `only one version condition is allowed`                   |
| a range that matches every version, such as `*` or `x`                                                     | `"<range>" matches every version`                         |
| a token that is not a semver range                                                                         | `"<token>" is not a valid semver range`                   |
| a dependency that is not declared                                                                          | `<name> is not declared in package.json`                  |
| a declared dependency range semver cannot read, such as `workspace:*`, `file:`, git URLs or `npm:` aliases | `<name> range "<declared>" is not a semver range`         |
| an engine that is not declared                                                                             | `no engines.<name> in package.json`                       |
| a declared engine range semver cannot read                                                                 | `engines.<name> range "<declared>" is not a semver range` |
| an own version that is missing or not valid semver                                                         | `no version in package.json`                              |
| a condition that needs package.json when none is found                                                     | `no package.json found (needed for the <kind> condition)` |

`<kind>` is one of `version`, `engine`, `added`, `removed` or `dependency`. Date conditions never need package.json.

## Missing date

`missingDate` is off by default. It reports a `@todo` with no date condition. A date that fails the calendar check does not count, so `2030-02-30` raises `invalidCondition` and, with `missingDate` on, `missingDate` as well.

## The package.json lookup

The version, engine, added, removed and dependency kinds read a package.json:

- The nearest `package.json` is used. The lookup walks up from the directory of the file holding the directive, to the filesystem root, and reads the first one it finds.
- The walk can leave the project. A file in a directory with no `package.json` reads the nearest ancestor's, which may sit outside the project.
- Each directory is read at most once per run, and only when a condition needs it.
- Unparsable JSON, or a top level that is not an object, fails the run with `invalid package.json: <absolute path>` and exit `2`. It fails only when a condition reaches that file. Exit codes are described in [CLI, config file and stats](cli-and-stats.md).

A project at version `0.0.0`, the placeholder semantic-release projects keep, compares its own-version conditions against `0.0.0`. `>=1.0.0` is never met there. A range that includes `0.0.0`, such as `<1.0.0`, is met from the start.

## Rules

Four rules report condition findings. Severities are set under `rules` in the config; see [rules](../README.md#rules).

| Rule               | Default | Reported when                           |
| ------------------ | ------- | --------------------------------------- |
| `missingReason`    | `error` | no `@todo <reason>` above the directive |
| `expired`          | `error` | a condition is met                      |
| `invalidCondition` | `error` | a condition is invalid                  |
| `missingDate`      | `off`   | no date condition                       |

A directive with no reason reports only `missingReason`, whatever its severity, even `off`, and its conditions are not checked. Otherwise each condition reports `expired` or `invalidCondition` in bracket order, followed by `missingDate` when no date condition parsed.

```text
src/app.ts:12:1  eslint-disable-next-line has an expired @todo condition [2030-01-01]
src/app.ts:12:1  eslint-disable-next-line has a @todo without a date condition
```
