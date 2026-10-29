<!-- qoq-scribe sources: src/lint.ts src/cli.ts -->

# justify-disable

justify-disable reports lint-suppression directives (`eslint-disable`, `stylelint-disable`, or any you configure) that have no written reason directly above them. It is usable as a library through `lint()` and as a CLI.

- [Lint flow](lint-flow.md): how `lint()` turns a repo into a list of unjustified directives.
- [CLI, config file and stats](cli-and-stats.md): the command, config discovery and the consent flow for run counts.
- [Todo conditions](todo-conditions.md): the bracketed conditions that expire a `@todo`, and the package.json they read.
