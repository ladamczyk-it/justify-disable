---
title: 'CLI options and exit codes'
sidebar_label: 'Command line'
sidebar_position: 3
description: 'Every command-line option, from --json to --concurrency, the pathspecs it accepts and what exit codes 0, 1 and 2 mean in CI.'
keywords: [justify-disable cli, eslint-disable check, exit codes, json output, ci]
---

The `justify-disable` command scans the git-tracked files of the current repository, or only the pathspecs you pass, and fails when a lint disable directive has no `@todo` reason above it.

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

| Exit code | Meaning                                                  |
| --------- | -------------------------------------------------------- |
| `0`       | No `error`-severity violations (warnings may be printed) |
| `1`       | At least one `error`-severity violation                  |
| `2`       | Any error (bad config, not a git repository, …)          |
