#!/usr/bin/env node

import { EExitCode } from '@ladamczyk/qoq-utils';
import cac from 'cac';
import c from 'picocolors';

import { format } from './format.ts';
import { lint } from './lint.ts';
import { resolveConsent, sendStats } from './stats.ts';

interface ICliOptions {
  json?: boolean;
  concurrency?: number | string;
}

const cli = cac('justify-disable');

cli
  .command('[...paths]', 'Fail on disable directives without a @todo reason above them')
  .option('--json', 'Output machine-readable JSON')
  .option('--concurrency <n>', 'Files read in parallel (default 64)')
  // The CLI is the one caller that can ask, so it is the one that answers.
  // Unanswered collapses to `false` only here, at the call: consent is still
  // absent from the config file, so the next interactive run asks again.
  .action(async (paths: string[], options: ICliOptions) => {
    try {
      // `--json` suppresses the prompt so it can't land in the JSON on stdout.
      // Sent from here rather than through `lint()`, and awaited: `process.exit`
      // below would kill the fire-and-forget request a library call can afford.
      if ((await resolveConsent(!options.json)) ?? false) {
        await sendStats();
      }

      const result = await lint({
        paths,
        ...(options.concurrency === undefined ? {} : { concurrency: Number(options.concurrency) }),
        ...(options.json === undefined ? {} : { json: options.json }),
        stats: false,
      });

      process.stdout.write(format(result, options.json ?? false));
      process.exit(result.passed ? EExitCode.OK : EExitCode.ERROR);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (options.json) {
        process.stdout.write(`${JSON.stringify({ passed: false, error: message }, null, 2)}\n`);
      } else {
        const line = c.red(`✖ ${message}`);

        process.stderr.write(`${line}\n`);
      }

      process.exit(EExitCode.EXCEPTION);
    }
  });

cli.help();

cli.parse();
