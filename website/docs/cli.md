---
title: Command line
sidebar_position: 3
description: 'The justify-disable command, its options and exit codes.'
---

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
