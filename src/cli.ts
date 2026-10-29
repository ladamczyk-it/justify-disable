#!/usr/bin/env node

import { run } from './index.ts';

const { stdout, code } = run(process.argv.slice(2));

process.stdout.write(stdout, () => process.exit(code));
