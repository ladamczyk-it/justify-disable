<!-- qoq-scribe sources: src/lint.ts -->

# justify-disable

justify-disable reports lint-suppression directives (`eslint-disable`, `stylelint-disable`, or any you configure) that have no written reason directly above them. Today it is usable as a library through `lint()`; the CLI is planned.

- [Lint flow](lint-flow.md): how `lint()` turns a repo into a list of unjustified directives.
