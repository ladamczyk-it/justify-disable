---
title: 'justify-disable usage statistics and privacy'
sidebar_position: 9
description: 'What justify-disable counts, and only with your consent: where the answer is stored, the one value it sends, what is never sent, and how CI runs behave.'
keywords: [justify-disable privacy, opt-in telemetry, usage statistics, cli telemetry]
---

Justify-disable counts its own runs, and only with your say-so. The first interactive run asks; the answer is stored as `stats: true | false` in your [`justify-disable.config.*`](./configuration.md) (spliced into your own source, so comments and formatting survive) and never asked again — edit or delete the key to change it. The [JavaScript API](./javascript-api.md) never prompts: `stats` is a required boolean on `lint()`, so the calling host states its own user's consent.

![Justify-disable monthly usage — runs per month](https://adamczyk.ovh/img/stats/justify-disable.png)

A counted run posts one constant to `https://stats.adamczyk.ovh`, the same body every time, whether it came from the CLI or the API:

```jsonc
{ "tool": "justify-disable", "options": [] } // `options` is always empty
```

Where an outbound POST never leaves the network, the same run counts as a plain image GET instead — `https://adamczyk.ovh/img/stats/pixel.png?tool=justify-disable` — which carries the same single value and nothing more.

Never sent: your code, file names, paths, config contents, violations, the flags you typed, project or package names, and nothing identifying you or your machine. The send is capped at 2s, so a slow or dead endpoint can't hold a run up. Runs that can't ask — `CI=true`, a pipe, `--json`, or a project with no config file to record the answer in — are never prompted. While no answer is stored they are never counted either; once `stats: true` is stored in the project's config, every CLI run that reads that config counts, CI and `--json` runs included. Set `stats: false` to stop that.
