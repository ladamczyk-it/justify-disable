import type { ReactNode } from 'react';

import { HomePage } from '@internal/docusaurus-theme/HomePage';

import { DisableAnimation } from '../components/DisableAnimation';

const FEATURES = [
  {
    title: 'Every disable explained',
    description: 'A @todo reason sits directly above each ESLint and Stylelint directive.',
  },
  {
    title: 'Todos that expire',
    description:
      'Date, version, engine and dependency conditions turn a stale excuse into a failing run.',
  },
  {
    title: 'Fits your toolchain',
    description:
      'Git-tracked files across JS, TS, CSS, Vue and Svelte, custom directives such as @ts-ignore, JSON output and a JavaScript API.',
  },
];

const OPENER =
  'A lint disable with no reason is debt nobody can pay back. Justify-disable fails the run until every eslint-disable and stylelint-disable carries a written @todo, and can expire that excuse on a date, a version or a dependency.';

const Home = (): ReactNode => (
  <HomePage
    features={FEATURES}
    install="npm install --save-dev @ladamczyk/justify-disable"
    opener={OPENER}
  >
    <DisableAnimation />
  </HomePage>
);

export default Home;
