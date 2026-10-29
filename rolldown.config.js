import { readFileSync } from 'fs';
import { builtinModules } from 'module';
import { defineConfig } from 'rolldown';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

const sourceDir = './src';
// builtinModules has no `node:` prefixed names, and the sources import `node:*`.
const external = [...builtinModules, /^node:/, ...Object.keys(pkg.dependencies)];

export default defineConfig([
  {
    input: {
      index: `${sourceDir}/index.ts`,
    },
    external,
    output: [
      {
        dir: './lib',
        format: 'esm',
        entryFileNames: '[name].js',
      },
    ],
  },
  {
    input: {
      cli: `${sourceDir}/cli.ts`,
    },
    external,
    output: [
      {
        dir: './bin',
        entryFileNames: '[name].js',
        minify: true,
      },
    ],
  },
]);
