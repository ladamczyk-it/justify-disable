import type { ReactNode } from 'react';

import Head from '@docusaurus/Head';
import { HomePage } from '@internal/docusaurus-theme/HomePage';

import { DisableAnimation } from '../components/DisableAnimation';

const TITLE = 'Justify-disable: require a reason for every eslint-disable';

const DESCRIPTION =
  'Fail the build when an eslint-disable or stylelint-disable has no written @todo reason, and expire it on a date or version. A guardrail for AI agents and CI.';

const FEATURES = [
  {
    title: 'Every disable explained',
    description:
      'A @todo reason sits directly above each ESLint and Stylelint directive, so an AI agent or a teammate cannot silence a rule without saying why.',
  },
  {
    title: 'Todos that expire',
    description:
      'Date, version, engine and dependency conditions turn a stale excuse into a failing run.',
  },
  {
    title: 'Built for CI and AI agents',
    description: (
      <>
        Exit code 1 on any violation, JSON output, a JavaScript API, custom directives such as
        @ts-ignore, and an optional check inside <a href="https://qoq.adamczyk.ovh/">qoq</a>.
      </>
    ),
  },
];

const OPENER =
  'A lint disable with no reason is debt nobody can pay back, and AI agents add them fastest. Justify-disable fails the run until every eslint-disable and stylelint-disable carries a written @todo, and can expire that excuse on a date, a version or a dependency.';

const Home = (): ReactNode => (
  <HomePage
    features={FEATURES}
    heading="Justify-disable: explain every disable"
    install="npm install --save-dev @ladamczyk/justify-disable"
    opener={OPENER}
  >
    <Head>
      <title>{TITLE}</title>
      <meta content={DESCRIPTION} name="description" />
      <meta content={TITLE} property="og:title" />
      <meta content={DESCRIPTION} property="og:description" />
    </Head>
    <DisableAnimation />
  </HomePage>
);

export default Home;
