<!-- qoq-scribe sources: src/lint.ts src/resolve.ts src/provider.ts src/scan.ts src/defaults.ts src/types.ts src/config.ts src/todo.ts src/package.ts -->

# Lint flow

## Overview

> Source: documented from plan

`lint()` runs four stages: resolve the config, ask a file provider which files exist, select the files that have a tool mapped, then read and scan them with a bounded worker pool. Violations are sorted by path, line, column. `passed` is true when no violation has `error` severity; warnings are reported but do not fail the run. `scanned` counts files actually read; a file listed but deleted from the worktree (ENOENT) is skipped and not counted, any other read error propagates.

## File listing

> Source: documented from plan

The default provider asks git (`ls-files --cached --others --exclude-standard`), so gitignored files are never seen. It uses `execFile` with an argv array rather than a shell, so user paths are never expanded, and `-z` because git otherwise quotes non-ASCII names. Failures are mapped to plain `Error`s; "not a git repository" is detected from stderr because exit code 128 is shared with out-of-tree paths. A config `provider` replaces git entirely and may name the tools for each file, which bypasses the extension map.

## Config resolution and selection

> Source: documented from plan

User tools merge by key over the defaults, and extension entries replace per key. Regexes are cloned, never mutated: `directive` gains `g`, `reason` loses `g`/`y`. A default `reason` is deliberately left identical so the scanner can pick the "@todo" wording of the message by identity. Ignore patterns without `/` match at any depth. `rules` merge by key over `DEFAULT_RULES`; a finding whose rule is set to `off` is dropped when it becomes a violation (`toViolation`), so `off` never stops other checks on the same directive. An unknown tool name, an unknown rule name, a severity other than `error`/`warn`/`off`, a non-positive-integer concurrency, or an absolute provider path throws.

## Scanning a file

> Source: documented from plan

A directive counts as justified only if the comment that ends on the line directly above it matches the tool's `reason`. A conditions-only `@todo [..]` is not a reason; prose must follow the condition list. The default `reason` regexes let the bracket body span lines (stopping at the next `@todo`) so a multi-line list still counts as a reason and the condition parser, not `missingReason`, reports it. Only that one line is examined, so with stacked comments the nearest decides, and a same-line `-- reason` never counts. Stylelint's default reason must sit in a block comment. Accepted limits: directives inside strings match, delimiters inside strings on the line above can misread the comment, and overlapping tool regexes report twice.

## Conditions and the package.json lookup

> Source: inferred from code

Once the comment above passes the `reason` test, its `@todo [..]` conditions are parsed and evaluated (see [Todo conditions](todo-conditions.md)); a directive that fails the reason test reports only `missingReason` and its conditions are not looked at. `lint()` creates one package.json lookup per run and hands each file a thunk, so a package.json is read only when a condition of that file needs one (date conditions never do). A `[` after `@todo` that has no `]` on that line yields one `invalidCondition` ("condition list must fit on one line"), and a range matching every version, including `>=0.0.0`, is invalid. `missingDate` fires only when the comment contains `@todo`, so a custom `reason` without `@todo` never triggers it. The lookup walks up from the file's directory and caches per directory, so concurrent workers share reads. Unparsable JSON throws and fails the whole run.

## Concurrency

> Source: documented from plan

Reading dominates cost (measured about six times the matching cost), so files are read through a small pool of `concurrency` workers (default 64) rather than serially or all at once.

## Config loading and stats

> Source: documented from plan

`options.config` skips file discovery; otherwise `loadConfig()` supplies it (see [CLI, config file and stats](cli-and-stats.md)). `lint()` sends a run count only when the caller passes `stats: true`, and never prompts.
