---
title: JavaScript API
sidebar_position: 6
description: 'lint(), format() and the other exports of the JavaScript API.'
---

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
