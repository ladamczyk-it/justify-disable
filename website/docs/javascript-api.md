---
title: 'JavaScript API: lint() and format()'
sidebar_label: 'JavaScript API'
sidebar_position: 6
description: 'Run the check from Node: lint() options and result, format() for text or JSON, custom file providers, and the default tools, rules and extensions.'
keywords: [justify-disable api, lint api, eslint-disable checker node, file provider, typescript]
---

The JavaScript API runs the same check as the CLI from Node and returns the result as an object, so tools can call it in-process instead of starting `justify-disable --json`.

```ts
import { lint, format } from '@ladamczyk/justify-disable';

const result = await lint({ paths: ['src'], stats: false });

result.passed; // boolean, false only when a violation has error severity
result.scanned; // number of files read
result.violations; // Array<{ path, line, column, directive, tool, rule, severity, message }>

process.stdout.write(format(result)); // or format(result, true) for JSON
```

Pass `config` to skip config-file discovery:

```ts
const result = await lint({ config: { ignorePatterns: ['dist/**'] }, stats: false });
```

Additional exports: `loadConfig`, `DEFAULT_CONFIG_FILES`, `DEFAULT_TOOLS`, `DEFAULT_EXTENSIONS`, `DEFAULT_CONCURRENCY`, `DEFAULT_RULES`, `gitProvider`, and the types `IToolDirectives`, `IProvidedFile`, `IProviderContext`, `TFileProvider`, `IJustifyDisableConfig`, `ILintOptions`, `IViolation`, `ILintResult`, `TRuleName`, `TRuleSeverity`.
